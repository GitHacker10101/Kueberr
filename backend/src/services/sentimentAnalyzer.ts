export interface SentimentResult {
  score: number; // -1 (Negative) to 1 (Positive)
  magnitude: number; // 0 to 1 (Intensity)
  sources: number; // Number of sources analyzed
  topKeywords: string[];
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export class SentimentAnalyzer {
  // Weighted financial lexicon.
  private static readonly wordWeights = new Map<string, number>([
    ['growth', 0.9],
    ['record', 1],
    ['gain', 0.7],
    ['rally', 1],
    ['surge', 1.1],
    ['beat', 0.9],
    ['profit', 0.8],
    ['upgrade', 0.9],
    ['buy', 0.7],
    ['positive', 0.6],
    ['strong', 0.6],
    ['outperform', 1.0],
    ['breakout', 1.0],
    ['momentum', 0.8],

    ['loss', -1.0],
    ['drop', -0.8],
    ['decline', -0.8],
    ['bear', -0.7],
    ['crash', -1.2],
    ['slump', -1.0],
    ['miss', -0.8],
    ['warn', -0.8],
    ['downgrade', -1.0],
    ['sell', -0.7],
    ['negative', -0.6],
    ['weak', -0.6],
    ['underperform', -1.0],
    ['recession', -1.1],
    ['resistance', -0.6],
  ]);

  private static readonly intensifiers = new Set([
    'very',
    'extremely',
    'strongly',
    'massively',
    'significantly',
    'highly',
  ]);

  private static readonly negations = new Set([
    'not',
    'no',
    'never',
    'hardly',
    'without',
  ]);

  private static toSentimentLabel(score: number): SentimentResult['sentiment'] {
    if (score > 0.12) return 'Bullish';
    if (score < -0.12) return 'Bearish';
    return 'Neutral';
  }

  /**
   * Analyze text/headlines using weighted lexicon with basic intensity and negation handling.
   */
  static analyzeText(text: string): SentimentResult {
    const tokens = text
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return { score: 0, magnitude: 0, sources: 1, topKeywords: [], sentiment: 'Neutral' };
    }

    let weightedScore = 0;
    let matches = 0;
    const weightedKeywords = new Map<string, number>();

    tokens.forEach((token, index) => {
      const baseWeight = this.wordWeights.get(token);
      if (baseWeight === undefined) return;

      let factor = 1;
      const prev = tokens[index - 1];
      const prev2 = tokens[index - 2];

      if (prev && this.intensifiers.has(prev)) factor *= 1.2;
      if ((prev && this.negations.has(prev)) || (prev2 && this.negations.has(prev2))) factor *= -1;

      const finalWeight = baseWeight * factor;
      weightedScore += finalWeight;
      matches += 1;
      weightedKeywords.set(token, (weightedKeywords.get(token) ?? 0) + Math.abs(finalWeight));
    });

    const normalizedScore = matches > 0 ? clamp(weightedScore / matches, -1, 1) : 0;
    const coverage = matches / tokens.length;
    const magnitude = clamp(Math.abs(normalizedScore) * 0.75 + coverage * 0.45, 0, 1);

    const topKeywords = Array.from(weightedKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);

    return {
      score: Number(normalizedScore.toFixed(3)),
      magnitude: Number(magnitude.toFixed(3)),
      sources: 1,
      topKeywords,
      sentiment: this.toSentimentLabel(normalizedScore),
    };
  }

  /**
   * Deterministic synthetic social sentiment (no per-request randomness).
   * Stable for the day + symbol so model behavior is reproducible.
   */
  static async getStockSentiment(symbol: string): Promise<SentimentResult> {
    await new Promise((resolve) => setTimeout(resolve, 15));

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - yearStart.getTime()) / 86400000);
    const symbolHash = symbol
      .toUpperCase()
      .split('')
      .reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);

    const raw = Math.sin(symbolHash * 0.017 + dayOfYear * 0.11) + Math.cos(symbolHash * 0.009 + dayOfYear * 0.07);
    const normalizedScore = clamp(raw / 2.2, -1, 1);
    const magnitude = clamp(0.42 + Math.abs(normalizedScore) * 0.48, 0, 1);
    const sources = 120 + Math.abs(symbolHash % 380);

    const bullishKeywords = ['growth', 'momentum', 'breakout', 'upgrade', 'accumulation'];
    const bearishKeywords = ['resistance', 'downgrade', 'distribution', 'weakness', 'drawdown'];
    const neutralKeywords = ['consolidation', 'range', 'wait', 'mixed', 'rotation'];

    const topKeywords =
      normalizedScore > 0.12
        ? bullishKeywords
        : normalizedScore < -0.12
          ? bearishKeywords
          : neutralKeywords;

    return {
      score: Number(normalizedScore.toFixed(3)),
      magnitude: Number(magnitude.toFixed(3)),
      sources,
      topKeywords: topKeywords.slice(0, 5),
      sentiment: this.toSentimentLabel(normalizedScore),
    };
  }

  /**
   * Aggregate multiple sentiment sources by source-count weighted average.
   */
  static aggregateSentiment(results: SentimentResult[]): SentimentResult {
    if (results.length === 0) {
      return { score: 0, magnitude: 0, sources: 0, topKeywords: [], sentiment: 'Neutral' };
    }

    const totalSources = results.reduce((acc, result) => acc + Math.max(1, result.sources), 0);
    const weightedScore =
      results.reduce((acc, result) => acc + result.score * Math.max(1, result.sources), 0) /
      Math.max(1, totalSources);
    const avgMagnitude = results.reduce((acc, result) => acc + result.magnitude, 0) / results.length;

    const keywordScore = new Map<string, number>();
    results.forEach((result) => {
      const sourceWeight = Math.max(1, result.sources);
      result.topKeywords.forEach((keyword) => {
        keywordScore.set(keyword, (keywordScore.get(keyword) ?? 0) + sourceWeight);
      });
    });

    const topKeywords = Array.from(keywordScore.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);

    return {
      score: Number(clamp(weightedScore, -1, 1).toFixed(3)),
      magnitude: Number(clamp(avgMagnitude, 0, 1).toFixed(3)),
      sources: totalSources,
      topKeywords,
      sentiment: this.toSentimentLabel(weightedScore),
    };
  }
}
