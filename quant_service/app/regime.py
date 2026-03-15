from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans


@dataclass(slots=True)
class RegimeState:
    regime: str
    volatility: float
    trend: float
    confidence: float


def detect_regime(frame: pd.DataFrame) -> RegimeState:
    close = frame["close"]
    ret = close.pct_change().dropna()
    if len(ret) < 60:
        return RegimeState(regime="Sideways", volatility=0.0, trend=0.0, confidence=0.5)

    annual_vol = float(ret.tail(30).std() * np.sqrt(252))
    trend = float((close.iloc[-1] / close.iloc[-30]) - 1)

    vol_series = ret.rolling(20).std().dropna().to_numpy().reshape(-1, 1)
    if len(vol_series) < 20:
        cluster_conf = 0.5
    else:
        km = KMeans(n_clusters=3, n_init=10, random_state=42)
        labels = km.fit_predict(vol_series)
        centers = km.cluster_centers_.reshape(-1)
        center_rank = np.argsort(centers)
        last_label = labels[-1]
        if last_label == center_rank[-1]:
            cluster_conf = 0.9
        elif last_label == center_rank[0]:
            cluster_conf = 0.7
        else:
            cluster_conf = 0.8

    if trend > 0.035:
        regime = "Bull"
    elif trend < -0.035:
        regime = "Bear"
    else:
        regime = "Sideways"

    return RegimeState(
        regime=regime,
        volatility=annual_vol,
        trend=trend,
        confidence=float(cluster_conf),
    )

