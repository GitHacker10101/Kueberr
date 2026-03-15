from __future__ import annotations

import asyncio
import json
from collections import deque
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from .cache import cache_client
from .config import settings
from .db import OptimizerRun, PaperFill, RiskSnapshot, init_db, session_scope
from .market_data import POPULAR_SYMBOLS, fetch_daily_bars
from .optimizer_engine import suggest_rebalance
from .paper_oms import cancel_paper_order, create_paper_order, latest_order_events, list_paper_fills, list_paper_orders
from .portfolio_engine import get_positions, record_transaction
from .risk_engine import build_risk_snapshot
from .schemas import (
    BacktestRequest,
    ExplainRequest,
    PaperOrderRequest,
    PortfolioTransactionRequest,
    PredictRequest,
    RebalanceRequest,
    StressRunRequest,
    TrainRequest,
)
from .service import quant_engine
from .stress_engine import run_stress_scenarios


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=(
        "Revolutionary AI-driven stock intelligence engine. "
        "Forecasts are probabilistic and must not be interpreted as guaranteed returns."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

recent_symbols = deque(maxlen=40)
favorite_symbols: set[str] = set()


async def _scheduled_retrain_loop() -> None:
    if not settings.enable_scheduled_retrain:
        return

    # Give startup endpoints time to become healthy before background retraining starts.
    await asyncio.sleep(20)

    while True:
        try:
            for horizon in ("daily", "weekly", "monthly"):
                await quant_engine.train(
                    TrainRequest(
                        symbols=POPULAR_SYMBOLS[:8],
                        horizon=horizon,
                        lookback_days=settings.default_lookback_days,
                        sequence_length=30,
                    )
                )
        except Exception:
            pass

        await asyncio.sleep(max(5, settings.retrain_interval_minutes) * 60)


@app.on_event("startup")
async def startup() -> None:
    await cache_client.connect()
    await init_db()
    asyncio.create_task(_scheduled_retrain_loop())


@app.on_event("shutdown")
async def shutdown() -> None:
    await cache_client.close()


@app.get("/api/v1/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "time": datetime.now(tz=timezone.utc).isoformat(),
        "disclaimer": "All outputs are probabilistic forecasts with no guaranteed returns.",
    }


@app.get("/api/v1/search")
async def smart_search(
    q: str = Query(default="", min_length=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    query = q.strip().upper()
    universe = list(dict.fromkeys([*POPULAR_SYMBOLS, *list(recent_symbols), *list(favorite_symbols)]))
    if query:
        universe = [symbol for symbol in universe if query in symbol]
    return {
        "query": q,
        "results": universe[:limit],
        "popular": POPULAR_SYMBOLS[:8],
        "recently_viewed": list(recent_symbols)[-10:],
        "favorites": sorted(favorite_symbols),
    }


@app.post("/api/v1/favorites/{symbol}")
async def set_favorite(symbol: str) -> dict[str, Any]:
    favorite_symbols.add(symbol.strip().upper())
    return {"favorites": sorted(favorite_symbols)}


@app.delete("/api/v1/favorites/{symbol}")
async def remove_favorite(symbol: str) -> dict[str, Any]:
    favorite_symbols.discard(symbol.strip().upper())
    return {"favorites": sorted(favorite_symbols)}


@app.post("/api/v1/train")
async def train_models(request: TrainRequest) -> dict[str, Any]:
    try:
        return await quant_engine.train(request)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/predict")
async def predict(request: PredictRequest) -> dict[str, Any]:
    try:
        result = await quant_engine.predict(request)
        recent_symbols.append(result.symbol)
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/explain")
async def explain(request: ExplainRequest) -> dict[str, Any]:
    try:
        recent_symbols.append(request.symbol.strip().upper())
        return await quant_engine.explain(request)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/backtest")
async def backtest(request: BacktestRequest) -> dict[str, Any]:
    try:
        return await quant_engine.backtest(request)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/training/runs")
async def training_runs(limit: int = Query(default=20, ge=1, le=100)) -> dict[str, Any]:
    runs = await quant_engine.latest_training_runs(limit=limit)
    return {"items": runs}


@app.get("/api/v1/correlation")
async def correlation_matrix(
    symbols: str = Query(default="AAPL,MSFT,NVDA,AMZN,TSLA"),
    lookback_days: int = Query(default=365, ge=90, le=3000),
) -> dict[str, Any]:
    requested = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if len(requested) < 2:
        raise HTTPException(status_code=422, detail="At least two symbols are required")

    series: dict[str, pd.Series] = {}
    for symbol in requested[:25]:
        try:
            bars = await fetch_daily_bars(symbol, lookback_days)
        except Exception:
            continue
        returns = bars.frame["close"].pct_change().dropna().reset_index(drop=True)
        series[symbol] = returns

    if len(series) < 2:
        raise HTTPException(status_code=422, detail="Could not fetch enough symbols for correlation matrix")

    aligned = pd.DataFrame(series).dropna()
    corr = aligned.corr()
    payload = []
    for row_symbol in corr.index:
        payload.append(
            {
                "symbol": row_symbol,
                "values": {col: round(float(corr.loc[row_symbol, col]), 4) for col in corr.columns},
            }
        )

    return {
        "symbols": list(corr.columns),
        "matrix": payload,
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }


@app.post("/api/v1/portfolio/risk")
async def portfolio_risk(
    holdings: dict[str, float],
    lookback_days: int = Query(default=365, ge=90, le=3000),
) -> dict[str, Any]:
    if not holdings:
        raise HTTPException(status_code=422, detail="Portfolio holdings are required")

    symbols = [symbol.strip().upper() for symbol in holdings.keys() if symbol.strip()]
    weights = np.array([float(holdings[symbol]) for symbol in holdings.keys()], dtype=np.float64)
    if len(symbols) != len(weights):
        raise HTTPException(status_code=422, detail="Invalid holdings payload")
    if np.sum(np.abs(weights)) <= 0:
        raise HTTPException(status_code=422, detail="Portfolio weights must be non-zero")

    weights = weights / np.sum(np.abs(weights))

    returns_table: dict[str, pd.Series] = {}
    for symbol in symbols[:25]:
        try:
            bars = await fetch_daily_bars(symbol, lookback_days)
        except Exception:
            continue
        returns_table[symbol] = bars.frame["close"].pct_change().dropna().reset_index(drop=True)

    if len(returns_table) < 2:
        raise HTTPException(status_code=422, detail="Need at least two valid symbols for risk computation")

    aligned = pd.DataFrame(returns_table).dropna()
    mu = aligned.mean().to_numpy()
    cov = aligned.cov().to_numpy()
    w = weights[: len(mu)]

    exp_return = float(np.dot(w, mu) * 252)
    volatility = float(np.sqrt(np.dot(w.T, np.dot(cov * 252, w))))
    sharpe = float(exp_return / volatility) if volatility > 1e-9 else 0.0
    var_95 = float(np.percentile(np.dot(aligned.to_numpy(), w), 5))

    return {
        "expected_annual_return": round(exp_return, 6),
        "annual_volatility": round(volatility, 6),
        "sharpe_proxy": round(sharpe, 6),
        "daily_var_95": round(var_95, 6),
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }


@app.post("/api/v1/retrain/trigger")
async def trigger_retrain(background_tasks: BackgroundTasks) -> dict[str, Any]:
    background_tasks.add_task(
        quant_engine.train,
        TrainRequest(symbols=POPULAR_SYMBOLS[:8], horizon="monthly"),
    )
    return {"status": "queued"}


@app.post("/api/v1/portfolio/transactions")
async def create_portfolio_transaction(request: PortfolioTransactionRequest) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await record_transaction(
                session,
                user_id=request.user_id,
                symbol=request.symbol,
                side=request.side,
                quantity=request.quantity,
                price=request.price,
                timestamp=request.timestamp,
                fees=request.fees,
                source="manual",
            )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/portfolio/positions")
async def portfolio_positions(user_id: str = Query(default="user-1", min_length=1)) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await get_positions(session, user_id)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/risk/snapshot")
async def risk_snapshot(
    user_id: str = Query(default="user-1", min_length=1),
    lookback_days: int = Query(default=365, ge=120, le=3000),
) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await build_risk_snapshot(session, user_id=user_id, lookback_days=lookback_days)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/stress/run")
async def run_stress(request: StressRunRequest) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            scenarios = [scenario.model_dump() for scenario in request.scenarios]
            return await run_stress_scenarios(session, user_id=request.user_id, scenarios=scenarios)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/optimizer/rebalance")
async def optimizer_rebalance(request: RebalanceRequest) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await suggest_rebalance(
                session,
                user_id=request.user_id,
                constraints=request.constraints.model_dump(),
            )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/paper/orders")
async def paper_orders_create(request: PaperOrderRequest) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await create_paper_order(session, request.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/paper/orders")
async def paper_orders_list(
    user_id: str = Query(default="user-1", min_length=1),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=250),
    offset: int = Query(default=0, ge=0, le=5000),
) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await list_paper_orders(session, user_id=user_id, status=status, limit=limit, offset=offset)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/paper/orders/{order_id}/cancel")
async def paper_orders_cancel(order_id: str, user_id: str = Query(default="user-1", min_length=1)) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await cancel_paper_order(session, user_id=user_id, order_id=order_id)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/paper/fills")
async def paper_fills(
    user_id: str = Query(default="user-1", min_length=1),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=5000),
) -> dict[str, Any]:
    try:
        async with session_scope() as session:
            return await list_paper_fills(session, user_id=user_id, limit=limit, offset=offset)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


async def _command_stream_generator(user_id: str):
    last_order_event_id = 0
    last_risk_id = 0
    last_optimizer_id = 0
    last_fill_id = ""

    while True:
        async with session_scope() as session:
            events = await latest_order_events(session, user_id=user_id, since_id=last_order_event_id, limit=120)
            for event in events:
                last_order_event_id = max(last_order_event_id, int(event["id"]))
                yield f"event: order_status_changed\ndata: {json.dumps(event)}\n\n"

            risk_row = (
                (
                    await session.execute(
                        select(RiskSnapshot)
                        .where(RiskSnapshot.user_id == user_id)
                        .order_by(RiskSnapshot.id.desc())
                        .limit(1)
                    )
                )
                .scalars()
                .first()
            )
            if risk_row and risk_row.id > last_risk_id:
                last_risk_id = int(risk_row.id)
                yield f"event: risk_snapshot_updated\ndata: {json.dumps(risk_row.payload)}\n\n"

            optimizer_row = (
                (
                    await session.execute(
                        select(OptimizerRun)
                        .where(OptimizerRun.user_id == user_id)
                        .order_by(OptimizerRun.id.desc())
                        .limit(1)
                    )
                )
                .scalars()
                .first()
            )
            if optimizer_row and optimizer_row.id > last_optimizer_id:
                last_optimizer_id = int(optimizer_row.id)
                yield f"event: optimizer_completed\ndata: {json.dumps(optimizer_row.result)}\n\n"

            fill_row = (
                (
                    await session.execute(
                        select(PaperFill)
                        .where(PaperFill.user_id == user_id)
                        .order_by(PaperFill.created_at.desc())
                        .limit(1)
                    )
                )
                .scalars()
                .first()
            )
            if fill_row and fill_row.id != last_fill_id:
                last_fill_id = fill_row.id
                payload = {
                    "id": fill_row.id,
                    "order_id": fill_row.order_id,
                    "symbol": fill_row.symbol,
                    "side": fill_row.side,
                    "quantity": float(fill_row.quantity),
                    "price": float(fill_row.price),
                    "fee": float(fill_row.fee),
                    "slippage_bps": float(fill_row.slippage_bps),
                    "created_at": fill_row.created_at.isoformat(),
                }
                yield f"event: fill_created\ndata: {json.dumps(payload)}\n\n"

            heartbeat = {"user_id": user_id, "time": datetime.now(tz=timezone.utc).isoformat()}
            yield f"event: heartbeat\ndata: {json.dumps(heartbeat)}\n\n"

        await asyncio.sleep(2.0)


@app.get("/api/v1/command/stream")
async def command_stream(user_id: str = Query(default="user-1", min_length=1)) -> StreamingResponse:
    return StreamingResponse(
        _command_stream_generator(user_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
