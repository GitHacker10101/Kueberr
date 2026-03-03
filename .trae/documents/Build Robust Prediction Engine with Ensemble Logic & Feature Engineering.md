I will build a sophisticated, mathematically-driven Prediction Engine in TypeScript that replaces the static mocks with a dynamic, real-time simulation.

### 1. Historical Data Generation (`backend/src/services/historicalData.ts`)
*   **Geometric Brownian Motion (GBM)**: I will implement a generator that creates 365 days of OHLCV (Open, High, Low, Close, Volume) data for each stock.
*   **Sector Correlation**: Stocks in the same sector (e.g., Tech) will have correlated movements to ensure realism.
*   **Regime Simulation**: The data will include simulated "Bull", "Bear", and "Choppy" market regimes to test the model's robustness.

### 2. Advanced Feature Engineering (`backend/src/services/technicalAnalysis.ts`)
I will implement a library of technical indicators from scratch to ensure **no future data leakage**:
*   **Momentum**: RSI (7, 14, 21), Stochastic Oscillator.
*   **Trend**: SMA/EMA (20, 50, 200), MACD (12, 26, 9) with Histogram.
*   **Volatility**: Bollinger Bands (20, 2), ATR (14), Rolling Volatility.
*   **Volume**: VWAP (Volume Weighted Average Price).
*   **Lag Features**: Log returns for $t-1, t-3, t-5$.

### 3. Ensemble Prediction Model (`backend/src/services/predictionModel.ts`)
I will implement a 3-stage voting ensemble:
1.  **Trend Follower (Baseline)**: Uses Moving Averages and MACD to determine long-term direction.
2.  **Mean Reversion (Oscillator)**: Uses RSI and Bollinger Bands to catch overbought/oversold conditions.
3.  **Pattern Recognition (Simulated "ML")**: A decision-tree logic that weighs complex signal combinations (e.g., "RSI < 30 AND Volume > 2x Avg").
*   **Output**: A weighted "Confidence Score" (-100 to +100) and a probabilistic Price Range.

### 4. Robust Evaluation & Validation
*   **Walk-Forward Validation**: The model will "train" (calibrate) on the first 335 days and "test" on the last 30 days to generate an accuracy metric included in the response.
*   **Strict Constraints**: The output will be formatted as "Bullish/Neutral/Bearish" with a price range (e.g., ₹2800 - ₹2950) instead of a single number, with explicit confidence levels (Low/Medium/High).

### 5. Integration
*   Update `backend/src/routes/predictions.ts` to use this new engine.
*   The frontend will display these calculated metrics, charts, and ranges.
