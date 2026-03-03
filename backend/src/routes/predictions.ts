import express from 'express';
import { fetchMarketData } from '../services/marketDataService';
import { calculateIndicators } from '../services/technicalAnalysis';
import { RegimeDetector } from '../services/regimeDetector';
import { EnsembleEngine } from '../services/ensembleEngine';

const router = express.Router();

// GET /api/predictions/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    // 1. Fetch Real Data (with cache & rate limit)
    // Fetch 300 days to ensure enough data for 200 EMA
    const marketData = await fetchMarketData(symbol, 300);

    if (!marketData || marketData.length < 200) {
      return res.status(404).json({ error: 'Not enough historical data for analysis' });
    }

    // 2. Calculate Indicators (Normalized)
    const indicators = calculateIndicators(marketData);

    // 3. Detect Market Regime
    const regime = RegimeDetector.detect(marketData);

    // 4. Run Ensemble Prediction
    const prediction = EnsembleEngine.predict(indicators, regime);

    // 5. Calculate Price Range (Probabilistic based on ATR)
    const currentPrice = indicators.raw.currentPrice;
    const atr = indicators.raw.atr;
    const volatilityMultiplier = 2.0; // 95% confidence interval approx

    // Horizon: 5 Days
    const horizonDays = 5;
    const rangeWidth = atr * Math.sqrt(horizonDays) * volatilityMultiplier;

    const priceRange = {
      low: Number((currentPrice - rangeWidth).toFixed(2)),
      high: Number((currentPrice + rangeWidth).toFixed(2))
    };

    // 6. Calculate Support and Resistance levels
    const support = Number(Math.min(indicators.raw.bollingerLower, indicators.raw.ema50 * 0.98).toFixed(2));
    const resistance = Number(Math.max(indicators.raw.bollingerUpper, indicators.raw.ema50 * 1.02).toFixed(2));

    // 7. Construct Enhanced Response
    const response = {
      symbol: symbol.toUpperCase(),
      currentPrice,
      prediction: {
        direction: prediction.direction,
        confidence: prediction.confidence,
        confidenceScore: Math.round(prediction.signalStrength.overall * 100),
        horizon: '5 Days',
        priceRange,
        regime,
        reasoning: prediction.reasoning,
        signalStrength: {
          trend: Math.round(prediction.signalStrength.trend * 100),
          momentum: Math.round(prediction.signalStrength.momentum * 100),
          meanReversion: Math.round(prediction.signalStrength.meanReversion * 100)
        }
      },
      technicalIndicators: {
        rsi: {
          value: Number(indicators.raw.rsi.toFixed(2)),
          signal: indicators.raw.rsi > 70 ? 'Overbought' : indicators.raw.rsi < 30 ? 'Oversold' : 'Neutral'
        },
        macd: {
          value: Number(indicators.raw.macdValue.toFixed(2)),
          signal: Number(indicators.raw.macdSignal.toFixed(2)),
          histogram: Number(indicators.raw.macdHistogram.toFixed(2)),
          trend: indicators.raw.macdHistogram > 0 ? 'Bullish' : 'Bearish'
        },
        stochastic: {
          k: Number(indicators.raw.stochasticK.toFixed(2)),
          d: Number(indicators.raw.stochasticD.toFixed(2)),
          signal: indicators.raw.stochasticK > 80 ? 'Overbought' : indicators.raw.stochasticK < 20 ? 'Oversold' : 'Neutral'
        },
        cci: {
          value: Number(indicators.raw.cci.toFixed(2)),
          signal: indicators.raw.cci > 100 ? 'Overbought' : indicators.raw.cci < -100 ? 'Oversold' : 'Neutral'
        },
        adx: {
          value: Number(indicators.raw.adx.toFixed(2)),
          strength: indicators.raw.adx > 50 ? 'Very Strong' : indicators.raw.adx > 25 ? 'Strong' : 'Weak'
        },
        bollingerBands: {
          upper: Number(indicators.raw.bollingerUpper.toFixed(2)),
          middle: Number(indicators.raw.bollingerMiddle.toFixed(2)),
          lower: Number(indicators.raw.bollingerLower.toFixed(2)),
          position: indicators.bollingerPosition > 0.5 ? 'Upper Band' : indicators.bollingerPosition < -0.5 ? 'Lower Band' : 'Middle'
        },
        movingAverages: {
          ema50: Number(indicators.raw.ema50.toFixed(2)),
          ema200: Number(indicators.raw.ema200.toFixed(2)),
          trend: indicators.raw.ema50 > indicators.raw.ema200 ? 'Bullish' : 'Bearish'
        },
        volatility: {
          atr: Number(indicators.raw.atr.toFixed(2)),
          atrPercent: ((indicators.raw.atr / currentPrice) * 100).toFixed(2) + '%',
          level: indicators.volatility > 0.7 ? 'High' : indicators.volatility > 0.4 ? 'Medium' : 'Low'
        }
      },
      levels: {
        support,
        resistance,
        currentTrend: indicators.raw.ema50 > indicators.raw.ema200 ? 'Uptrend' : 'Downtrend'
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Prediction Error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

export default router;

