from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd


HORIZON_STEPS = {
    "daily": 1,
    "weekly": 5,
    "monthly": 21,
}


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gains = np.where(delta > 0, delta, 0.0)
    losses = np.where(delta < 0, -delta, 0.0)
    gain = pd.Series(gains, index=close.index).rolling(period).mean()
    loss = pd.Series(losses, index=close.index).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _atr(frame: pd.DataFrame, period: int = 14) -> pd.Series:
    prev_close = frame["close"].shift(1)
    tr = pd.concat(
        [
            frame["high"] - frame["low"],
            (frame["high"] - prev_close).abs(),
            (frame["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    return tr.rolling(period).mean()


def _macd(close: pd.Series) -> tuple[pd.Series, pd.Series, pd.Series]:
    ema_fast = close.ewm(span=12, adjust=False).mean()
    ema_slow = close.ewm(span=26, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal
    return macd, signal, hist


def build_feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    df = frame.copy().sort_values("timestamp").reset_index(drop=True)

    df["ret_1d"] = df["close"].pct_change()
    df["ret_5d"] = df["close"].pct_change(5)
    df["ret_21d"] = df["close"].pct_change(21)

    df["sma_10"] = df["close"].rolling(10).mean()
    df["sma_20"] = df["close"].rolling(20).mean()
    df["sma_50"] = df["close"].rolling(50).mean()
    df["ema_12"] = df["close"].ewm(span=12, adjust=False).mean()
    df["ema_26"] = df["close"].ewm(span=26, adjust=False).mean()

    macd, macd_signal, macd_hist = _macd(df["close"])
    df["macd"] = macd
    df["macd_signal"] = macd_signal
    df["macd_hist"] = macd_hist

    df["rsi_14"] = _rsi(df["close"], 14)
    df["atr_14"] = _atr(df, 14)
    df["volatility_20"] = df["ret_1d"].rolling(20).std() * np.sqrt(252)

    rolling_mid = df["close"].rolling(20).mean()
    rolling_std = df["close"].rolling(20).std()
    df["bb_upper"] = rolling_mid + 2 * rolling_std
    df["bb_lower"] = rolling_mid - 2 * rolling_std
    df["bb_pos"] = (df["close"] - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"]).replace(0, np.nan)

    df["volume_z"] = (df["volume"] - df["volume"].rolling(20).mean()) / df["volume"].rolling(20).std()
    df["trend_strength"] = (df["sma_20"] - df["sma_50"]) / df["sma_50"].replace(0, np.nan)
    df["price_to_sma20"] = (df["close"] - df["sma_20"]) / df["sma_20"].replace(0, np.nan)
    df["price_to_sma50"] = (df["close"] - df["sma_50"]) / df["sma_50"].replace(0, np.nan)

    df = df.replace([np.inf, -np.inf], np.nan).dropna().reset_index(drop=True)
    return df


FEATURE_COLUMNS: list[str] = [
    "ret_1d",
    "ret_5d",
    "ret_21d",
    "macd",
    "macd_signal",
    "macd_hist",
    "rsi_14",
    "atr_14",
    "volatility_20",
    "bb_pos",
    "volume_z",
    "trend_strength",
    "price_to_sma20",
    "price_to_sma50",
]


@dataclass(slots=True)
class FeatureSet:
    symbol: str
    frame: pd.DataFrame
    X: np.ndarray
    y: np.ndarray
    forward_returns: np.ndarray
    feature_names: list[str]


def make_supervised_set(frame: pd.DataFrame, symbol: str, horizon: str) -> FeatureSet:
    step = HORIZON_STEPS[horizon]
    df = build_feature_frame(frame)

    future_ret = df["close"].shift(-step) / df["close"] - 1
    y = (future_ret > 0).astype(int)

    labeled = df.copy()
    labeled["future_ret"] = future_ret
    labeled["target"] = y
    labeled = labeled.dropna().reset_index(drop=True)

    X = labeled[FEATURE_COLUMNS].to_numpy(dtype=np.float64)
    target = labeled["target"].to_numpy(dtype=np.int64)
    fwd = labeled["future_ret"].to_numpy(dtype=np.float64)

    return FeatureSet(
        symbol=symbol,
        frame=labeled,
        X=X,
        y=target,
        forward_returns=fwd,
        feature_names=FEATURE_COLUMNS.copy(),
    )


def combine_feature_sets(feature_sets: Iterable[FeatureSet]) -> tuple[np.ndarray, np.ndarray]:
    xs: list[np.ndarray] = []
    ys: list[np.ndarray] = []
    for fs in feature_sets:
        xs.append(fs.X)
        ys.append(fs.y)
    if not xs:
        raise ValueError("No feature sets to combine")
    return np.vstack(xs), np.concatenate(ys)


def create_sequences(X: np.ndarray, y: np.ndarray, seq_len: int) -> tuple[np.ndarray, np.ndarray]:
    if len(X) <= seq_len + 1:
        raise ValueError("Not enough rows to create sequences")
    sequences: list[np.ndarray] = []
    labels: list[int] = []
    for i in range(seq_len, len(X)):
        sequences.append(X[i - seq_len : i])
        labels.append(int(y[i]))
    return np.stack(sequences), np.array(labels, dtype=np.int64)

