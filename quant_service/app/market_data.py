from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from io import StringIO
from typing import Any, Protocol

import pandas as pd
import requests

from .cache import cache_client
from .config import settings


YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
POLYGON_URL = "https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/{start}/{end}"
ALPACA_BARS_URL = "https://data.alpaca.markets/v2/stocks/{symbol}/bars"
STOOQ_URL = "https://stooq.com/q/d/l/"


@dataclass(slots=True)
class PriceFrame:
    symbol: str
    frame: pd.DataFrame


class MarketDataAdapter(Protocol):
    async def fetch_daily_bars(self, symbol: str, lookback_days: int) -> PriceFrame:
        ...


def _coerce_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def _to_unix(dt: datetime) -> int:
    return int(dt.replace(tzinfo=timezone.utc).timestamp())


def _normalize_frame(symbol: str, frame: pd.DataFrame) -> PriceFrame:
    if frame.empty:
        raise ValueError(f"No market data for {symbol}")
    for column in ("timestamp", "open", "high", "low", "close"):
        if column not in frame.columns:
            raise ValueError(f"Missing market data column {column} for {symbol}")
    clean = frame.copy()
    clean["timestamp"] = pd.to_datetime(clean["timestamp"], utc=True)
    clean = clean.dropna(subset=["open", "high", "low", "close"]).reset_index(drop=True)
    if clean.empty:
        raise ValueError(f"All candles null for {symbol}")
    if "volume" not in clean.columns:
        clean["volume"] = 0.0
    clean["volume"] = clean["volume"].fillna(0)
    clean["symbol"] = symbol
    return PriceFrame(symbol=symbol, frame=clean)


class YahooAdapter:
    def _parse_chart_payload(self, symbol: str, payload: dict[str, Any]) -> PriceFrame:
        result = payload.get("chart", {}).get("result")
        if not result:
            raise ValueError(f"No market data for {symbol}")

        chart = result[0]
        timestamps = chart.get("timestamp") or []
        indicators = chart.get("indicators", {}).get("quote", [{}])[0]
        if not timestamps:
            raise ValueError(f"Empty timestamp series for {symbol}")

        frame = pd.DataFrame(
            {
                "timestamp": pd.to_datetime(timestamps, unit="s", utc=True),
                "open": indicators.get("open"),
                "high": indicators.get("high"),
                "low": indicators.get("low"),
                "close": indicators.get("close"),
                "volume": indicators.get("volume"),
            }
        )
        return _normalize_frame(symbol, frame)

    def _fetch_stooq_fallback(self, symbol: str, lookback_days: int) -> PriceFrame:
        stooq_symbol = f"{symbol.lower()}.us"
        response = requests.get(
            STOOQ_URL,
            params={"s": stooq_symbol, "i": "d"},
            timeout=25,
        )
        response.raise_for_status()
        frame = pd.read_csv(StringIO(response.text))
        if frame.empty:
            raise ValueError(f"No fallback market data for {symbol}")
        renamed = {column.lower(): column for column in frame.columns}
        required = {"date", "open", "high", "low", "close"}
        if not required.issubset(set(renamed.keys())):
            raise ValueError(f"Fallback market data missing columns for {symbol}")

        clean = frame.rename(columns={value: key for key, value in renamed.items()})
        clean["timestamp"] = pd.to_datetime(clean["date"], utc=True, errors="coerce")
        clean = clean.dropna(subset=["timestamp", "open", "high", "low", "close"]).reset_index(drop=True)
        if clean.empty:
            raise ValueError(f"Fallback market data is empty after cleanup for {symbol}")

        if "volume" not in clean.columns:
            clean["volume"] = 0
        clean["volume"] = pd.to_numeric(clean["volume"], errors="coerce").fillna(0.0)

        start_cutoff = datetime.now(tz=timezone.utc) - timedelta(days=int(lookback_days * 1.9))
        clean = clean[clean["timestamp"] >= start_cutoff]
        return _normalize_frame(symbol, clean[["timestamp", "open", "high", "low", "close", "volume"]])

    async def fetch_daily_bars(self, symbol: str, lookback_days: int) -> PriceFrame:
        resolved = _coerce_symbol(symbol)
        end = datetime.now(tz=timezone.utc)
        start = end - timedelta(days=int(lookback_days * 1.6))

        try:
            response = requests.get(
                YAHOO_CHART_URL.format(symbol=resolved),
                params={
                    "period1": _to_unix(start),
                    "period2": _to_unix(end),
                    "interval": "1d",
                    "events": "history",
                    "includeAdjustedClose": "true",
                },
                timeout=25,
            )
            response.raise_for_status()
            payload = response.json()
            return self._parse_chart_payload(resolved, payload)
        except Exception as yahoo_error:
            try:
                return self._fetch_stooq_fallback(resolved, lookback_days)
            except Exception as fallback_error:
                raise RuntimeError(f"Market data failed for {resolved}: yahoo={yahoo_error}; fallback={fallback_error}") from fallback_error


class PolygonAdapter:
    async def fetch_daily_bars(self, symbol: str, lookback_days: int) -> PriceFrame:
        if not settings.polygon_api_key:
            raise RuntimeError("Polygon adapter is configured but POLYGON_API_KEY is missing")
        resolved = _coerce_symbol(symbol)
        end = datetime.now(tz=timezone.utc).date()
        start = end - timedelta(days=int(lookback_days * 1.8))
        response = requests.get(
            POLYGON_URL.format(symbol=resolved, start=start.isoformat(), end=end.isoformat()),
            params={"adjusted": "true", "sort": "asc", "limit": 50000, "apiKey": settings.polygon_api_key},
            timeout=25,
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("results") or []
        if not rows:
            raise ValueError(f"No polygon bars for {resolved}")
        frame = pd.DataFrame(
            {
                "timestamp": pd.to_datetime([row.get("t") for row in rows], unit="ms", utc=True),
                "open": [row.get("o") for row in rows],
                "high": [row.get("h") for row in rows],
                "low": [row.get("l") for row in rows],
                "close": [row.get("c") for row in rows],
                "volume": [row.get("v") for row in rows],
            }
        )
        return _normalize_frame(resolved, frame)


class AlpacaAdapter:
    async def fetch_daily_bars(self, symbol: str, lookback_days: int) -> PriceFrame:
        if not settings.alpaca_api_key or not settings.alpaca_api_secret:
            raise RuntimeError("Alpaca adapter is configured but credentials are missing")
        resolved = _coerce_symbol(symbol)
        start = (datetime.now(tz=timezone.utc) - timedelta(days=int(lookback_days * 1.8))).date().isoformat()
        end = datetime.now(tz=timezone.utc).date().isoformat()
        response = requests.get(
            ALPACA_BARS_URL.format(symbol=resolved),
            params={"timeframe": "1Day", "start": start, "end": end, "adjustment": "all", "feed": "iex"},
            headers={
                "APCA-API-KEY-ID": settings.alpaca_api_key,
                "APCA-API-SECRET-KEY": settings.alpaca_api_secret,
            },
            timeout=25,
        )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("bars") or payload.get("results") or []
        if not rows:
            raise ValueError(f"No alpaca bars for {resolved}")

        frame = pd.DataFrame(
            {
                "timestamp": pd.to_datetime([row.get("t") for row in rows], utc=True),
                "open": [row.get("o") for row in rows],
                "high": [row.get("h") for row in rows],
                "low": [row.get("l") for row in rows],
                "close": [row.get("c") for row in rows],
                "volume": [row.get("v") for row in rows],
            }
        )
        return _normalize_frame(resolved, frame)


def _resolve_adapter() -> MarketDataAdapter:
    provider = settings.market_data_provider.strip().lower()
    if provider == "polygon":
        return PolygonAdapter()
    if provider == "alpaca":
        return AlpacaAdapter()
    return YahooAdapter()


_adapter = _resolve_adapter()


async def fetch_daily_bars(symbol: str, lookback_days: int) -> PriceFrame:
    resolved = _coerce_symbol(symbol)
    cache_key = f"bars:{resolved}:{lookback_days}:{settings.market_data_provider.lower()}"
    cached = await cache_client.get_json(cache_key)
    if cached:
        frame = pd.DataFrame(cached["rows"])
        frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
        return PriceFrame(symbol=resolved, frame=frame)

    bars = await _adapter.fetch_daily_bars(resolved, lookback_days)
    cache_frame = bars.frame.copy()
    cache_frame["timestamp"] = pd.to_datetime(cache_frame["timestamp"], utc=True).dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    await cache_client.set_json(
        cache_key,
        {"rows": cache_frame.to_dict(orient="records")},
        ttl_seconds=60 * 20,
    )
    return bars


POPULAR_SYMBOLS = [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "META",
    "GOOGL",
    "TSLA",
    "AMD",
    "PLTR",
    "NFLX",
]
