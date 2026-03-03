I will implement the advanced prediction engine with strict adherence to your constraints, ensuring synthetic data is isolated to dev/testing and that the core logic relies on robust technical analysis and ensemble methods.

### 1. Data Layer & Isolation (Backend)
*   **Real Data Integration**: I will create `backend/src/services/marketDataService.ts` to fetch real OHLCV data. For this implementation, I will use a reliable free source (like Yahoo Finance via `yahoo-finance2`) or a robust scraper fallback if API keys are an issue.
*   **Synthetic Data Isolation**: I will flag synthetic data generation strictly for `NODE_ENV=development` or fallback scenarios, ensuring it never pollutes the production prediction pipeline.

### 2. Technical Analysis Engine
*   **Indicator Library**: I will implement a comprehensive `technicalAnalysis.ts` module with:
    *   **Trend**: SMA/EMA (50, 200), MACD.
    *   **Momentum**: RSI (14), Stochastic.
    *   **Volatility**: ATR, Bollinger Bands.
    *   **Volume**: VWAP (if intraday available) or OBV.
*   **Normalization**: All indicator outputs will be normalized to a `-1.0` (Bearish) to `+1.0` (Bullish) scale to ensure no single indicator dominates.

### 3. Market Regime Detection
*   I will implement a `RegimeDetector` class that classifies the market state *before* prediction:
    *   **Bull**: Price > 200 EMA & Low/Stable Volatility.
    *   **Bear**: Price < 200 EMA.
    *   **Choppy**: High ATR / Volatility Expansion.
*   **Dynamic Weighting**: The ensemble weights will shift based on the detected regime (e.g., prioritize Momentum in Bull markets, Mean Reversion in Choppy markets).

### 4. Ensemble Prediction Engine
*   **Voting Mechanism**: A weighted voting system that aggregates normalized signals.
*   **Conflict Penalty**: If signals diverge significantly (e.g., MACD Bullish vs. RSI Bearish), the overall confidence score will be heavily penalized.
*   **Confidence Bucketing**: Raw scores will be mapped to `Low`, `Medium`, `High` buckets based on signal agreement strength.

### 5. Output Formatting & Safety
*   **Strict Output Schema**: The API response will be sanitized to remove any "Buy/Sell" language.
    *   `direction`: "Bullish" | "Neutral" | "Bearish"
    *   `priceRange`: `{ low: number, high: number }` (Probabilistic bounds based on ATR)
    *   `confidence`: "Low" | "Medium" | "High"
*   **Metric Hiding**: Accuracy/RMSE metrics will be calculated internally for logging/validation but explicitly excluded from the public API response.

### 6. Validation (Walk-Forward)
*   I will implement a `Validator` class that runs a walk-forward test on the historical data available for the requested stock to sanity-check the model before returning a prediction.

### Implementation Steps
1.  **Setup Backend Services**: Install `yahoo-finance2` (or similar) and set up the data service.
2.  **Build Indicator Engine**: Implement the normalized technical indicators.
3.  **Build Prediction Logic**: Implement the Regime Detector and Ensemble Voter.
4.  **Refactor API Route**: Update `backend/src/routes/predictions.ts` to use this new engine instead of the mock service.
5.  **Frontend Cleanup**: Ensure frontend only displays the allowed "safe" outputs (Range, Direction, Confidence).
