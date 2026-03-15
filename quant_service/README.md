# Kueberr Quant Engine (FastAPI)

AI-driven stock intelligence backend with:
- Multi-model architecture: LSTM, Transformer, XGBoost, LightGBM, Random Forest, Logistic Regression
- Dynamic weighted stacking + calibration
- Regime detection (Bull/Bear/Sideways + volatility clustering)
- Walk-forward backtesting with transaction/slippage/SL-TP simulation
- Explainability: feature importance, SHAP, agreement metrics
- PostgreSQL-ready persistence + Redis cache

## 1) Setup

```bash
cd quant_service
python -m pip install -r requirements.txt
copy .env.example .env
```

## 2) Infra (Postgres + Redis)

```bash
docker compose up -d
```

## 3) Run API

```bash
python run.py
```

Open docs: `http://localhost:8100/docs`

## Core endpoints

- `POST /api/v1/train`
- `POST /api/v1/predict`
- `POST /api/v1/explain`
- `POST /api/v1/backtest`
- `GET /api/v1/correlation`
- `POST /api/v1/portfolio/risk`
- `GET /api/v1/training/runs`

## Trust policy

All outputs are probabilistic. No guaranteed returns. Use metrics, confidence intervals, and backtest diagnostics to assess edge quality.

