import { SMA, EMA, RSI, MACD, BollingerBands, ATR, Stochastic, CCI, ADX } from 'technicalindicators';
import { HistoricalData } from './marketDataService';

export interface NormalizedIndicators {
  rsi: number; // -1 to 1
  macd: number; // -1 to 1
  trend: number; // -1 to 1 (EMA crossover)
  volatility: number; // 0 to 1 (Normalized ATR)
  bollingerPosition: number; // -1 to 1 (Position relative to bands)
  stochastic: number; // -1 to 1 (Normalized Stochastic)
  cci: number; // -1 to 1 (Normalized CCI)
  adx: number; // 0 to 1 (Trend strength)
  volumeMomentum: number; // -1 to 1 (Volume trend)
  priceVolumeStrength: number; // -1 to 1 (Combined price-volume signal)
  raw: {
    rsi: number;
    atr: number;
    currentPrice: number;
    stochasticK: number;
    stochasticD: number;
    cci: number;
    adx: number;
    macdValue: number;
    macdSignal: number;
    macdHistogram: number;
    bollingerUpper: number;
    bollingerMiddle: number;
    bollingerLower: number;
    ema50: number;
    ema200: number;
    volume: number;
    avgVolume: number;
    obv: number; // On-Balance Volume
  };
}

export const calculateIndicators = (data: HistoricalData[]): NormalizedIndicators => {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const currentPrice = closes[closes.length - 1];

  // 1. RSI (14)
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const lastRsi = rsiValues[rsiValues.length - 1] || 50;
  // Normalize RSI: (Val - 50) / 50 -> -1 to 1 (approx)
  let normRsi = (lastRsi - 50) / 25;
  normRsi = Math.max(-1, Math.min(1, normRsi));

  // 2. MACD (12, 26, 9)
  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const lastMacd = macdValues[macdValues.length - 1];
  let normMacd = 0;
  let rawMacdValue = 0;
  let rawMacdSignal = 0;
  let rawMacdHistogram = 0;
  if (lastMacd) {
    rawMacdValue = lastMacd.MACD || 0;
    rawMacdSignal = lastMacd.signal || 0;
    rawMacdHistogram = lastMacd.histogram || 0;
    // Normalize MACD histogram: value / (0.01 * price) to get relative strength
    const relativeHist = rawMacdHistogram / (currentPrice * 0.005);
    normMacd = Math.max(-1, Math.min(1, relativeHist));
  }

  // 3. Trend (EMA 50 vs EMA 200)
  const ema50 = EMA.calculate({ values: closes, period: 50 });
  const ema200 = EMA.calculate({ values: closes, period: 200 });
  const lastEma50 = ema50[ema50.length - 1] || currentPrice;
  const lastEma200 = ema200[ema200.length - 1] || currentPrice;

  let normTrend = 0;
  if (lastEma50 && lastEma200) {
    // Trend strength: relative distance between EMAs
    const diff = (lastEma50 - lastEma200) / lastEma200;
    // Normalize: 5% diff = full strength
    normTrend = Math.max(-1, Math.min(1, diff * 20));
  }

  // 4. Volatility (ATR 14)
  const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
  const lastAtr = atrValues[atrValues.length - 1] || 0;
  // Normalize ATR as percentage of price
  const atrPercent = lastAtr / currentPrice;
  const normVolatility = Math.min(1, atrPercent * 50); // 2% daily move = 1.0 volatility score

  // 5. Bollinger Bands (20, 2)
  const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
  const lastBb = bbValues[bbValues.length - 1];
  let normBb = 0;
  let rawBbUpper = currentPrice * 1.02;
  let rawBbMiddle = currentPrice;
  let rawBbLower = currentPrice * 0.98;
  if (lastBb) {
    rawBbUpper = lastBb.upper;
    rawBbMiddle = lastBb.middle;
    rawBbLower = lastBb.lower;
    // Position within bands: -1 (at lower) to +1 (at upper)
    const position = (currentPrice - lastBb.middle) / (lastBb.upper - lastBb.middle);
    normBb = Math.max(-1, Math.min(1, position));
  }

  // 6. Stochastic Oscillator (14, 3, 3)
  const stochValues = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3
  });
  const lastStoch = stochValues[stochValues.length - 1];
  let normStoch = 0;
  let rawStochK = 50;
  let rawStochD = 50;
  if (lastStoch) {
    rawStochK = lastStoch.k || 50;
    rawStochD = lastStoch.d || 50;
    // Normalize: (K - 50) / 50 -> -1 to 1
    normStoch = (rawStochK - 50) / 50;
    normStoch = Math.max(-1, Math.min(1, normStoch));
  }

  // 7. CCI (Commodity Channel Index) - 20 period
  const cciValues = CCI.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 20
  });
  const lastCci = cciValues[cciValues.length - 1] || 0;
  // Normalize CCI: typically ranges -200 to +200, we'll normalize to -1 to 1
  let normCci = lastCci / 200;
  normCci = Math.max(-1, Math.min(1, normCci));

  // 8. ADX (Average Directional Index) - 14 period for trend strength
  const adxValues = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14
  });
  const lastAdx = adxValues[adxValues.length - 1];
  let normAdx = 0;
  let rawAdx = 0;
  if (lastAdx) {
    rawAdx = lastAdx.adx || 0;
    // ADX ranges 0-100, normalize to 0-1
    // ADX > 25 indicates strong trend, > 50 very strong
    normAdx = Math.min(1, rawAdx / 50);
  }

  // 9. Volume Analysis
  const volumes = data.map(d => d.volume);
  const currentVolume = volumes[volumes.length - 1] || 0;

  // Calculate average volume (20-day)
  const volumeSMA = SMA.calculate({ values: volumes, period: 20 });
  const avgVolume = volumeSMA[volumeSMA.length - 1] || currentVolume;

  // On-Balance Volume (OBV) - Money flow indicator
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
  }

  // Volume Momentum: Compare recent volume to average
  const volumeRatio = currentVolume / (avgVolume || 1);
  // Normalize: 2x average volume = 1.0, 0.5x = -1.0
  let normVolumeMomentum = (volumeRatio - 1) * 2;
  normVolumeMomentum = Math.max(-1, Math.min(1, normVolumeMomentum));

  // Price-Volume Strength: Combine price movement with volume
  // Strong up move with high volume = 1, down move with high volume = -1
  const priceChange = closes.length > 1 ? (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2] : 0;
  const volumeStrength = volumeRatio > 1.2 ? 1 : volumeRatio < 0.8 ? -0.5 : 0;
  let normPriceVolumeStrength = priceChange * 100 * (1 + volumeStrength);
  normPriceVolumeStrength = Math.max(-1, Math.min(1, normPriceVolumeStrength));

  return {
    rsi: normRsi,
    macd: normMacd,
    trend: normTrend,
    volatility: normVolatility,
    bollingerPosition: normBb,
    stochastic: normStoch,
    cci: normCci,
    adx: normAdx,
    volumeMomentum: normVolumeMomentum,
    priceVolumeStrength: normPriceVolumeStrength,
    raw: {
      rsi: lastRsi,
      atr: lastAtr,
      currentPrice: currentPrice || 0,
      stochasticK: rawStochK,
      stochasticD: rawStochD,
      cci: lastCci,
      adx: rawAdx,
      macdValue: rawMacdValue,
      macdSignal: rawMacdSignal,
      macdHistogram: rawMacdHistogram,
      bollingerUpper: rawBbUpper,
      bollingerMiddle: rawBbMiddle,
      bollingerLower: rawBbLower,
      ema50: lastEma50 || 0,
      ema200: lastEma200 || 0,
      volume: currentVolume,
      avgVolume,
      obv
    }
  };
};
