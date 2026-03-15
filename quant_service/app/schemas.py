from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Horizon = Literal["daily", "weekly", "monthly"]


class TrainRequest(BaseModel):
    symbols: list[str] = Field(default_factory=lambda: ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"])
    horizon: Horizon = "monthly"
    lookback_days: int = Field(default=900, ge=365, le=5000)
    sequence_length: int = Field(default=30, ge=10, le=120)


class PredictRequest(BaseModel):
    symbol: str
    horizon: Horizon = "monthly"
    lookback_days: int = Field(default=900, ge=365, le=5000)
    sequence_length: int = Field(default=30, ge=10, le=120)


class BacktestRequest(BaseModel):
    symbols: list[str] = Field(default_factory=lambda: ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"])
    horizon: Horizon = "monthly"
    lookback_days: int = Field(default=1200, ge=500, le=6000)
    walk_forward_windows: int = Field(default=8, ge=4, le=24)
    transaction_cost_bps: float = Field(default=8.0, ge=0, le=200)
    slippage_bps: float = Field(default=6.0, ge=0, le=200)
    stop_loss_pct: float = Field(default=0.03, ge=0.002, le=0.25)
    take_profit_pct: float = Field(default=0.08, ge=0.005, le=0.5)


class ExplainRequest(BaseModel):
    symbol: str
    horizon: Horizon = "monthly"
    lookback_days: int = Field(default=1200, ge=500, le=6000)
    sequence_length: int = Field(default=30, ge=10, le=120)


class CalibrationPoint(BaseModel):
    probability_bin: float
    observed_frequency: float
    count: int


class PredictionResponse(BaseModel):
    symbol: str
    horizon: Horizon
    timestamp: datetime
    direction: Literal["Bullish", "Bearish", "Neutral"]
    probability_up: float
    confidence: float
    expected_return_pct: float
    confidence_interval_pct: tuple[float, float]
    regime: Literal["Bull", "Bear", "Sideways"]
    model_votes: dict[str, float]
    model_weights: dict[str, float]
    agreement_score: float
    reason: list[str]


class ExplainResponse(BaseModel):
    symbol: str
    horizon: Horizon
    generated_at: datetime
    feature_importance: list[dict]
    shap_values: list[dict]
    model_agreement: dict
    why_prediction: list[str]


class PortfolioTransactionRequest(BaseModel):
    user_id: str = Field(default="user-1", min_length=1)
    symbol: str = Field(min_length=1)
    side: Literal["BUY", "SELL"]
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    timestamp: datetime | None = None
    fees: float = Field(default=0.0, ge=0)


class PortfolioPositionsRequest(BaseModel):
    user_id: str = Field(default="user-1", min_length=1)


class StressScenario(BaseModel):
    type: Literal["market", "sector", "symbol", "vol-spike", "historical"]
    name: str | None = None
    shock: float = Field(default=-0.03)
    symbol: str | None = None
    symbols: list[str] = Field(default_factory=list)
    preset: str | None = None


class StressRunRequest(BaseModel):
    user_id: str = Field(default="user-1", min_length=1)
    scenarios: list[StressScenario] = Field(default_factory=list)


class RebalanceConstraints(BaseModel):
    max_weight: float = Field(default=0.30, ge=0.02, le=0.9)
    min_weight: float = Field(default=0.0, ge=0.0, le=0.9)
    turnover_limit: float = Field(default=0.35, ge=0.05, le=1.0)
    target_vol: float = Field(default=0.22, ge=0.05, le=1.0)
    cash_buffer: float = Field(default=0.05, ge=0.0, le=0.7)


class RebalanceRequest(BaseModel):
    user_id: str = Field(default="user-1", min_length=1)
    constraints: RebalanceConstraints = Field(default_factory=RebalanceConstraints)


class PaperOrderRequest(BaseModel):
    user_id: str = Field(default="user-1", min_length=1)
    symbol: str = Field(min_length=1)
    side: Literal["BUY", "SELL"]
    type: Literal["market", "limit", "stop", "stop_limit"] = "market"
    quantity: float = Field(gt=0)
    limit_price: float | None = Field(default=None, gt=0)
    stop_price: float | None = Field(default=None, gt=0)
    time_in_force: Literal["DAY", "GTC", "IOC"] = "DAY"
    timestamp: datetime | None = None
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=120)
