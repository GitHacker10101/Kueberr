from __future__ import annotations

from dataclasses import dataclass
from itertools import product
from typing import Any

import numpy as np
from sklearn.metrics import accuracy_score

from .features import FeatureSet, HORIZON_STEPS
from .modeling import (
    EnsembleArtifact,
    predict_from_artifact,
    regression_errors,
    rolling_accuracy_series,
    train_ensemble,
)
from .regime import detect_regime


@dataclass(slots=True)
class BacktestPoint:
    symbol: str
    idx: int
    actual: int
    prediction: int
    probability_up: float
    forward_return: float
    pnl: float


def _slice_feature_set(fs: FeatureSet, end: int) -> FeatureSet:
    end = max(80, min(end, len(fs.X)))
    return FeatureSet(
        symbol=fs.symbol,
        frame=fs.frame.iloc[:end].copy(),
        X=fs.X[:end].copy(),
        y=fs.y[:end].copy(),
        forward_returns=fs.forward_returns[:end].copy(),
        feature_names=fs.feature_names.copy(),
    )


def _direction_from_probability(probability_up: float, threshold: float = 0.56) -> int:
    if probability_up >= threshold:
        return 1
    if probability_up <= 1 - threshold:
        return -1
    return 0


def _simulate_trade(
    direction: int,
    forward_return: float,
    stop_loss_pct: float,
    take_profit_pct: float,
    transaction_cost_bps: float,
    slippage_bps: float,
) -> float:
    if direction == 0:
        return 0.0
    clipped = min(max(forward_return, -stop_loss_pct), take_profit_pct)
    directional_ret = clipped if direction > 0 else -clipped
    costs = (transaction_cost_bps + slippage_bps) / 10000.0
    return directional_ret - costs


def _compute_portfolio_metrics(trade_returns: np.ndarray, horizon_step: int) -> dict[str, float]:
    if len(trade_returns) == 0:
        return {
            "cagr": 0.0,
            "sharpe": 0.0,
            "sortino": 0.0,
            "max_drawdown": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
        }

    equity_curve = np.cumprod(1 + trade_returns)
    total_years = max((len(trade_returns) * horizon_step) / 252.0, 1 / 252.0)
    cagr = float((equity_curve[-1] ** (1 / total_years)) - 1)

    mean = float(np.mean(trade_returns))
    std = float(np.std(trade_returns))
    downside = trade_returns[trade_returns < 0]
    downside_std = float(np.std(downside)) if len(downside) > 0 else 0.0
    ann_factor = np.sqrt(252.0 / horizon_step)

    sharpe = float((mean / std) * ann_factor) if std > 1e-9 else 0.0
    sortino = float((mean / downside_std) * ann_factor) if downside_std > 1e-9 else 0.0

    peaks = np.maximum.accumulate(equity_curve)
    drawdowns = (equity_curve - peaks) / peaks
    max_drawdown = float(abs(np.min(drawdowns)))

    wins = trade_returns[trade_returns > 0]
    losses = trade_returns[trade_returns < 0]
    win_rate = float(len(wins) / len(trade_returns))
    profit_factor = float(wins.sum() / abs(losses.sum())) if len(losses) > 0 else float("inf")

    return {
        "cagr": cagr,
        "sharpe": sharpe,
        "sortino": sortino,
        "max_drawdown": max_drawdown,
        "win_rate": win_rate,
        "profit_factor": profit_factor if np.isfinite(profit_factor) else 999.0,
    }


def _optimize_strategy(points: list[BacktestPoint], horizon_step: int) -> dict[str, Any]:
    if not points:
        return {
            "best_params": {"stop_loss_pct": 0.03, "take_profit_pct": 0.08},
            "best_sharpe": 0.0,
        }

    returns = np.array([point.forward_return for point in points], dtype=np.float64)
    directions = np.array([point.prediction for point in points], dtype=np.int8)

    best_sharpe = -999.0
    best = (0.03, 0.08)

    for stop_loss, take_profit in product([0.02, 0.03, 0.05], [0.05, 0.08, 0.12]):
        pnl = np.array(
            [
                _simulate_trade(
                    direction=int(directions[i]),
                    forward_return=float(returns[i]),
                    stop_loss_pct=stop_loss,
                    take_profit_pct=take_profit,
                    transaction_cost_bps=8.0,
                    slippage_bps=6.0,
                )
                for i in range(len(returns))
            ]
        )
        metrics = _compute_portfolio_metrics(pnl, horizon_step)
        if metrics["sharpe"] > best_sharpe:
            best_sharpe = metrics["sharpe"]
            best = (stop_loss, take_profit)

    return {
        "best_params": {"stop_loss_pct": best[0], "take_profit_pct": best[1]},
        "best_sharpe": float(best_sharpe),
    }


def run_walk_forward_backtest(
    feature_sets: list[FeatureSet],
    horizon: str,
    walk_forward_windows: int,
    sequence_length: int,
    transaction_cost_bps: float,
    slippage_bps: float,
    stop_loss_pct: float,
    take_profit_pct: float,
) -> dict[str, Any]:
    if not feature_sets:
        raise ValueError("No features provided for backtest")

    min_len = min(len(fs.X) for fs in feature_sets)
    if min_len < 260:
        raise ValueError("Insufficient candles for walk-forward backtest")

    horizon_step = HORIZON_STEPS[horizon]
    test_block = max(20, (min_len - 180) // walk_forward_windows)
    train_start = 180
    points: list[BacktestPoint] = []
    y_true_prob: list[int] = []
    y_pred_prob: list[float] = []

    for window_idx in range(walk_forward_windows):
        train_end = train_start + window_idx * test_block
        test_end = min(train_end + test_block, min_len - horizon_step - 1)
        if test_end <= train_end + 5:
            continue

        train_sets = [_slice_feature_set(fs, train_end) for fs in feature_sets]
        artifact: EnsembleArtifact = train_ensemble(
            train_sets,
            horizon=horizon,
            symbols=[fs.symbol for fs in train_sets],
            sequence_length=sequence_length,
            lookback_days=0,
            fast_mode=True,
        )
        threshold_floor = 0.58 if horizon == "daily" else 0.62 if horizon == "weekly" else 0.66
        decision_threshold = max(artifact.directional_threshold, threshold_floor)

        for fs in feature_sets:
            for idx in range(train_end, test_end):
                frame_now = fs.frame.iloc[: idx + 1]
                regime_state = detect_regime(frame_now)
                pred = predict_from_artifact(artifact, frame_now, regime_state)

                actual_bin = int(fs.y[idx])
                direction = _direction_from_probability(pred["probability_up"], threshold=decision_threshold)
                actual_direction = 1 if actual_bin == 1 else -1
                pnl = _simulate_trade(
                    direction=direction,
                    forward_return=float(fs.forward_returns[idx]),
                    stop_loss_pct=stop_loss_pct,
                    take_profit_pct=take_profit_pct,
                    transaction_cost_bps=transaction_cost_bps,
                    slippage_bps=slippage_bps,
                )
                points.append(
                    BacktestPoint(
                        symbol=fs.symbol,
                        idx=idx,
                        actual=actual_direction,
                        prediction=direction,
                        probability_up=float(pred["probability_up"]),
                        forward_return=float(fs.forward_returns[idx]),
                        pnl=float(pnl),
                    )
                )
                y_true_prob.append(actual_bin)
                y_pred_prob.append(float(pred["probability_up"]))

    if not points:
        raise ValueError("Backtest generated zero evaluation points")

    directional = [point for point in points if point.prediction != 0]
    directional_hits = [
        1 if (point.prediction == point.actual) else 0 for point in directional
    ]
    directional_accuracy = float(np.mean(directional_hits) * 100) if directional_hits else 0.0

    aligned_size = min(len(y_true_prob), len(y_pred_prob))
    if aligned_size <= 0:
        raise ValueError("Backtest produced no aligned probability points")

    y_true = np.array(y_true_prob[:aligned_size], dtype=np.int64)
    y_prob = np.array(y_pred_prob[:aligned_size], dtype=np.float64)

    naive_pred = np.ones(len(y_true), dtype=np.int64)
    naive_accuracy = float(accuracy_score(y_true, naive_pred) * 100)
    beat_naive = directional_accuracy > naive_accuracy

    trade_returns = np.array([point.pnl for point in points if point.prediction != 0], dtype=np.float64)
    metrics = _compute_portfolio_metrics(trade_returns, horizon_step)
    optimization = _optimize_strategy(points, horizon_step)

    errors = regression_errors(y_true, y_prob)

    return {
        "sample_size": len(points),
        "directional_sample_size": len(directional),
        "directional_accuracy": round(directional_accuracy, 2),
        "naive_accuracy": round(naive_accuracy, 2),
        "beat_naive_baseline": beat_naive,
        "rolling_accuracy_30d": rolling_accuracy_series(y_true, y_prob, 30),
        "rolling_accuracy_90d": rolling_accuracy_series(y_true, y_prob, 90),
        "rolling_accuracy_365d": rolling_accuracy_series(y_true, y_prob, 365),
        "mae": round(errors["mae"], 6),
        "rmse": round(errors["rmse"], 6),
        "mape": round(errors["mape"], 4),
        "portfolio_metrics": {k: round(v, 6) for k, v in metrics.items()},
        "strategy_optimizer": optimization,
        "trade_count": int(np.sum([1 for point in points if point.prediction != 0])),
    }
