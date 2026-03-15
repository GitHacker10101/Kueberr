from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from .db import OptimizerRun
from .market_data import fetch_daily_bars
from .portfolio_engine import get_positions


def _to_float(value: Any, fallback: float) -> float:
    try:
        parsed = float(value)
        if np.isfinite(parsed):
            return parsed
    except Exception:
        pass
    return fallback


async def _returns_table(symbols: list[str], lookback_days: int = 365) -> pd.DataFrame:
    series: dict[str, pd.Series] = {}
    for symbol in symbols:
        try:
            bars = await fetch_daily_bars(symbol, lookback_days)
        except Exception:
            continue
        returns = bars.frame["close"].pct_change().dropna().reset_index(drop=True)
        if len(returns) >= 40:
            series[symbol] = returns
    if not series:
        return pd.DataFrame()
    return pd.DataFrame(series).dropna()


async def suggest_rebalance(
    session: AsyncSession,
    user_id: str,
    constraints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    constraints = constraints or {}
    max_weight = _to_float(constraints.get("max_weight"), 0.3)
    min_weight = _to_float(constraints.get("min_weight"), 0.0)
    turnover_limit = _to_float(constraints.get("turnover_limit"), 0.35)
    target_vol = _to_float(constraints.get("target_vol"), 0.22)
    cash_buffer = _to_float(constraints.get("cash_buffer"), 0.05)

    max_weight = float(np.clip(max_weight, 0.02, 0.9))
    min_weight = float(np.clip(min_weight, 0.0, max_weight))
    turnover_limit = float(np.clip(turnover_limit, 0.05, 1.0))
    target_vol = float(np.clip(target_vol, 0.05, 1.0))
    cash_buffer = float(np.clip(cash_buffer, 0.0, 0.7))

    portfolio = await get_positions(session, user_id)
    positions = portfolio["positions"]
    equity = float(portfolio["totals"]["equity"])

    if not positions:
        result = {
            "user_id": user_id,
            "target_weights": [],
            "trade_recommendations": [],
            "expected_risk_delta": 0.0,
            "expected_return_delta": 0.0,
            "turnover_cost_estimate": 0.0,
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        session.add(OptimizerRun(user_id=user_id, constraints=constraints, result=result))
        return result

    symbols = [row["symbol"] for row in positions]
    current_values = np.array([float(row["market_value"]) for row in positions], dtype=np.float64)
    gross = float(np.sum(np.abs(current_values)))
    current_weights = np.array([value / gross if gross > 1e-12 else 0.0 for value in current_values], dtype=np.float64)

    returns = await _returns_table(symbols, lookback_days=365)
    if returns.empty:
        target_weights = current_weights.copy()
        mu = np.zeros_like(current_weights)
        covariance = np.eye(len(current_weights)) * 1e-6
    else:
        valid_symbols = list(returns.columns)
        idx_map = {symbol: symbols.index(symbol) for symbol in valid_symbols}
        base_weights = np.array([current_weights[idx_map[symbol]] for symbol in valid_symbols], dtype=np.float64)
        base_weights = base_weights / np.sum(np.abs(base_weights))

        mu_valid = returns.mean().to_numpy(dtype=np.float64) * 252
        cov_valid = returns.cov().to_numpy(dtype=np.float64) * 252
        var_diag = np.diag(cov_valid)
        score = mu_valid / np.clip(var_diag, 1e-6, None)
        score = np.clip(score, 0.0, None)
        if np.sum(score) <= 1e-12:
            score = np.ones_like(score)
        candidate = score / np.sum(score)
        candidate = np.clip(candidate, min_weight, max_weight)
        if np.sum(candidate) > 1e-12:
            candidate = candidate / np.sum(candidate)
        candidate = candidate * (1 - cash_buffer)

        turnover = float(np.sum(np.abs(candidate - base_weights)))
        if turnover > turnover_limit and turnover > 1e-12:
            blend = turnover_limit / turnover
            candidate = base_weights + (candidate - base_weights) * blend

        target_weights = current_weights.copy()
        for symbol in symbols:
            if symbol in idx_map:
                target_weights[symbols.index(symbol)] = candidate[valid_symbols.index(symbol)]
            else:
                target_weights[symbols.index(symbol)] = 0.0

        mu = np.array([mu_valid[valid_symbols.index(symbol)] if symbol in valid_symbols else 0.0 for symbol in symbols], dtype=np.float64)
        covariance = np.zeros((len(symbols), len(symbols)), dtype=np.float64)
        for i, sym_i in enumerate(symbols):
            for j, sym_j in enumerate(symbols):
                if sym_i in valid_symbols and sym_j in valid_symbols:
                    covariance[i, j] = cov_valid[valid_symbols.index(sym_i), valid_symbols.index(sym_j)]
                elif i == j:
                    covariance[i, j] = 1e-6

    current_return = float(np.dot(current_weights, mu))
    target_return = float(np.dot(target_weights, mu))

    current_vol = float(np.sqrt(np.dot(current_weights.T, np.dot(covariance, current_weights))))
    target_vol_est = float(np.sqrt(np.dot(target_weights.T, np.dot(covariance, target_weights))))
    vol_adjust = target_vol / target_vol_est if target_vol_est > 1e-12 else 1.0
    if vol_adjust < 1:
        target_weights *= vol_adjust

    if np.sum(target_weights) > 1e-12:
        target_weights = target_weights / np.sum(target_weights) * (1 - cash_buffer)

    turnover_final = float(np.sum(np.abs(target_weights - current_weights)))
    turnover_cost_estimate = turnover_final * abs(equity) * 0.0015

    recommendations: list[dict[str, Any]] = []
    target_weights_list: list[dict[str, Any]] = []
    for idx, symbol in enumerate(symbols):
        current_w = float(current_weights[idx])
        target_w = float(target_weights[idx])
        delta_w = target_w - current_w
        market_price = float(positions[idx]["market_price"])
        trade_value = delta_w * abs(equity)
        trade_qty = trade_value / market_price if market_price > 1e-12 else 0.0
        action = "BUY" if trade_qty > 1e-8 else "SELL" if trade_qty < -1e-8 else "HOLD"

        target_weights_list.append(
            {
                "symbol": symbol,
                "current_weight": round(current_w, 6),
                "target_weight": round(target_w, 6),
                "delta_weight": round(delta_w, 6),
            }
        )
        recommendations.append(
            {
                "symbol": symbol,
                "action": action,
                "quantity": round(abs(trade_qty), 6),
                "notional": round(abs(trade_value), 6),
                "price_reference": round(market_price, 6),
            }
        )

    result = {
        "user_id": user_id,
        "target_weights": target_weights_list,
        "trade_recommendations": recommendations,
        "expected_risk_delta": round(current_vol - target_vol_est, 6),
        "expected_return_delta": round(target_return - current_return, 6),
        "turnover": round(turnover_final, 6),
        "turnover_cost_estimate": round(turnover_cost_estimate, 6),
        "cash_buffer": round(cash_buffer, 6),
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }

    session.add(OptimizerRun(user_id=user_id, constraints=constraints, result=result))
    return result
