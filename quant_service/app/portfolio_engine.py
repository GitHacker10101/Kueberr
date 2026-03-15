from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import PortfolioPositionSnapshot, PortfolioTransaction
from .market_data import fetch_daily_bars


STARTING_CASH = 1_000_000.0


@dataclass(slots=True)
class _Lot:
    qty: float
    price: float


def _to_utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.utcnow()
    if value.tzinfo is None:
        return value
    return value.astimezone().replace(tzinfo=None)


async def _fetch_last_close(symbol: str) -> float | None:
    try:
        bars = await fetch_daily_bars(symbol, 240)
    except Exception:
        return None
    if bars.frame.empty:
        return None
    return float(bars.frame["close"].iloc[-1])


async def _latest_prices(symbols: list[str]) -> dict[str, float]:
    if not symbols:
        return {}
    unique_symbols = list(dict.fromkeys([symbol.strip().upper() for symbol in symbols if symbol.strip()]))
    results = await asyncio.gather(*[_fetch_last_close(symbol) for symbol in unique_symbols], return_exceptions=True)
    prices: dict[str, float] = {}
    for symbol, value in zip(unique_symbols, results):
        if isinstance(value, Exception) or value is None:
            continue
        prices[symbol] = float(value)
    return prices


async def _ledger_state(session: AsyncSession, user_id: str) -> dict[str, Any]:
    rows = (
        (
            await session.execute(
                select(PortfolioTransaction)
                .where(PortfolioTransaction.user_id == user_id)
                .order_by(PortfolioTransaction.executed_at.asc(), PortfolioTransaction.id.asc())
            )
        )
        .scalars()
        .all()
    )

    lots: dict[str, list[_Lot]] = {}
    realized: dict[str, float] = {}
    cash = STARTING_CASH

    for row in rows:
        symbol = row.symbol.strip().upper()
        side = row.side.upper()
        quantity = float(row.quantity)
        price = float(row.price)
        fees = float(row.fees)

        lots.setdefault(symbol, [])
        realized.setdefault(symbol, 0.0)

        if side == "BUY":
            cash -= quantity * price + fees
            lots[symbol].append(_Lot(qty=quantity, price=price))
            continue

        if side == "SELL":
            cash += quantity * price - fees
            remaining = quantity
            while remaining > 1e-12 and lots[symbol]:
                head = lots[symbol][0]
                matched = min(remaining, head.qty)
                realized[symbol] += (price - head.price) * matched
                head.qty -= matched
                remaining -= matched
                if head.qty <= 1e-12:
                    lots[symbol].pop(0)
            if remaining > 1e-12:
                realized[symbol] += price * remaining
            continue

    return {"lots": lots, "realized": realized, "cash": cash, "rows": rows}


async def get_positions(session: AsyncSession, user_id: str) -> dict[str, Any]:
    state = await _ledger_state(session, user_id)
    lots = state["lots"]
    realized = state["realized"]
    cash = float(state["cash"])

    symbols = [symbol for symbol, symbol_lots in lots.items() if sum(lot.qty for lot in symbol_lots) > 1e-10]
    prices = await _latest_prices(symbols)

    positions: list[dict[str, Any]] = []
    gross_exposure = 0.0
    net_exposure = 0.0
    total_unrealized = 0.0
    total_realized = sum(float(value) for value in realized.values())

    for symbol in sorted(symbols):
        symbol_lots = lots[symbol]
        quantity = float(sum(lot.qty for lot in symbol_lots))
        if quantity <= 1e-12:
            continue
        cost_value = float(sum(lot.qty * lot.price for lot in symbol_lots))
        avg_cost = cost_value / quantity if quantity > 0 else 0.0
        market_price = float(prices.get(symbol, avg_cost))
        market_value = market_price * quantity
        unrealized = (market_price - avg_cost) * quantity

        gross_exposure += abs(market_value)
        net_exposure += market_value
        total_unrealized += unrealized

        positions.append(
            {
                "symbol": symbol,
                "quantity": round(quantity, 6),
                "avg_cost": round(avg_cost, 6),
                "market_price": round(market_price, 6),
                "market_value": round(market_value, 6),
                "unrealized_pnl": round(unrealized, 6),
                "realized_pnl": round(float(realized.get(symbol, 0.0)), 6),
                "cost_basis": round(cost_value, 6),
            }
        )

    equity = cash + net_exposure
    for row in positions:
        row["exposure_pct"] = round((row["market_value"] / equity) if abs(equity) > 1e-12 else 0.0, 6)

    payload = {
        "user_id": user_id,
        "positions": positions,
        "totals": {
            "cash": round(cash, 6),
            "gross_exposure": round(gross_exposure, 6),
            "net_exposure": round(net_exposure, 6),
            "equity": round(equity, 6),
            "unrealized_pnl": round(total_unrealized, 6),
            "realized_pnl": round(total_realized, 6),
            "transaction_count": len(state["rows"]),
        },
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }

    session.add(PortfolioPositionSnapshot(user_id=user_id, payload=payload))
    return payload


async def record_transaction(
    session: AsyncSession,
    user_id: str,
    symbol: str,
    side: str,
    quantity: float,
    price: float,
    timestamp: datetime | None = None,
    fees: float = 0.0,
    source: str = "manual",
    order_id: str | None = None,
) -> dict[str, Any]:
    clean_symbol = symbol.strip().upper()
    clean_side = side.strip().upper()
    qty = float(quantity)
    px = float(price)
    fee = max(0.0, float(fees))

    if clean_side not in {"BUY", "SELL"}:
        raise ValueError("side must be BUY or SELL")
    if qty <= 0:
        raise ValueError("quantity must be positive")
    if px <= 0:
        raise ValueError("price must be positive")

    if clean_side == "SELL":
        state = await _ledger_state(session, user_id)
        lots = state["lots"].get(clean_symbol, [])
        available_qty = sum(lot.qty for lot in lots)
        if available_qty + 1e-9 < qty:
            raise ValueError(f"insufficient quantity to sell {clean_symbol}: available={available_qty:.6f}, requested={qty:.6f}")

    row = PortfolioTransaction(
        user_id=user_id,
        symbol=clean_symbol,
        side=clean_side,
        quantity=qty,
        price=px,
        fees=fee,
        order_id=order_id,
        source=source,
        executed_at=_to_utc(timestamp),
    )
    session.add(row)
    await session.flush()

    positions = await get_positions(session, user_id)
    return {
        "transaction_id": row.id,
        "user_id": user_id,
        "symbol": clean_symbol,
        "side": clean_side,
        "quantity": qty,
        "price": px,
        "fees": fee,
        "executed_at": row.executed_at.isoformat(),
        "positions": positions,
    }
