from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.calibration import calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler

from .features import FeatureSet, create_sequences
from .regime import RegimeState

try:
    import xgboost as xgb
except Exception:  # pragma: no cover - optional dependency
    xgb = None

try:
    import lightgbm as lgb
except Exception:  # pragma: no cover - optional dependency
    lgb = None

try:
    import shap
except Exception:  # pragma: no cover - optional dependency
    shap = None


DEVICE = torch.device("cpu")


class LSTMClassifier(nn.Module):
    def __init__(self, input_size: int, hidden_size: int = 48, layers: int = 2, dropout: float = 0.2) -> None:
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=layers,
            dropout=dropout if layers > 1 else 0.0,
            batch_first=True,
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        last = out[:, -1, :]
        return self.classifier(last).squeeze(-1)


class TransformerClassifier(nn.Module):
    def __init__(self, input_size: int, seq_len: int, d_model: int = 64, heads: int = 4, layers: int = 2) -> None:
        super().__init__()
        self.seq_len = seq_len
        self.input_proj = nn.Linear(input_size, d_model)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=heads,
            dim_feedforward=128,
            dropout=0.1,
            batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=layers)
        self.classifier = nn.Sequential(
            nn.Linear(d_model, 32),
            nn.GELU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.input_proj(x)
        encoded = self.encoder(x)
        pooled = encoded[:, -1, :]
        return self.classifier(pooled).squeeze(-1)


@dataclass(slots=True)
class EnsembleArtifact:
    horizon: str
    symbols: list[str]
    feature_names: list[str]
    scaler: StandardScaler
    models: dict[str, Any]
    weights: dict[str, float]
    calibrator: IsotonicRegression
    calibration_points: list[dict[str, float | int]]
    model_metrics: dict[str, dict[str, float]]
    agreement_floor: float
    directional_threshold: float
    regime_adjustment: dict[str, float]
    sequence_length: int
    trained_at: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))
    lookback_days: int = 0


def _train_torch_binary_model(
    model: nn.Module,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    epochs: int = 8,
    lr: float = 0.0015,
) -> tuple[nn.Module, np.ndarray]:
    model = model.to(DEVICE)
    optim = torch.optim.AdamW(model.parameters(), lr=lr)
    loss_fn = nn.BCEWithLogitsLoss()

    x_train = torch.tensor(X_train, dtype=torch.float32, device=DEVICE)
    y_train_t = torch.tensor(y_train.astype(np.float32), dtype=torch.float32, device=DEVICE)

    for _ in range(epochs):
        model.train()
        optim.zero_grad()
        logits = model(x_train)
        loss = loss_fn(logits, y_train_t)
        loss.backward()
        optim.step()

    model.eval()
    with torch.no_grad():
        x_val = torch.tensor(X_val, dtype=torch.float32, device=DEVICE)
        logits_val = model(x_val)
        probs = torch.sigmoid(logits_val).cpu().numpy()
    return model, probs


def _safe_prob(model: Any, X: np.ndarray) -> np.ndarray:
    prob = model.predict_proba(X)
    if prob.ndim == 2 and prob.shape[1] > 1:
        return prob[:, 1]
    return prob.reshape(-1)


def _regime_adjustment(regime_series: pd.Series, y_true: np.ndarray, y_prob: np.ndarray) -> dict[str, float]:
    table: dict[str, float] = {"Bull": 0.0, "Bear": 0.0, "Sideways": 0.0}
    if len(regime_series) != len(y_true):
        return table

    for regime in table.keys():
        idx = regime_series == regime
        if idx.sum() < 12:
            continue
        regime_truth = y_true[idx.to_numpy()]
        regime_prob = y_prob[idx.to_numpy()]
        pred = (regime_prob >= 0.5).astype(int)
        hit = accuracy_score(regime_truth, pred)
        table[regime] = float(np.clip((hit - 0.5) * 0.12, -0.06, 0.06))
    return table


def train_ensemble(
    feature_sets: list[FeatureSet],
    horizon: str,
    symbols: list[str],
    sequence_length: int,
    lookback_days: int,
    fast_mode: bool = False,
) -> EnsembleArtifact:
    if not feature_sets:
        raise ValueError("No feature sets supplied")

    frames = [fs.frame for fs in feature_sets]
    all_frame = pd.concat(frames, ignore_index=True).sort_values("timestamp").reset_index(drop=True)
    X = np.vstack([fs.X for fs in feature_sets])
    y = np.concatenate([fs.y for fs in feature_sets])

    if len(X) < 320:
        raise ValueError("Not enough training samples for robust ensemble")

    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    models: dict[str, Any] = {}
    val_probs: dict[str, np.ndarray] = {}
    metrics: dict[str, dict[str, float]] = {}

    lr_model = LogisticRegression(max_iter=350 if fast_mode else 500, class_weight="balanced")
    lr_model.fit(X_train_scaled, y_train)
    models["logreg"] = lr_model
    val_probs["logreg"] = _safe_prob(lr_model, X_val_scaled)

    rf_model = RandomForestClassifier(
        n_estimators=120 if fast_mode else 280,
        max_depth=6 if fast_mode else 7,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=-1,
    )
    rf_model.fit(X_train, y_train)
    models["random_forest"] = rf_model
    val_probs["random_forest"] = _safe_prob(rf_model, X_val)

    if xgb is not None and not fast_mode:
        xgb_model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.85,
            eval_metric="logloss",
            random_state=42,
        )
        xgb_model.fit(X_train, y_train)
        models["xgboost"] = xgb_model
        val_probs["xgboost"] = _safe_prob(xgb_model, X_val)

    if lgb is not None and not fast_mode:
        lgb_model = lgb.LGBMClassifier(
            n_estimators=320,
            learning_rate=0.05,
            max_depth=7,
            subsample=0.9,
            colsample_bytree=0.85,
            random_state=42,
        )
        lgb_model.fit(X_train, y_train)
        models["lightgbm"] = lgb_model
        val_probs["lightgbm"] = _safe_prob(lgb_model, X_val)

    # Build sequence datasets across symbols for deep models.
    seq_train_parts: list[np.ndarray] = []
    seq_train_y: list[np.ndarray] = []
    seq_val_parts: list[np.ndarray] = []
    seq_val_y: list[np.ndarray] = []
    for fs in feature_sets:
        scaled = scaler.transform(fs.X)
        try:
            seq_X, seq_y = create_sequences(scaled, fs.y, sequence_length)
        except ValueError:
            continue
        local_split = int(len(seq_X) * 0.8)
        seq_train_parts.append(seq_X[:local_split])
        seq_train_y.append(seq_y[:local_split])
        seq_val_parts.append(seq_X[local_split:])
        seq_val_y.append(seq_y[local_split:])

    if seq_train_parts and seq_val_parts and not fast_mode:
        seq_train = np.vstack(seq_train_parts)
        seq_train_target = np.concatenate(seq_train_y)
        seq_val = np.vstack(seq_val_parts)
        seq_val_target = np.concatenate(seq_val_y)

        lstm = LSTMClassifier(input_size=X.shape[1])
        lstm, lstm_prob = _train_torch_binary_model(lstm, seq_train, seq_train_target, seq_val, epochs=8)
        models["lstm"] = lstm
        val_probs["lstm"] = lstm_prob[: len(y_val)]

        transformer = TransformerClassifier(input_size=X.shape[1], seq_len=sequence_length)
        transformer, tr_prob = _train_torch_binary_model(
            transformer, seq_train, seq_train_target, seq_val, epochs=8, lr=0.0012
        )
        models["transformer"] = transformer
        val_probs["transformer"] = tr_prob[: len(y_val)]

    if not val_probs:
        raise ValueError("No model validation probabilities available")

    common_size = min(len(y_val), *[len(prob) for prob in val_probs.values()])
    if common_size < 40:
        raise ValueError("Insufficient aligned validation samples for ensemble calibration")

    y_val_aligned = y_val[-common_size:]
    model_scores: dict[str, float] = {}
    for name, prob in val_probs.items():
        clipped = np.clip(prob[-common_size:], 1e-5, 1 - 1e-5)
        pred = (clipped >= 0.5).astype(int)
        acc = accuracy_score(y_val_aligned, pred)
        brier = brier_score_loss(y_val_aligned, clipped)
        model_scores[name] = max(0.001, (acc - 0.45) / (brier + 1e-5))
        metrics[name] = {
            "accuracy": float(acc),
            "brier": float(brier),
            "mae": float(mean_absolute_error(y_val_aligned, clipped)),
            "rmse": float(np.sqrt(mean_squared_error(y_val_aligned, clipped))),
        }

    weight_sum = sum(model_scores.values())
    weights = {name: float(score / weight_sum) for name, score in model_scores.items()}

    stacked_raw = np.zeros(common_size)
    for name, weight in weights.items():
        stacked_raw += np.clip(val_probs[name][-common_size:], 1e-5, 1 - 1e-5) * weight

    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(stacked_raw, y_val_aligned)
    calibrated_val = calibrator.predict(stacked_raw)

    prob_true, prob_pred = calibration_curve(y_val_aligned, calibrated_val, n_bins=10, strategy="uniform")
    calibration_points: list[dict[str, float | int]] = []
    for i in range(len(prob_true)):
        bin_value = float(prob_pred[i])
        count = int(np.sum((calibrated_val >= bin_value - 0.05) & (calibrated_val <= bin_value + 0.05)))
        calibration_points.append(
            {
                "probability_bin": round(bin_value, 4),
                "observed_frequency": round(float(prob_true[i]), 4),
                "count": count,
            }
        )

    agreement_floor = float(np.clip(0.52 + np.std(stacked_raw) * 0.08, 0.5, 0.64))
    directional_threshold = float(np.clip(0.52 + (0.6 - accuracy_score(y_val_aligned, (calibrated_val >= 0.5).astype(int))) * 0.4, 0.5, 0.62))

    val_regime = all_frame.iloc[-common_size:]["regime"] if "regime" in all_frame.columns else pd.Series(["Sideways"] * common_size)
    regime_adjustment = _regime_adjustment(val_regime, y_val_aligned, calibrated_val)

    return EnsembleArtifact(
        horizon=horizon,
        symbols=symbols,
        feature_names=feature_sets[0].feature_names,
        scaler=scaler,
        models=models,
        weights=weights,
        calibrator=calibrator,
        calibration_points=calibration_points,
        model_metrics=metrics,
        agreement_floor=agreement_floor,
        directional_threshold=directional_threshold,
        regime_adjustment=regime_adjustment,
        sequence_length=sequence_length,
        lookback_days=lookback_days,
    )


def _predict_model_probability(
    name: str,
    model: Any,
    artifact: EnsembleArtifact,
    feature_frame: pd.DataFrame,
) -> float:
    X = feature_frame[artifact.feature_names].to_numpy(dtype=np.float64)
    if len(X) == 0:
        return 0.5

    X_last = X[-1:].copy()

    if name in ("logreg",):
        X_last_scaled = artifact.scaler.transform(X_last)
        return float(_safe_prob(model, X_last_scaled)[-1])
    if name in ("random_forest", "xgboost", "lightgbm"):
        return float(_safe_prob(model, X_last)[-1])
    if name in ("lstm", "transformer"):
        if len(X) < artifact.sequence_length:
            return 0.5
        seq = artifact.scaler.transform(X[-artifact.sequence_length :])
        tensor = torch.tensor(seq[np.newaxis, :, :], dtype=torch.float32, device=DEVICE)
        model.eval()
        with torch.no_grad():
            logit = model(tensor)
            prob = torch.sigmoid(logit).cpu().numpy().reshape(-1)[0]
        return float(prob)
    return 0.5


def predict_from_artifact(
    artifact: EnsembleArtifact,
    feature_frame: pd.DataFrame,
    regime_state: RegimeState,
) -> dict[str, Any]:
    model_probs: dict[str, float] = {}
    for name, model in artifact.models.items():
        model_probs[name] = _predict_model_probability(name, model, artifact, feature_frame)

    weighted_raw = 0.0
    for name, prob in model_probs.items():
        weighted_raw += artifact.weights.get(name, 0.0) * prob

    calibrated = float(artifact.calibrator.predict(np.array([weighted_raw]))[0])
    calibrated += artifact.regime_adjustment.get(regime_state.regime, 0.0)
    calibrated = float(np.clip(calibrated, 0.01, 0.99))

    direction = "Neutral"
    up_threshold = artifact.directional_threshold
    down_threshold = 1 - artifact.directional_threshold
    if calibrated >= up_threshold:
        direction = "Bullish"
    elif calibrated <= down_threshold:
        direction = "Bearish"

    probs = np.array(list(model_probs.values()))
    agreement = float(np.clip(1 - (probs.std() / 0.5), 0.0, 1.0))
    confidence = float(np.clip(abs(calibrated - 0.5) * 2 * 100 * (0.6 + 0.4 * agreement), 1, 99))

    expected_return_pct = float((calibrated - 0.5) * 2 * (0.45 + regime_state.volatility))
    uncertainty = float(np.clip(probs.std() * 1.96, 0.02, 0.25))
    ci_low = float(np.clip(expected_return_pct - uncertainty, -0.5, 0.5))
    ci_high = float(np.clip(expected_return_pct + uncertainty, -0.5, 0.5))

    return {
        "direction": direction,
        "probability_up": calibrated,
        "confidence": confidence,
        "expected_return_pct": expected_return_pct * 100,
        "confidence_interval_pct": (ci_low * 100, ci_high * 100),
        "model_votes": model_probs,
        "model_weights": artifact.weights,
        "agreement_score": agreement * 100,
        "direction_threshold": artifact.directional_threshold,
    }


def explain_artifact_prediction(
    artifact: EnsembleArtifact,
    feature_frame: pd.DataFrame,
    top_n: int = 10,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    X = feature_frame[artifact.feature_names].to_numpy(dtype=np.float64)
    X_scaled = artifact.scaler.transform(X)
    latest_scaled = X_scaled[-1]
    latest_raw = X[-1]

    importance_map: dict[str, float] = {name: 0.0 for name in artifact.feature_names}

    for model_name, model in artifact.models.items():
        weight = artifact.weights.get(model_name, 0.0)
        if model_name == "logreg" and hasattr(model, "coef_"):
            coeff = np.abs(model.coef_[0])
            for i, fname in enumerate(artifact.feature_names):
                importance_map[fname] += float(coeff[i] * weight)
        elif hasattr(model, "feature_importances_"):
            coeff = np.abs(model.feature_importances_)
            for i, fname in enumerate(artifact.feature_names):
                importance_map[fname] += float(coeff[i] * weight)

    ranked = sorted(importance_map.items(), key=lambda x: x[1], reverse=True)[:top_n]
    feature_importance = [
        {"feature": name, "importance": round(score, 6), "value": round(float(latest_raw[artifact.feature_names.index(name)]), 6)}
        for name, score in ranked
    ]

    shap_points: list[dict[str, Any]] = []
    if shap is not None:
        tree_model = artifact.models.get("xgboost") or artifact.models.get("lightgbm") or artifact.models.get("random_forest")
        if tree_model is not None:
            try:
                explainer = shap.Explainer(tree_model)
                shap_values = explainer(X[-min(200, len(X)) :])
                latest_values = shap_values.values[-1]
                for i, fname in enumerate(artifact.feature_names):
                    shap_points.append(
                        {
                            "feature": fname,
                            "shap": float(latest_values[i]),
                            "value": float(latest_raw[i]),
                        }
                    )
            except Exception:
                shap_points = []

    shap_points = sorted(shap_points, key=lambda item: abs(item["shap"]), reverse=True)[:top_n]
    model_agreement = {
        "agreement_score": round(float(np.clip(1 - np.std(list(artifact.weights.values())), 0, 1) * 100), 2),
        "weights": artifact.weights,
        "metrics": artifact.model_metrics,
    }

    return feature_importance, shap_points, model_agreement


def rolling_accuracy_series(y_true: np.ndarray, y_prob: np.ndarray, window: int) -> list[float]:
    if len(y_true) < window:
        return []
    series: list[float] = []
    for i in range(window, len(y_true) + 1):
        truth = y_true[i - window : i]
        prob = y_prob[i - window : i]
        pred = (prob >= 0.5).astype(int)
        series.append(round(float(accuracy_score(truth, pred) * 100), 2))
    return series


def regression_errors(y_true: np.ndarray, y_prob: np.ndarray) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(y_true, y_prob)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_prob))),
        "mape": float(np.mean(np.abs((y_true - y_prob) / np.clip(np.abs(y_true), 0.01, None))) * 100),
    }
