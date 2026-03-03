import { HistoricalData } from './marketDataService';
import { EMA, ATR, ADX } from 'technicalindicators';

export type MarketRegime = 'Bull' | 'Bear' | 'Choppy';

export class RegimeDetector {
  static detect(data: HistoricalData[]): MarketRegime {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const currentPrice = closes[closes.length - 1];

    if (!currentPrice) return 'Choppy'; // Safety check

    // Calculate Indicators
    const ema200Values = EMA.calculate({ values: closes, period: 200 });
    const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const adxValues = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });

    const lastEma200 = ema200Values[ema200Values.length - 1];
    const lastAtr = atrValues[atrValues.length - 1];
    const lastAdx = adxValues[adxValues.length - 1];

    if (!lastEma200 || !lastAtr) return 'Choppy'; // Fallback if not enough data

    // Volatility Threshold (e.g., ATR > 3% of price is High Volatility)
    const atrPercentage = lastAtr / currentPrice;
    const isHighVolatility = atrPercentage > 0.03;

    // ADX Threshold (ADX < 25 indicates weak/no trend, > 25 indicates trending)
    const adxValue = lastAdx?.adx || 0;
    const isTrending = adxValue > 25;

    // Regime Logic
    // If ADX is low (< 25), market is choppy/ranging regardless of price position
    if (!isTrending || isHighVolatility) {
      return 'Choppy';
    }

    // If trending, determine direction based on EMA 200
    if (currentPrice > lastEma200) {
      return 'Bull';
    } else {
      return 'Bear';
    }
  }
}
