from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from .db import RiskSnapshot
from .market_data import fetch_daily_bars
from .portfolio_engine import get_positions
from .regime import detect_regime


def _max_drawdown_from_returns(returns: np.ndarray) -> float:
    if returns.size == 0:
        return 0.0
    equity = np.cumprod(1 + returns)
    peak = np.maximum.accumulate(equity)
    drawdown = (equity - peak) / np.where(peak == 0, 1, peak)
    return float(abs(np.min(drawdown)))


async def build_risk_snapshot(session: AsyncSession, user_id: str, lookback_days: int = 365) -> dict[str, Any]:
    positions_payload = await get_positions(session, user_id)
    positions = positions_payload["positions"]

    if not positions:
        payload = {
            "user_id": user_id,
            "var_95": 0.0,
            "cvar_95": 0.0,
            "annual_vol": 0.0,
            "beta_proxy": 0.0,
            "max_drawdown": 0.0,
            "concentration_hhi": 0.0,
            "correlation_concentration": 0.0,
            "risk_regime": "Low",
            "risk_confidence": 0.5,
            "limit_breaches": [],
            "factor_exposures": {"market": 0.0, "size": 0.0, "momentum": 0.0},
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        session.add(
            RiskSnapshot(
                user_id=user_id,
                var_95=0.0,
                cvar_95=0.0,
                annual_vol=0.0,
                beta_proxy=0.0,
                max_drawdown=0.0,
                concentration_hhi=0.0,
                payload=payload,
            )
        )
        return payload

    symbols = [row["symbol"] for row in positions]
    market_values = np.array([float(row["market_value"]) for row in positions], dtype=np.float64)
    gross = float(np.sum(np.abs(market_values)))
    weights = np.array([value / gross if gross > 1e-12 else 0.0 for value in market_values], dtype=np.float64)
    concentration_hhi = float(np.sum(np.square(weights)))

    returns_table: dict[str, pd.Series] = {}
    for symbol in symbols:
        try:
            bars = await fetch_daily_bars(symbol, lookback_days)
        except Exception:
            continue
        series = bars.frame["close"].pct_change().dropna().reset_index(drop=True)
        if len(series) >= 40:
            returns_table[symbol] = series

    if len(returns_table) < 1:
        raise ValueError("Not enough market data to compute risk snapshot")

    aligned = pd.DataFrame(returns_table).dropna()
    if aligned.empty:
        raise ValueError("Aligned return matrix is empty for risk snapshot")

    valid_symbols = list(aligned.columns)
    weight_map = {symbol: weights[symbols.index(symbol)] for symbol in valid_symbols}
    aligned_weights = np.array([weight_map[symbol] for symbol in valid_symbols], dtype=np.float64)
    if np.sum(np.abs(aligned_weights)) > 1e-12:
        aligned_weights = aligned_weights / np.sum(np.abs(aligned_weights))

    portfolio_returns = aligned.to_numpy() @ aligned_weights
    var_95 = float(np.percentile(portfolio_returns, 5))
    cvar_95 = float(np.mean(portfolio_returns[portfolio_returns <= var_95])) if np.any(portfolio_returns <= var_95) else var_95
    annual_vol = float(np.std(portfolio_returns) * np.sqrt(252))
    max_drawdown = _max_drawdown_from_returns(portfolio_returns)

    try:
        benchmark = await fetch_daily_bars("SPY", lookback_days)
        benchmark_ret = benchmark.frame["close"].pct_change().dropna().reset_index(drop=True)
        aligned_beta = pd.DataFrame({"portfolio": portfolio_returns, "benchmark": benchmark_ret[: len(portfolio_returns)]}).dropna()
        if len(aligned_beta) > 20 and float(np.var(aligned_beta["benchmark"])) > 1e-12:
            beta_proxy = float(np.cov(aligned_beta["portfolio"], aligned_beta["benchmark"])[0, 1] / np.var(aligned_beta["benchmark"]))
        else:
            beta_proxy = 0.0
    except Exception:
        beta_proxy = 0.0

    corr = aligned.corr().fillna(0.0).to_numpy()
    if corr.shape[0] <= 1:
        correlation_concentration = 0.0
    else:
        off_diag = corr[~np.eye(corr.shape[0], dtype=bool)]
        correlation_concentration = float(np.mean(np.abs(off_diag)))

    regime = detect_regime(pd.DataFrame({"close": np.cumprod(1 + portfolio_returns)}))
    if annual_vol > 0.34 or max_drawdown > 0.2:
        risk_regime = "High"
    elif annual_vol > 0.2 or max_drawdown > 0.12:
        risk_regime = "Moderate"
    else:
        risk_regime = "Low"

    limit_breaches: list[dict[str, Any]] = []
    if concentration_hhi > 0.34:
        limit_breaches.append({"code": "CONCENTRATION_HHI", "severity": "high", "message": "Portfolio concentration is above threshold"})
    if annual_vol > 0.32:
        limit_breaches.append({"code": "ANNUAL_VOL", "severity": "high", "message": "Annualized volatility is elevated"})
    if abs(var_95) > 0.03:
        limit_breaches.append({"code": "VAR_95", "severity": "medium", "message": "VaR 95% exceeds daily tolerance"})

    factor_exposures = {
        "market": round(beta_proxy, 6),
        "size": round(float(np.mean(weights)) if weights.size else 0.0, 6),
        "momentum": round(float(np.mean(portfolio_returns[-20:])) * 20 if len(portfolio_returns) >= 20 else 0.0, 6),
    }

    payload = {
        "user_id": user_id,
        "symbols": valid_symbols,
        "var_95": round(var_95, 6),
        "cvar_95": round(cvar_95, 6),
        "annual_vol": round(annual_vol, 6),
        "beta_proxy": round(beta_proxy, 6),
        "max_drawdown": round(max_drawdown, 6),
        "concentration_hhi": round(concentration_hhi, 6),
        "correlation_concentration": round(correlation_concentration, 6),
        "risk_regime": risk_regime,
        "risk_confidence": round(float(regime.confidence), 6),
        "limit_breaches": limit_breaches,
        "factor_exposures": factor_exposures,
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }

    session.add(
        RiskSnapshot(
            user_id=user_id,
            var_95=payload["var_95"],
            cvar_95=payload["cvar_95"],
            annual_vol=payload["annual_vol"],
            beta_proxy=payload["beta_proxy"],
            max_drawdown=payload["max_drawdown"],
            concentration_hhi=payload["concentration_hhi"],
            payload=payload,
        )
    )
    return payload
