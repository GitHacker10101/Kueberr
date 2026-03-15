from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncIterator

from sqlalchemy import JSON, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings


class Base(DeclarativeBase):
    pass


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    horizon: Mapped[str] = mapped_column(String(16), index=True)
    symbols: Mapped[str] = mapped_column(Text)
    sample_size: Mapped[int] = mapped_column(Integer)
    directional_accuracy: Mapped[float] = mapped_column(Float)
    model_metrics: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PredictionSnapshot(Base):
    __tablename__ = "prediction_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(24), index=True)
    horizon: Mapped[str] = mapped_column(String(16), index=True)
    direction: Mapped[str] = mapped_column(String(16))
    probability_up: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    explanation: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    horizon: Mapped[str] = mapped_column(String(16), index=True)
    metric_name: Mapped[str] = mapped_column(String(32), index=True)
    metric_value: Mapped[float] = mapped_column(Float)
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class PortfolioTransaction(Base):
    __tablename__ = "portfolio_transactions"
    __table_args__ = (
        Index("ix_portfolio_transactions_user_created", "user_id", "created_at"),
        Index("ix_portfolio_transactions_user_symbol", "user_id", "symbol"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    symbol: Mapped[str] = mapped_column(String(24), index=True)
    side: Mapped[str] = mapped_column(String(8))
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    fees: Mapped[float] = mapped_column(Float, default=0.0)
    order_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(24), default="manual")
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class PortfolioPositionSnapshot(Base):
    __tablename__ = "portfolio_positions_snapshots"
    __table_args__ = (
        Index("ix_portfolio_positions_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"
    __table_args__ = (
        Index("ix_risk_snapshots_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    var_95: Mapped[float] = mapped_column(Float, default=0.0)
    cvar_95: Mapped[float] = mapped_column(Float, default=0.0)
    annual_vol: Mapped[float] = mapped_column(Float, default=0.0)
    beta_proxy: Mapped[float] = mapped_column(Float, default=0.0)
    max_drawdown: Mapped[float] = mapped_column(Float, default=0.0)
    concentration_hhi: Mapped[float] = mapped_column(Float, default=0.0)
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class StressRun(Base):
    __tablename__ = "stress_runs"
    __table_args__ = (
        Index("ix_stress_runs_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    scenarios: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class OptimizerRun(Base):
    __tablename__ = "optimizer_runs"
    __table_args__ = (
        Index("ix_optimizer_runs_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    constraints: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class PaperOrder(Base):
    __tablename__ = "paper_orders"
    __table_args__ = (
        Index("ix_paper_orders_user_created", "user_id", "created_at"),
        Index("ix_paper_orders_user_symbol", "user_id", "symbol"),
        Index("ix_paper_orders_user_status", "user_id", "status"),
        Index("ix_paper_orders_user_idempotency", "user_id", "idempotency_key"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    symbol: Mapped[str] = mapped_column(String(24), index=True)
    side: Mapped[str] = mapped_column(String(8))
    type: Mapped[str] = mapped_column(String(16))
    quantity: Mapped[float] = mapped_column(Float)
    limit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    stop_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    time_in_force: Mapped[str] = mapped_column(String(12), default="DAY")
    status: Mapped[str] = mapped_column(String(24), index=True)
    filled_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    avg_fill_price: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class PaperFill(Base):
    __tablename__ = "paper_fills"
    __table_args__ = (
        Index("ix_paper_fills_user_created", "user_id", "created_at"),
        Index("ix_paper_fills_user_symbol", "user_id", "symbol"),
        Index("ix_paper_fills_order", "order_id"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    order_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    symbol: Mapped[str] = mapped_column(String(24), index=True)
    side: Mapped[str] = mapped_column(String(8))
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    fee: Mapped[float] = mapped_column(Float, default=0.0)
    slippage_bps: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class OrderEvent(Base):
    __tablename__ = "order_events"
    __table_args__ = (
        Index("ix_order_events_user_created", "user_id", "created_at"),
        Index("ix_order_events_order", "order_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(32), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


def _build_engine():
    db_url = settings.database_url
    try:
        engine = create_async_engine(db_url, pool_pre_ping=True)
        return engine
    except Exception:
        fallback = "sqlite+aiosqlite:///./kueberr_quant.db"
        return create_async_engine(fallback, pool_pre_ping=True)


engine = _build_engine()
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    session = SessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
