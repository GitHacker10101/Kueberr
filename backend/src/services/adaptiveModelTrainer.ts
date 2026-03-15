import { Asset } from '../dataService';
import { EnsembleEngine, PredictionHorizon } from './ensembleEngine';
import { fetchMarketData } from './marketDataService';
import { PatternRecognizer } from './patternRecognition';
import { RegimeDetector, MarketRegime } from './regimeDetector';
import { SentimentAnalyzer } from './sentimentAnalyzer';
import { calculateIndicators } from './technicalAnalysis';

interface TrainingRow {
  regime: MarketRegime;
  score: number;
  confidence: number;
  predictedDirection: number;
  actualDirection: number;
  hit: boolean;
}

export interface AdaptiveCalibrationProfile {
  horizon: PredictionHorizon;
  generatedAt: string;
  assetCount: number;
  sampleSize: number;
  directionalSampleSize: number;
  directionalHitRate: number;
  regimeMultiplier: Record<MarketRegime, number>;
  thresholdScale: number;
  confidenceShift: number;
  winRateBias: number;
}

const HORIZON_DAYS: Record<PredictionHorizon, number> = {
  daily: 1,
  weekly: 5,
  monthly: 21,
};

const RETURN_THRESHOLDS: Record<PredictionHorizon, number> = {
  daily: 0.0025,
  weekly: 0.006,
  monthly: 0.012,
};

const BASE_ABS_SCORE_GATE: Record<PredictionHorizon, number> = {
  daily: 0.16,
  weekly: 0.14,
  monthly: 0.08,
};

const PROFILE_TTL_MS = 20 * 60 * 1000;
const calibrationCache = new Map<PredictionHorizon, { expiresAt: number; profile: AdaptiveCalibrationProfile }>();

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const directionFromPrediction = (direction: 'Bullish' | 'Neutral' | 'Bearish'): number => {
  if (direction === 'Bullish') return 1;
  if (direction === 'Bearish') return -1;
  return 0;
};

const directionFromReturn = (forwardReturn: number, threshold: number): number => {
  if (forwardReturn > threshold) return 1;
  if (forwardReturn < -threshold) return -1;
  return 0;
};

const buildSentimentInput = (symbol: string, regime: MarketRegime, trendScore: number, momentumScore: number): string => {
  const trendWord = trendScore >= 0 ? 'growth' : 'decline';
  const momentumWord = momentumScore >= 0 ? 'positive' : 'negative';
  return `${symbol} in ${regime.toLowerCase()} regime with ${trendWord} trend and ${momentumWord} momentum`;
};

const defaultProfile = (horizon: PredictionHorizon): AdaptiveCalibrationProfile => ({
  horizon,
  generatedAt: new Date().toISOString(),
  assetCount: 0,
  sampleSize: 0,
  directionalSampleSize: 0,
  directionalHitRate: 0.5,
  regimeMultiplier: {
    Bull: 1,
    Bear: 1,
    Choppy: 1,
  },
  thresholdScale: 1,
  confidenceShift: 0,
  winRateBias: 0,
});

const computeProfile = async (
  horizon: PredictionHorizon,
  assets: Asset[],
  maxAssets: number
): Promise<AdaptiveCalibrationProfile> => {
  const selectedAssets = assets.slice(0, Math.max(1, maxAssets));
  const rows: TrainingRow[] = [];
  const horizonDays = HORIZON_DAYS[horizon];
  const threshold = RETURN_THRESHOLDS[horizon];

  for (const asset of selectedAssets) {
    try {
      const data = await fetchMarketData(asset.symbol, 360, { allowSyntheticFallback: false });
      if (data.length < 260) continue;

      const closes = data.map((point) => point.close);

      for (let index = 220; index <= data.length - horizonDays - 1; index += 8) {
        const window = data.slice(0, index + 1);
        const current = data[index];
        const future = data[index + horizonDays];
        if (!current || !future || current.close <= 0) continue;

        const indicators = calculateIndicators(window);
        const regime = RegimeDetector.detect(window);
        const patterns = PatternRecognizer.detectPatterns(closes.slice(0, index + 1));
        const sentimentSeed = buildSentimentInput(asset.symbol, regime, indicators.trend, indicators.macd);
        const sentiment = SentimentAnalyzer.analyzeText(sentimentSeed);
        const prediction = EnsembleEngine.predict(indicators, regime, sentiment, patterns, horizon);

        const predictedDirection = directionFromPrediction(prediction.direction);
        const forwardReturn = (future.close - current.close) / current.close;
        const actualDirection = directionFromReturn(forwardReturn, threshold);
        const hit = predictedDirection !== 0 && predictedDirection === actualDirection;

        rows.push({
          regime,
          score: Math.abs(prediction.score),
          confidence: prediction.confidenceScore,
          predictedDirection,
          actualDirection,
          hit,
        });
      }
    } catch {
      // Skip symbols that cannot provide a clean historical series.
    }
  }

  if (rows.length === 0) {
    return defaultProfile(horizon);
  }

  const directionalRows = rows.filter((row) => row.predictedDirection !== 0);
  if (directionalRows.length === 0) {
    return {
      ...defaultProfile(horizon),
      generatedAt: new Date().toISOString(),
      assetCount: selectedAssets.length,
      sampleSize: rows.length,
    };
  }

  const directionalHits = directionalRows.filter((row) => row.hit).length;
  const directionalHitRate = directionalHits / directionalRows.length;

  const regimeMultiplier: AdaptiveCalibrationProfile['regimeMultiplier'] = {
    Bull: 1,
    Bear: 1,
    Choppy: 1,
  };

  (['Bull', 'Bear', 'Choppy'] as const).forEach((regime) => {
    const regimeRows = directionalRows.filter((row) => row.regime === regime);
    if (regimeRows.length < 12) {
      regimeMultiplier[regime] = 1;
      return;
    }
    const regimeHits = regimeRows.filter((row) => row.hit).length / regimeRows.length;
    regimeMultiplier[regime] = clamp(0.86 + (regimeHits - 0.5) * 2.2, 0.74, 1.24);
  });

  const baseGate = BASE_ABS_SCORE_GATE[horizon];
  let thresholdScale = 1;
  let bestObjective = -Infinity;

  for (let scale = 0.75; scale <= 1.35; scale += 0.05) {
    const gate = baseGate * scale;
    const gated = directionalRows.filter((row) => row.score >= gate);
    if (gated.length < 8) continue;
    const hitRate = gated.filter((row) => row.hit).length / gated.length;
    const objective = hitRate * 100 + Math.min(18, gated.length * 0.35);
    if (objective > bestObjective) {
      bestObjective = objective;
      thresholdScale = Number(scale.toFixed(2));
    }
  }

  const avgDirectionalConfidence =
    directionalRows.reduce((sum, row) => sum + row.confidence, 0) / directionalRows.length;
  const confidenceShift = Number(
    clamp((directionalHitRate * 100 - avgDirectionalConfidence) * 0.38, -10, 10).toFixed(2)
  );
  const winRateBias = Number(clamp((directionalHitRate - 0.5) * 24, -8, 8).toFixed(2));

  return {
    horizon,
    generatedAt: new Date().toISOString(),
    assetCount: selectedAssets.length,
    sampleSize: rows.length,
    directionalSampleSize: directionalRows.length,
    directionalHitRate: Number((directionalHitRate * 100).toFixed(1)),
    regimeMultiplier,
    thresholdScale,
    confidenceShift,
    winRateBias,
  };
};

export const getAdaptiveCalibrationProfile = async (
  horizon: PredictionHorizon,
  assets: Asset[],
  maxAssets: number = 28
): Promise<AdaptiveCalibrationProfile> => {
  const cached = calibrationCache.get(horizon);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.profile;
  }

  const profile = await computeProfile(horizon, assets, maxAssets);
  calibrationCache.set(horizon, {
    profile,
    expiresAt: now + PROFILE_TTL_MS,
  });

  return profile;
};

export const resetAdaptiveCalibration = (): void => {
  calibrationCache.clear();
};
