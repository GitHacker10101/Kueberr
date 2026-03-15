from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sqlalchemy import select

from .backtest import run_walk_forward_backtest
from .db import MetricSnapshot, PredictionSnapshot, TrainingRun, session_scope
from .features import FeatureSet, make_supervised_set
from .market_data import POPULAR_SYMBOLS, fetch_daily_bars
from .modeling import EnsembleArtifact, explain_artifact_prediction, predict_from_artifact, train_ensemble
from .regime import detect_regime
from .schemas import BacktestRequest, ExplainRequest, PredictRequest, PredictionResponse, TrainRequest


class QuantEngineService:
    def __init__(self) -> None:
        self._artifacts: dict[str, EnsembleArtifact] = {}
        self._locks = {
            "daily": asyncio.Lock(),
            "weekly": asyncio.Lock(),
            "monthly": asyncio.Lock(),
        }

    async def _build_feature_set(self, symbol: str, horizon: str, lookback_days: int) -> FeatureSet:
        bars = await fetch_daily_bars(symbol, lookback_days=lookback_days)
        regime = detect_regime(bars.frame)
        bars.frame["regime"] = regime.regime
        return make_supervised_set(bars.frame, symbol=bars.symbol, horizon=horizon)

    async def train(self, request: TrainRequest) -> dict[str, Any]:
        symbols = list(dict.fromkeys([s.strip().upper() for s in request.symbols if s.strip()]))
        if not symbols:
            symbols = POPULAR_SYMBOLS[:]

        feature_sets: list[FeatureSet] = []
        for symbol in symbols:
            try:
                fs = await self._build_feature_set(symbol, request.horizon, request.lookback_days)
                feature_sets.append(fs)
            except Exception:
                continue

        if not feature_sets:
            raise ValueError("Could not fetch enough market data to train")

        async with self._locks[request.horizon]:
            artifact = await asyncio.to_thread(
                train_ensemble,
                feature_sets=feature_sets,
                horizon=request.horizon,
                symbols=[fs.symbol for fs in feature_sets],
                sequence_length=request.sequence_length,
                lookback_days=request.lookback_days,
            )
            self._artifacts[request.horizon] = artifact

        directional_metrics = {
            name: round(metrics["accuracy"] * 100, 2)
            for name, metrics in artifact.model_metrics.items()
        }
        weighted_directional_accuracy = float(
            np.sum(
                [
                    artifact.weights[name] * artifact.model_metrics[name]["accuracy"]
                    for name in artifact.weights.keys()
                ]
            )
            * 100
        )

        payload = {
            "horizon": request.horizon,
            "trained_at": artifact.trained_at.isoformat(),
            "symbols": artifact.symbols,
            "sample_size": int(np.sum([len(fs.X) for fs in feature_sets])),
            "directional_accuracy_weighted": round(weighted_directional_accuracy, 2),
            "model_metrics": artifact.model_metrics,
            "model_weights": artifact.weights,
            "calibration_curve": artifact.calibration_points,
            "directional_metrics_by_model": directional_metrics,
            "regime_adjustment": artifact.regime_adjustment,
        }

        async with session_scope() as session:
            session.add(
                TrainingRun(
                    horizon=request.horizon,
                    symbols=",".join(artifact.symbols),
                    sample_size=payload["sample_size"],
                    directional_accuracy=payload["directional_accuracy_weighted"],
                    model_metrics=payload,
                )
            )

        return payload

    async def get_or_train_artifact(self, horizon: str) -> EnsembleArtifact:
        artifact = self._artifacts.get(horizon)
        if artifact:
            return artifact
        train_req = TrainRequest(symbols=POPULAR_SYMBOLS[:6], horizon=horizon)
        await self.train(train_req)
        fresh = self._artifacts.get(horizon)
        if not fresh:
            raise RuntimeError("Failed to initialize model artifact")
        return fresh

    async def predict(self, request: PredictRequest) -> PredictionResponse:
        artifact = await self.get_or_train_artifact(request.horizon)
        bars = await fetch_daily_bars(request.symbol, request.lookback_days)
        regime_state = detect_regime(bars.frame)
        bars.frame["regime"] = regime_state.regime
        fs = make_supervised_set(bars.frame, symbol=request.symbol.upper(), horizon=request.horizon)

        pred = predict_from_artifact(artifact, fs.frame, regime_state)
        direction = pred["direction"]
        reasons = [
            f"Ensemble probability up is {pred['probability_up']:.3f} with {pred['agreement_score']:.1f}% model agreement.",
            f"Detected market regime is {regime_state.regime} (trend={regime_state.trend:.3f}, vol={regime_state.volatility:.3f}).",
            "Forecast is probabilistic and calibrated; this is not a guaranteed return.",
        ]

        response = PredictionResponse(
            symbol=request.symbol.upper(),
            horizon=request.horizon,
            timestamp=datetime.now(tz=timezone.utc),
            direction=direction,
            probability_up=float(pred["probability_up"]),
            confidence=float(pred["confidence"]),
            expected_return_pct=float(pred["expected_return_pct"]),
            confidence_interval_pct=(
                float(pred["confidence_interval_pct"][0]),
                float(pred["confidence_interval_pct"][1]),
            ),
            regime=regime_state.regime,
            model_votes={k: float(v) for k, v in pred["model_votes"].items()},
            model_weights={k: float(v) for k, v in pred["model_weights"].items()},
            agreement_score=float(pred["agreement_score"]),
            reason=reasons,
        )

        async with session_scope() as session:
            session.add(
                PredictionSnapshot(
                    symbol=response.symbol,
                    horizon=response.horizon,
                    direction=response.direction,
                    probability_up=response.probability_up,
                    confidence=response.confidence,
                    explanation={"reason": response.reason, "regime": response.regime},
                )
            )

        return response

    async def explain(self, request: ExplainRequest) -> dict[str, Any]:
        artifact = await self.get_or_train_artifact(request.horizon)
        bars = await fetch_daily_bars(request.symbol, request.lookback_days)
        regime_state = detect_regime(bars.frame)
        bars.frame["regime"] = regime_state.regime
        fs = make_supervised_set(bars.frame, symbol=request.symbol.upper(), horizon=request.horizon)

        feature_importance, shap_values, model_agreement = explain_artifact_prediction(artifact, fs.frame)
        pred = predict_from_artifact(artifact, fs.frame, regime_state)

        why = [
            f"Direction {pred['direction']} because calibrated probability is {pred['probability_up']:.3f}.",
            f"Agreement score is {pred['agreement_score']:.1f}%, threshold is {artifact.directional_threshold:.2f}.",
            "Confidence is adjusted by calibration and cross-model disagreement.",
        ]

        return {
            "symbol": request.symbol.upper(),
            "horizon": request.horizon,
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
            "feature_importance": feature_importance,
            "shap_values": shap_values,
            "model_agreement": model_agreement,
            "why_prediction": why,
        }

    async def backtest(self, request: BacktestRequest) -> dict[str, Any]:
        feature_sets: list[FeatureSet] = []
        for symbol in request.symbols:
            try:
                fs = await self._build_feature_set(symbol, request.horizon, request.lookback_days)
                feature_sets.append(fs)
            except Exception:
                continue

        if len(feature_sets) < 2:
            raise ValueError("Need at least two symbols with valid history for robust backtest")

        report = run_walk_forward_backtest(
            feature_sets=feature_sets,
            horizon=request.horizon,
            walk_forward_windows=request.walk_forward_windows,
            sequence_length=30,
            transaction_cost_bps=request.transaction_cost_bps,
            slippage_bps=request.slippage_bps,
            stop_loss_pct=request.stop_loss_pct,
            take_profit_pct=request.take_profit_pct,
        )

        report["horizon"] = request.horizon
        report["generated_at"] = datetime.now(tz=timezone.utc).isoformat()
        report["symbols"] = [fs.symbol for fs in feature_sets]
        report["disclaimer"] = (
            "Forecasts are probabilistic, backtests include assumptions, and no return is guaranteed."
        )

        async with session_scope() as session:
            session.add(
                MetricSnapshot(
                    horizon=request.horizon,
                    metric_name="directional_accuracy",
                    metric_value=float(report["directional_accuracy"]),
                    payload=report,
                )
            )

        return report

    async def latest_training_runs(self, limit: int = 20) -> list[dict[str, Any]]:
        async with session_scope() as session:
            rows = (
                (
                    await session.execute(
                        select(TrainingRun).order_by(TrainingRun.created_at.desc()).limit(limit)
                    )
                )
                .scalars()
                .all()
            )
            return [
                {
                    "id": row.id,
                    "horizon": row.horizon,
                    "symbols": row.symbols.split(","),
                    "sample_size": row.sample_size,
                    "directional_accuracy": row.directional_accuracy,
                    "created_at": row.created_at.isoformat(),
                }
                for row in rows
            ]


quant_engine = QuantEngineService()
