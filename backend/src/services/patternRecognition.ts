export interface Pattern {
  name: string;
  type: 'Bullish' | 'Bearish' | 'Neutral';
  significance: 'Low' | 'Medium' | 'High';
  confidence: number; // 0 to 1
  description: string;
}

interface SwingPoint {
  index: number;
  price: number;
  kind: 'peak' | 'trough';
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class PatternRecognizer {
  /**
   * Detects chart patterns from price history.
   * Input must be chronological (oldest -> newest).
   */
  static detectPatterns(prices: number[]): Pattern[] {
    const clean = prices.filter((value) => Number.isFinite(value) && value > 0);
    if (clean.length < 40) return [];

    const recent = clean.slice(-180);
    const swings = this.findSwingPoints(recent, 2, 0.004);
    const patterns: Pattern[] = [];

    const doubleBottom = this.detectDoubleBottom(recent, swings);
    if (doubleBottom) patterns.push(doubleBottom);

    const doubleTop = this.detectDoubleTop(recent, swings);
    if (doubleTop) patterns.push(doubleTop);

    const headAndShoulders = this.detectHeadAndShoulders(recent, swings);
    if (headAndShoulders) patterns.push(headAndShoulders);

    const breakout = this.detectRangeBreakout(recent);
    if (breakout) patterns.push(breakout);

    const squeeze = this.detectVolatilitySqueeze(recent);
    if (squeeze) patterns.push(squeeze);

    return this.dedupeByName(patterns);
  }

  private static dedupeByName(patterns: Pattern[]): Pattern[] {
    const byName = new Map<string, Pattern>();

    patterns.forEach((pattern) => {
      const existing = byName.get(pattern.name);
      if (!existing || pattern.confidence > existing.confidence) {
        byName.set(pattern.name, pattern);
      }
    });

    return Array.from(byName.values()).sort((a, b) => b.confidence - a.confidence);
  }

  private static findSwingPoints(
    prices: number[],
    lookback: number = 2,
    minProminencePct: number = 0.004
  ): SwingPoint[] {
    const points: SwingPoint[] = [];

    for (let i = lookback; i < prices.length - lookback; i += 1) {
      const center = prices[i];
      if (!center) continue;

      let isPeak = true;
      let isTrough = true;
      let localMax = center;
      let localMin = center;

      for (let j = i - lookback; j <= i + lookback; j += 1) {
        if (j === i) continue;
        const value = prices[j];
        if (value === undefined) continue;
        localMax = Math.max(localMax, value);
        localMin = Math.min(localMin, value);
        if (center <= value) isPeak = false;
        if (center >= value) isTrough = false;
      }

      const localProminence = (localMax - localMin) / center;
      if (localProminence < minProminencePct) continue;

      if (isPeak) {
        points.push({ index: i, price: center, kind: 'peak' });
      } else if (isTrough) {
        points.push({ index: i, price: center, kind: 'trough' });
      }
    }

    return points;
  }

  private static detectDoubleBottom(prices: number[], swings: SwingPoint[]): Pattern | null {
    const troughs = swings.filter((point) => point.kind === 'trough');
    if (troughs.length < 2) return null;

    const latest = troughs[troughs.length - 1];
    const previous = troughs[troughs.length - 2];
    if (!latest || !previous) return null;

    const separation = latest.index - previous.index;
    if (separation < 5 || separation > 45) return null;

    const priceSimilarity = Math.abs(latest.price - previous.price) / ((latest.price + previous.price) / 2);
    if (priceSimilarity > 0.03) return null;

    const middleSlice = prices.slice(previous.index, latest.index + 1);
    if (middleSlice.length < 3) return null;

    const neckline = Math.max(...middleSlice);
    const valley = Math.min(previous.price, latest.price);
    const reboundStrength = (neckline - valley) / valley;
    if (reboundStrength < 0.025) return null;

    const currentPrice = prices[prices.length - 1];
    if (!currentPrice) return null;

    const breakoutProgress = clamp((currentPrice - valley) / Math.max(1e-9, neckline - valley), 0, 1.2);
    const confidence = clamp(0.62 + (1 - priceSimilarity / 0.03) * 0.18 + breakoutProgress * 0.14, 0.55, 0.92);

    return {
      name: 'Double Bottom',
      type: 'Bullish',
      significance: confidence >= 0.8 ? 'High' : 'Medium',
      confidence: Number(confidence.toFixed(2)),
      description: 'Two comparable swing lows with rebound structure suggest support and reversal potential.',
    };
  }

  private static detectDoubleTop(prices: number[], swings: SwingPoint[]): Pattern | null {
    const peaks = swings.filter((point) => point.kind === 'peak');
    if (peaks.length < 2) return null;

    const latest = peaks[peaks.length - 1];
    const previous = peaks[peaks.length - 2];
    if (!latest || !previous) return null;

    const separation = latest.index - previous.index;
    if (separation < 5 || separation > 45) return null;

    const priceSimilarity = Math.abs(latest.price - previous.price) / ((latest.price + previous.price) / 2);
    if (priceSimilarity > 0.03) return null;

    const middleSlice = prices.slice(previous.index, latest.index + 1);
    if (middleSlice.length < 3) return null;

    const neckline = Math.min(...middleSlice);
    const crest = Math.max(previous.price, latest.price);
    const rejectionDepth = (crest - neckline) / crest;
    if (rejectionDepth < 0.025) return null;

    const currentPrice = prices[prices.length - 1];
    if (!currentPrice) return null;

    const breakdownProgress = clamp((crest - currentPrice) / Math.max(1e-9, crest - neckline), 0, 1.2);
    const confidence = clamp(0.62 + (1 - priceSimilarity / 0.03) * 0.18 + breakdownProgress * 0.14, 0.55, 0.92);

    return {
      name: 'Double Top',
      type: 'Bearish',
      significance: confidence >= 0.8 ? 'High' : 'Medium',
      confidence: Number(confidence.toFixed(2)),
      description: 'Two comparable swing highs with rejection indicate overhead supply and downside risk.',
    };
  }

  private static detectHeadAndShoulders(prices: number[], swings: SwingPoint[]): Pattern | null {
    const peaks = swings.filter((point) => point.kind === 'peak');
    const troughs = swings.filter((point) => point.kind === 'trough');
    if (peaks.length < 3 || troughs.length < 2) return null;

    const p1 = peaks[peaks.length - 3];
    const p2 = peaks[peaks.length - 2];
    const p3 = peaks[peaks.length - 1];
    if (!p1 || !p2 || !p3) return null;

    if (!(p1.index < p2.index && p2.index < p3.index)) return null;
    if (p2.price <= p1.price * 1.02 || p2.price <= p3.price * 1.02) return null;

    const shoulderSymmetry = Math.abs(p1.price - p3.price) / ((p1.price + p3.price) / 2);
    if (shoulderSymmetry > 0.05) return null;

    const between12 = troughs.filter((t) => t.index > p1.index && t.index < p2.index);
    const between23 = troughs.filter((t) => t.index > p2.index && t.index < p3.index);
    if (between12.length === 0 || between23.length === 0) return null;

    const t1 = between12[between12.length - 1];
    const t2 = between23[0];
    if (!t1 || !t2) return null;

    const neckline = (t1.price + t2.price) / 2;
    const currentPrice = prices[prices.length - 1];
    if (!currentPrice || currentPrice > p3.price) return null;

    const breakdownProgress = clamp((neckline - currentPrice) / Math.max(1e-9, neckline), -0.2, 0.3);
    const confidence = clamp(
      0.58 + (1 - shoulderSymmetry / 0.05) * 0.18 + Math.max(0, breakdownProgress) * 1.2,
      0.5,
      0.9
    );

    return {
      name: 'Head and Shoulders',
      type: 'Bearish',
      significance: confidence >= 0.78 ? 'High' : 'Medium',
      confidence: Number(confidence.toFixed(2)),
      description: 'Three-peak reversal with higher head and neckline vulnerability indicates bearish reversal risk.',
    };
  }

  private static detectRangeBreakout(prices: number[]): Pattern | null {
    if (prices.length < 30) return null;

    const lookback = prices.slice(-26, -1);
    const current = prices[prices.length - 1];
    if (!current || lookback.length === 0) return null;

    const recentHigh = Math.max(...lookback);
    const recentLow = Math.min(...lookback);
    const rangeWidthPct = (recentHigh - recentLow) / Math.max(1e-9, recentLow);

    if (current > recentHigh * 1.004) {
      const strength = clamp((current - recentHigh) / Math.max(1e-9, recentHigh * 0.02), 0, 1);
      const confidence = clamp(0.64 + strength * 0.24 + Math.max(0, 0.04 - rangeWidthPct) * 2, 0.56, 0.9);
      return {
        name: 'Range Breakout',
        type: 'Bullish',
        significance: confidence >= 0.8 ? 'High' : 'Medium',
        confidence: Number(confidence.toFixed(2)),
        description: 'Price has cleared the recent range high with expansion, supporting bullish continuation.',
      };
    }

    if (current < recentLow * 0.996) {
      const strength = clamp((recentLow - current) / Math.max(1e-9, recentLow * 0.02), 0, 1);
      const confidence = clamp(0.64 + strength * 0.24 + Math.max(0, 0.04 - rangeWidthPct) * 2, 0.56, 0.9);
      return {
        name: 'Range Breakdown',
        type: 'Bearish',
        significance: confidence >= 0.8 ? 'High' : 'Medium',
        confidence: Number(confidence.toFixed(2)),
        description: 'Price has broken below the recent range floor, indicating downside continuation risk.',
      };
    }

    return null;
  }

  private static detectVolatilitySqueeze(prices: number[]): Pattern | null {
    if (prices.length < 22) return null;

    const shortWindow = prices.slice(-10);
    const longWindow = prices.slice(-22, -2);
    const shortStd = this.calculateStdDev(shortWindow);
    const longStd = this.calculateStdDev(longWindow);
    const avgPrice = shortWindow.reduce((a, b) => a + b, 0) / shortWindow.length;
    if (!avgPrice || longStd <= 0) return null;

    const compressionRatio = shortStd / longStd;
    const relativeVol = shortStd / avgPrice;
    if (compressionRatio > 0.72 || relativeVol > 0.014) return null;

    const confidence = clamp(0.54 + (0.72 - compressionRatio) * 0.4 + (0.014 - relativeVol) * 8, 0.52, 0.82);
    return {
      name: 'Volatility Squeeze',
      type: 'Neutral',
      significance: confidence >= 0.72 ? 'Medium' : 'Low',
      confidence: Number(confidence.toFixed(2)),
      description: 'Volatility compression suggests a pending expansion move; wait for directional confirmation.',
    };
  }

  private static calculateStdDev(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;
    return Math.sqrt(variance);
  }
}
