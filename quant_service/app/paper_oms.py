from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import OrderEvent, PaperFill, PaperOrder
from .market_data import fetch_daily_bars
from .portfolio_engine import get_positions, record_transaction


OPEN_STATUSES = {"NEW", "ACCEPTED", "PARTIALLY_FILLED"}
FINAL_STATUSES = {"FILLED", "CANCELED", "REJECTED", "EXPIRED"}


def _now() -> datetime:
    return datetime.utcnow()


def _to_utc(value: datetime | None) -> datetime:
    if value is None:
        return _now()
    if value.tzinfo is None:
        return value
    return value.astimezone().replace(tzinfo=None)


async def _append_event(
    session: AsyncSession,
    *,
    order_id: str,
    user_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    session.add(
        OrderEvent(
            order_id=order_id,
            user_id=user_id,
            event_type=event_type,
            payload=payload,
        )
    )


def _serialize_order(order: PaperOrder) -> dict[str, Any]:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "symbol": order.symbol,
        "side": order.side,
        "type": order.type,
        "quantity": float(order.quantity),
        "limit_price": float(order.limit_price) if order.limit_price is not None else None,
        "stop_price": float(order.stop_price) if order.stop_price is not None else None,
        "time_in_force": order.time_in_force,
        "status": order.status,
        "filled_quantity": float(order.filled_quantity),
        "avg_fill_price": float(order.avg_fill_price),
        "reason": order.reason,
        "idempotency_key": order.idempotency_key,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }


def _serialize_fill(fill: PaperFill) -> dict[str, Any]:
    return {
        "id": fill.id,
        "order_id": fill.order_id,
        "user_id": fill.user_id,
        "symbol": fill.symbol,
        "side": fill.side,
        "quantity": float(fill.quantity),
        "price": float(fill.price),
        "fee": float(fill.fee),
        "slippage_bps": float(fill.slippage_bps),
        "created_at": fill.created_at.isoformat(),
    }


async def _quote(symbol: str) -> tuple[float, float]:
    bars = await fetch_daily_bars(symbol, 120)
    if bars.frame.empty:
        raise ValueError(f"No market data for {symbol}")
    last_close = float(bars.frame["close"].iloc[-1])
    avg_volume = float(bars.frame["volume"].tail(20).mean()) if "volume" in bars.frame else 0.0
    return last_close, avg_volume


def _should_trigger(order: PaperOrder, market_price: float) -> bool:
    if order.type == "market":
        return True

    if order.type == "limit":
        if order.limit_price is None:
            return False
        return (order.side == "BUY" and market_price <= order.limit_price) or (
            order.side == "SELL" and market_price >= order.limit_price
        )

    if order.type == "stop":
        if order.stop_price is None:
            return False
        return (order.side == "BUY" and market_price >= order.stop_price) or (
            order.side == "SELL" and market_price <= order.stop_price
        )

    if order.type == "stop_limit":
        if order.stop_price is None or order.limit_price is None:
            return False
        stop_hit = (order.side == "BUY" and market_price >= order.stop_price) or (
            order.side == "SELL" and market_price <= order.stop_price
        )
        limit_ok = (order.side == "BUY" and market_price <= order.limit_price) or (
            order.side == "SELL" and market_price >= order.limit_price
        )
        return stop_hit and limit_ok

    return False


def _fill_ratio(order: PaperOrder, avg_volume: float) -> float:
    remaining = max(0.0, float(order.quantity) - float(order.filled_quantity))
    if remaining <= 1e-9:
        return 0.0

    if order.type == "market":
        cap = max(0.35, min(1.0, 1500.0 / max(remaining, 1.0)))
    else:
        cap = max(0.1, min(1.0, 800.0 / max(remaining, 1.0)))

    if avg_volume > 1e-9:
        liquidity_factor = min(1.0, max(0.1, avg_volume / max(remaining * 2000, 1.0)))
    else:
        liquidity_factor = 0.45

    return float(max(0.0, min(1.0, cap * liquidity_factor)))


async def _apply_fill(session: AsyncSession, order: PaperOrder, market_price: float, avg_volume: float) -> dict[str, Any] | None:
    if not _should_trigger(order, market_price):
        return None

    ratio = _fill_ratio(order, avg_volume)
    if ratio <= 1e-8:
        return None

    remaining = max(0.0, float(order.quantity) - float(order.filled_quantity))
    fill_qty = max(0.0, min(remaining, remaining * ratio))
    if fill_qty <= 1e-8:
        return None

    rng = random.Random(f"{order.id}:{order.filled_quantity}:{market_price:.5f}")
    slippage_bps = 4.0 + rng.random() * 10.0
    side_multiplier = 1 if order.side == "BUY" else -1
    exec_price = market_price * (1 + side_multiplier * slippage_bps / 10_000)
    fee = abs(exec_price * fill_qty) * 0.0005

    fill = PaperFill(
        id=f"fill_{uuid4().hex}",
        order_id=order.id,
        user_id=order.user_id,
        symbol=order.symbol,
        side=order.side,
        quantity=fill_qty,
        price=exec_price,
        fee=fee,
        slippage_bps=slippage_bps,
    )
    session.add(fill)
    await session.flush()

    prev_filled = float(order.filled_quantity)
    total_filled = prev_filled + fill_qty
    if total_filled <= 1e-9:
        avg_fill = 0.0
    else:
        avg_fill = ((float(order.avg_fill_price) * prev_filled) + (exec_price * fill_qty)) / total_filled

    order.filled_quantity = total_filled
    order.avg_fill_price = avg_fill
    order.updated_at = _now()
    if total_filled >= float(order.quantity) - 1e-8:
        order.status = "FILLED"
        event_type = "filled"
    else:
        order.status = "PARTIALLY_FILLED"
        event_type = "partially_filled"

    await _append_event(
        session,
        order_id=order.id,
        user_id=order.user_id,
        event_type=event_type,
        payload={
            "fill_id": fill.id,
            "filled_quantity": round(fill_qty, 6),
            "fill_price": round(exec_price, 6),
            "status": order.status,
        },
    )

    await record_transaction(
        session,
        user_id=order.user_id,
        symbol=order.symbol,
        side=order.side,
        quantity=fill_qty,
        price=exec_price,
        fees=fee,
        source="paper_fill",
        order_id=order.id,
    )

    return _serialize_fill(fill)


async def _refresh_open_orders(session: AsyncSession, user_id: str) -> None:
    open_orders = (
        (
            await session.execute(
                select(PaperOrder).where(
                    and_(PaperOrder.user_id == user_id, PaperOrder.status.in_(list(OPEN_STATUSES)))
                )
            )
        )
        .scalars()
        .all()
    )
    now = _now()

    for order in open_orders:
        if order.time_in_force == "DAY" and order.created_at < now - timedelta(days=1):
            order.status = "EXPIRED"
            order.reason = "Time in force expired"
            order.updated_at = now
            await _append_event(
                session,
                order_id=order.id,
                user_id=order.user_id,
                event_type="expired",
                payload={"reason": order.reason},
            )
            continue

        try:
            market_price, avg_volume = await _quote(order.symbol)
        except Exception:
            continue
        await _apply_fill(session, order, market_price, avg_volume)


async def create_paper_order(session: AsyncSession, payload: dict[str, Any]) -> dict[str, Any]:
    user_id = str(payload.get("user_id", "user-1")).strip()
    symbol = str(payload.get("symbol", "")).strip().upper()
    side = str(payload.get("side", "")).strip().upper()
    order_type = str(payload.get("type", "market")).strip().lower()
    quantity = float(payload.get("quantity", 0))
    limit_price = payload.get("limit_price")
    stop_price = payload.get("stop_price")
    tif = str(payload.get("time_in_force", "DAY")).strip().upper()
    idempotency_key = payload.get("idempotency_key")
    if isinstance(idempotency_key, str):
        idempotency_key = idempotency_key.strip()
        if not idempotency_key:
            idempotency_key = None
    else:
        idempotency_key = None

    if not symbol:
        raise ValueError("symbol is required")
    if side not in {"BUY", "SELL"}:
        raise ValueError("side must be BUY or SELL")
    if order_type not in {"market", "limit", "stop", "stop_limit"}:
        raise ValueError("type must be market|limit|stop|stop_limit")
    if quantity <= 0:
        raise ValueError("quantity must be positive")

    if idempotency_key:
        existing = (
            (
                await session.execute(
                    select(PaperOrder).where(
                        and_(PaperOrder.user_id == user_id, PaperOrder.idempotency_key == idempotency_key)
                    )
                )
            )
            .scalars()
            .first()
        )
        if existing:
            return {"order": _serialize_order(existing), "fills": [], "idempotent_replay": True}

    if side == "SELL":
        positions = await get_positions(session, user_id)
        available = 0.0
        for row in positions["positions"]:
            if row["symbol"] == symbol:
                available = float(row["quantity"])
                break
        if available + 1e-9 < quantity:
            raise ValueError(f"insufficient quantity for SELL order: available={available:.6f}")

    order = PaperOrder(
        id=f"ord_{uuid4().hex}",
        user_id=user_id,
        symbol=symbol,
        side=side,
        type=order_type,
        quantity=quantity,
        limit_price=float(limit_price) if limit_price is not None else None,
        stop_price=float(stop_price) if stop_price is not None else None,
        time_in_force=tif,
        status="NEW",
        filled_quantity=0.0,
        avg_fill_price=0.0,
        idempotency_key=idempotency_key,
        created_at=_to_utc(payload.get("timestamp")),
        updated_at=_now(),
    )
    session.add(order)
    await session.flush()

    await _append_event(
        session,
        order_id=order.id,
        user_id=order.user_id,
        event_type="created",
        payload={"status": order.status},
    )

    order.status = "ACCEPTED"
    order.updated_at = _now()
    await _append_event(
        session,
        order_id=order.id,
        user_id=order.user_id,
        event_type="accepted",
        payload={"status": order.status},
    )

    fills: list[dict[str, Any]] = []
    try:
        market_price, avg_volume = await _quote(symbol)
        fill = await _apply_fill(session, order, market_price, avg_volume)
        if fill:
            fills.append(fill)
    except Exception:
        pass

    return {
        "order": _serialize_order(order),
        "fills": fills,
        "idempotent_replay": False,
    }


async def list_paper_orders(
    session: AsyncSession,
    user_id: str,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    await _refresh_open_orders(session, user_id)

    query = select(PaperOrder).where(PaperOrder.user_id == user_id).order_by(PaperOrder.created_at.desc())
    if status:
        query = query.where(PaperOrder.status == status.upper())
    rows = ((await session.execute(query.offset(max(0, offset)).limit(max(1, min(250, limit))))).scalars().all())

    orders = [_serialize_order(row) for row in rows]
    open_count = sum(1 for row in orders if row["status"] in OPEN_STATUSES)
    final_count = sum(1 for row in orders if row["status"] in FINAL_STATUSES)
    fill_rate = (
        sum(row["filled_quantity"] for row in orders) / sum(max(row["quantity"], 1e-9) for row in orders)
        if orders
        else 0.0
    )

    return {
        "user_id": user_id,
        "items": orders,
        "summary": {
            "count": len(orders),
            "open_count": open_count,
            "final_count": final_count,
            "fill_rate": round(fill_rate, 6),
        },
        "generated_at": _now().isoformat(),
    }


async def cancel_paper_order(session: AsyncSession, user_id: str, order_id: str) -> dict[str, Any]:
    row = (
        (
            await session.execute(
                select(PaperOrder).where(and_(PaperOrder.user_id == user_id, PaperOrder.id == order_id))
            )
        )
        .scalars()
        .first()
    )
    if row is None:
        raise ValueError("order not found")
    if row.status in FINAL_STATUSES:
        return {
            "order": _serialize_order(row),
            "cancel_result": {"status": "noop", "reason": f"order already {row.status.lower()}"},
        }

    row.status = "CANCELED"
    row.reason = "Canceled by user request"
    row.updated_at = _now()
    await _append_event(
        session,
        order_id=row.id,
        user_id=row.user_id,
        event_type="canceled",
        payload={"reason": row.reason},
    )
    return {
        "order": _serialize_order(row),
        "cancel_result": {"status": "canceled", "reason": row.reason},
    }


async def list_paper_fills(session: AsyncSession, user_id: str, limit: int = 100, offset: int = 0) -> dict[str, Any]:
    rows = (
        (
            await session.execute(
                select(PaperFill)
                .where(PaperFill.user_id == user_id)
                .order_by(PaperFill.created_at.desc())
                .offset(max(0, offset))
                .limit(max(1, min(500, limit)))
            )
        )
        .scalars()
        .all()
    )
    fills = [_serialize_fill(row) for row in rows]
    return {
        "user_id": user_id,
        "items": fills,
        "summary": {
            "count": len(fills),
            "total_notional": round(sum(float(fill["quantity"]) * float(fill["price"]) for fill in fills), 6),
            "total_fees": round(sum(float(fill["fee"]) for fill in fills), 6),
        },
        "generated_at": _now().isoformat(),
    }


async def latest_order_events(
    session: AsyncSession,
    user_id: str,
    since_id: int = 0,
    limit: int = 100,
) -> list[dict[str, Any]]:
    rows = (
        (
            await session.execute(
                select(OrderEvent)
                .where(and_(OrderEvent.user_id == user_id, OrderEvent.id > since_id))
                .order_by(OrderEvent.id.asc())
                .limit(max(1, min(500, limit)))
            )
        )
        .scalars()
        .all()
    )
    payload: list[dict[str, Any]] = []
    for row in rows:
        payload.append(
            {
                "id": row.id,
                "order_id": row.order_id,
                "user_id": row.user_id,
                "event_type": row.event_type,
                "payload": row.payload,
                "created_at": row.created_at.isoformat(),
            }
        )
    return payload
