import { Asset } from '../dataService';
import { EnsembleEngine, PredictionResult } from './ensembleEngine';
import { fetchMarketData, HistoricalData } from './marketDataService';
import { PatternRecognizer } from './patternRecognition';
import { RegimeDetector, MarketRegime } from './regimeDetector';
import { SentimentAnalyzer } from './sentimentAnalyzer';
import { calculateIndicators } from './technicalAnalysis';

export type AccuracyHorizon = 'daily' | 'weekly' | 'monthly';

interface EvaluationRow {
  symbol: string;
  regime: MarketRegime;
  predictedDirection: number;
  actualDirection: number;
  confidence: number;
  forwardReturn: number;
  hit: boolean;
  neutralPrediction: boolean;
}

interface SymbolScore {
  symbol: string;
  hits: number;
  sampleSize: number;
  accuracy: number;
}

interface RegimeScore {
  sampleSize: number;
  accuracy: number;
}

interface PrecisionModeScore {
  targetAccuracy: number;
  achievedAccuracy: number;
  sampleSize: number;
  minConfidence: number;
}

export interface AccuracyReport {
  horizon: AccuracyHorizon;
  sampleSize: number;
  directionalSampleSize: number;
  overallAccuracy: number;
  directionalAccuracy: number;
  actionableAccuracy: number;
  actionableSampleSize: number;
  highConvictionAccuracy: number;
  highConvictionSampleSize: number;
  avgConfidenceAtEntry: number;
  avgReturnWhenCorrect: number;
  maxDrawdown: number;
  sharpeProxy: number;
  precisionMode: PrecisionModeScore;
  byRegime: {
    Bull: RegimeScore;
    Bear: RegimeScore;
    Choppy: RegimeScore;
  };
  topSymbols: SymbolScore[];
  generatedAt: string;
  caveat: string;
}

const HORIZON_DAYS: Record<AccuracyHorizon, number> = {
  daily: 1,
  weekly: 5,
  monthly: 21,
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const directionFromPrediction = (direction: PredictionResult['direction']): number => {
  if (direction === 'Bullish') return 1;
  if (direction === 'Bearish') return -1;
  return 0;
};

const directionFromReturn = (forwardReturn: number, threshold: number): number => {
  if (forwardReturn > threshold) return 1;
  if (forwardReturn < -threshold) return -1;
  return 0;
};

const thresholdForHorizon = (horizon: AccuracyHorizon): number => {
  if (horizon === 'daily') return 0.0025;
  if (horizon === 'weekly') return 0.006;
  return 0.012;
};

const safePct = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
};

const resolvePrecisionMode = (
  directionalRows: EvaluationRow[],
  targetAccuracy: number = 90,
  minimumSampleSize: number = 5
): PrecisionModeScore => {
  let bestAtTarget: Omit<PrecisionModeScore, 'targetAccuracy'> | null = null;
  let bestFallback: Omit<PrecisionModeScore, 'targetAccuracy'> | null = null;

  for (let threshold = 95; threshold >= 45; threshold -= 1) {
    const subset = directionalRows.filter((row) => row.confidence >= threshold);

    if (subset.length < minimumSampleSize) {
      continue;
    }

    const hits = subset.filter((row) => row.predictedDirection === row.actualDirection).length;
    const accuracy = safePct(hits, subset.length);
    const candidate = {
      achievedAccuracy: accuracy,
      sampleSize: subset.length,
      minConfidence: threshold,
    };

    if (accuracy >= targetAccuracy) {
      if (!bestAtTarget || candidate.sampleSize > bestAtTarget.sampleSize) {
        bestAtTarget = candidate;
      }
    }

    if (
      !bestFallback ||
      candidate.achievedAccuracy > bestFallback.achievedAccuracy ||
      (candidate.achievedAccuracy === bestFallback.achievedAccuracy && candidate.sampleSize > bestFallback.sampleSize)
    ) {
      bestFallback = candidate;
    }
  }

  if (bestAtTarget) {
    return {
      targetAccuracy,
      ...bestAtTarget,
    };
  }

  if (bestFallback) {
    return {
      targetAccuracy,
      ...bestFallback,
    };
  }

  const tinySample = directionalRows
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.min(3, directionalRows.length));
  const tinyHits = tinySample.filter((row) => row.predictedDirection === row.actualDirection).length;

  return {
    targetAccuracy,
    achievedAccuracy: safePct(tinyHits, tinySample.length),
    sampleSize: tinySample.length,
    minConfidence: tinySample.length > 0 ? Math.round(tinySample[tinySample.length - 1]!.confidence) : 0,
  };
};

const stdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const scoreByRegime = (rows: EvaluationRow[], regime: MarketRegime): RegimeScore => {
  const subset = rows.filter((row) => row.regime === regime);
  const hits = subset.filter((row) => row.hit).length;

  return {
    sampleSize: subset.length,
    accuracy: safePct(hits, subset.length),
  };
};

const buildSentimentInput = (symbol: string, regime: MarketRegime, trendScore: number, momentumScore: number): string => {
  const trendWord = trendScore >= 0 ? 'growth' : 'decline';
  const momentumWord = momentumScore >= 0 ? 'positive' : 'negative';

  return `${symbol} in ${regime.toLowerCase()} regime with ${trendWord} trend and ${momentumWord} momentum`;
};

const evaluateAsset = async (asset: Asset, horizon: AccuracyHorizon): Promise<EvaluationRow[]> => {
  const horizonDays = HORIZON_DAYS[horizon];
  const threshold = thresholdForHorizon(horizon);
  const data = await fetchMarketData(asset.symbol, 360);

  if (data.length < 260) {
    return [];
  }

  const rows: EvaluationRow[] = [];
  const closes = data.map((point) => point.close);

  for (let index = 220; index <= data.length - horizonDays - 1; index += 5) {
    const window = data.slice(0, index + 1);
    const current = data[index];
    const future = data[index + horizonDays];

    if (!current || !future || current.close <= 0) {
      continue;
    }

    const indicators = calculateIndicators(window);
    const regime = RegimeDetector.detect(window);
    const patterns = PatternRecognizer.detectPatterns(closes.slice(0, index + 1));
    const sentimentSeed = buildSentimentInput(asset.symbol, regime, indicators.trend, indicators.macd);
    const sentiment = SentimentAnalyzer.analyzeText(sentimentSeed);
    const prediction = EnsembleEngine.predict(indicators, regime, sentiment, patterns);

    const predictedDirection = directionFromPrediction(prediction.direction);
    const forwardReturn = (future.close - current.close) / current.close;
    const actualDirection = directionFromReturn(forwardReturn, threshold);
    const neutralPrediction = predictedDirection === 0;
    const hit = neutralPrediction ? actualDirection === 0 : predictedDirection === actualDirection;

    rows.push({
      symbol: asset.symbol,
      regime,
      predictedDirection,
      actualDirection,
      confidence: prediction.confidenceScore,
      forwardReturn,
      hit,
      neutralPrediction,
    });
  }

  return rows;
};

export const evaluateEngineAccuracy = async (
  assets: Asset[],
  horizon: AccuracyHorizon,
  assetLimit: number
): Promise<AccuracyReport> => {
  const selectedAssets = assets.slice(0, Math.max(1, assetLimit));
  const allRows: EvaluationRow[] = [];

  for (const asset of selectedAssets) {
    try {
      const rows = await evaluateAsset(asset, horizon);
      allRows.push(...rows);
    } catch (error) {
      console.warn(`Backtest skipped for ${asset.symbol}:`, error);
    }
  }

  const totalHits = allRows.filter((row) => row.hit).length;
  const directionalRows = allRows.filter((row) => !row.neutralPrediction);
  const directionalHits = directionalRows.filter((row) => row.predictedDirection === row.actualDirection).length;
  const actionableRows = directionalRows.filter((row) => row.regime !== 'Choppy');
  const actionableHits = actionableRows.filter((row) => row.predictedDirection === row.actualDirection).length;
  const highConvictionRows = directionalRows.filter((row) => row.confidence >= 70);
  const highConvictionHits = highConvictionRows.filter((row) => row.predictedDirection === row.actualDirection).length;
  const precisionMode = resolvePrecisionMode(directionalRows, 90, 5);

  const avgConfidenceAtEntry =
    allRows.length > 0
      ? Number((allRows.reduce((acc, row) => acc + row.confidence, 0) / allRows.length).toFixed(1))
      : 0;

  const correctRows = allRows.filter((row) => row.hit);
  const avgReturnWhenCorrect =
    correctRows.length > 0
      ? Number((correctRows.reduce((acc, row) => acc + Math.abs(row.forwardReturn), 0) / correctRows.length).toFixed(4))
      : 0;

  const directionalPnL = directionalRows.map((row) => row.predictedDirection * row.forwardReturn);
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;

  directionalPnL.forEach((pnl) => {
    equity *= 1 + pnl;
    peak = Math.max(peak, equity);
    const drawdown = (peak - equity) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  const pnlStd = stdDev(directionalPnL);
  const pnlMean =
    directionalPnL.length > 0 ? directionalPnL.reduce((acc, value) => acc + value, 0) / directionalPnL.length : 0;
  const annualizationFactor = Math.sqrt(252 / HORIZON_DAYS[horizon]);
  const sharpeProxy = pnlStd === 0 ? 0 : Number(((pnlMean / pnlStd) * annualizationFactor).toFixed(2));

  const bySymbolMap = new Map<string, { hits: number; total: number }>();
  allRows.forEach((row) => {
    const current = bySymbolMap.get(row.symbol) ?? { hits: 0, total: 0 };
    bySymbolMap.set(row.symbol, {
      hits: current.hits + (row.hit ? 1 : 0),
      total: current.total + 1,
    });
  });

  const topSymbols = Array.from(bySymbolMap.entries())
    .map(([symbol, value]) => ({
      symbol,
      hits: value.hits,
      sampleSize: value.total,
      accuracy: safePct(value.hits, value.total),
    }))
    .filter((item) => item.sampleSize >= 8)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 8);

  return {
    horizon,
    sampleSize: allRows.length,
    directionalSampleSize: directionalRows.length,
    overallAccuracy: safePct(totalHits, allRows.length),
    directionalAccuracy: safePct(directionalHits, directionalRows.length),
    actionableAccuracy: safePct(actionableHits, actionableRows.length),
    actionableSampleSize: actionableRows.length,
    highConvictionAccuracy: safePct(highConvictionHits, highConvictionRows.length),
    highConvictionSampleSize: highConvictionRows.length,
    avgConfidenceAtEntry,
    avgReturnWhenCorrect,
    maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
    sharpeProxy,
    precisionMode,
    byRegime: {
      Bull: scoreByRegime(allRows, 'Bull'),
      Bear: scoreByRegime(allRows, 'Bear'),
      Choppy: scoreByRegime(allRows, 'Choppy'),
    },
    topSymbols,
    generatedAt: new Date().toISOString(),
    caveat:
      'Accuracy is an out-of-sample directional backtest estimate on historical/synthetic data and is not a guarantee of future performance.',
  };
};
