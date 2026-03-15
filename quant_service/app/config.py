from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = Field(default="Kueberr Quant Engine", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8100, alias="APP_PORT")

    database_url: str = Field(
        default="sqlite+aiosqlite:///./kueberr_quant.db",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    enable_scheduled_retrain: bool = Field(default=False, alias="ENABLE_SCHEDULED_RETRAIN")
    retrain_interval_minutes: int = Field(default=180, alias="RETRAIN_INTERVAL_MINUTES")
    default_lookback_days: int = Field(default=900, alias="DEFAULT_LOOKBACK_DAYS")
    market_data_provider: str = Field(default="yahoo", alias="MARKET_DATA_PROVIDER")
    polygon_api_key: str | None = Field(default=None, alias="POLYGON_API_KEY")
    alpaca_api_key: str | None = Field(default=None, alias="ALPACA_API_KEY")
    alpaca_api_secret: str | None = Field(default=None, alias="ALPACA_API_SECRET")


settings = Settings()
