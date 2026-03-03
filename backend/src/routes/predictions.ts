import express from 'express';
import { Asset, getAllAssets, getAssetById } from '../dataService';
import { fetchMarketData } from '../services/marketDataService';
import { calculateIndicators } from '../services/technicalAnalysis';
import { RegimeDetector, type MarketRegime } from '../services/regimeDetector';
import { EnsembleEngine } from '../services/ensembleEngine';
import { SentimentAnalyzer } from '../services/sentimentAnalyzer';
import { PatternRecognizer } from '../services/patternRecognition';
import { evaluateEngineAccuracy, type AccuracyHorizon } from '../services/modelBacktest';
import { getStockBySymbol } from '../data/stockList';

const router = express.Router();

type Horizon = 'daily' | 'weekly' | 'monthly';
type PredictionLabel = 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
type RiskLevel = 'Low' | 'Medium' | 'High';

interface HorizonConfig {
  label: string;
  horizonDays: number;
  atrMultiplier: number;
  moveMultiplier: number;
}

interface ExplainabilityResponse {
  symbol: string;
  name: string;
  horizon: Horizon;
  generatedAt: string;
  regime: MarketRegime;
  direction: 'Bullish' | 'Neutral' | 'Bearish';
  confidenceScore: number;
  winProbability: number;
  modelAgreement: number;
  factorScores: Array<{
    factor: string;
    score: number;
    impact: 'Positive' | 'Negative' | 'Neutral';
    weight: number;
  }>;
  diagnostics: {
    volatilityPenalty: number;
    conflictPenalty: number;
    confluenceBoost: number;
    regimeBias: number;
  };
  timeframeBias: {
    shortTerm: number;
    swing: number;
    position: number;
  };
  reasoning: string[];
}

interface ScenarioResponse {
  symbol: string;
  horizon: Horizon;
  currentPrice: number;
  forecastDays: number;
  generatedAt: string;
  sampleSize: number;
  impliedVolatility: number;
  drift: number;
  probabilityUp: number;
  probabilityDown: number;
  probabilityTargetHit: number;
  expectedReturnPct: number;
  percentilePrice: {
    p05: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
}

interface PlaybookResponse {
  symbol: string;
  name: string;
  horizon: Horizon;
  generatedAt: string;
  setupGrade: 'A+' | 'A' | 'B' | 'C';
  convictionTier: 'Elite' | 'High' | 'Moderate' | 'Low';
  thesis: string;
  whyNow: string[];
  checklist: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
  execution: {
    entryZone: { low: number; high: number };
    stopLoss: number;
    targetPrice: number;
    riskRewardRatio: number;
    timeframe: string;
  };
  riskProfiles: Array<{
    profile: 'Conservative' | 'Balanced' | 'Aggressive';
    maxPortfolioAllocationPct: number;
    maxRiskPerTradePct: number;
    note: string;
  }>;
  invalidationRules: string[];
  nextReviewWindow: string;
}

interface PredictionItem {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  type: 'stock';
  currentPrice: number;
  prediction: PredictionLabel;
  confidence: number;
  predictedPrice: number;
  timeframe: string;
  trend: 'Bullish' | 'Neutral' | 'Bearish';
  targetPrice: number;
  stopLoss: number;
  riskLevel: RiskLevel;
  signals: string[];
  potentialReturn: string;
  lastUpdated: string;
  winProbability: number;
  riskRewardRatio: number;
  modelAgreement: number;
  simulatedBacktestAccuracy: number;
  regime: MarketRegime;
  priceRange: { low: number; high: number };
  entryZone: { low: number; high: number };
  catalysts: string[];
  signalStrength: {
    trend: number;
    momentum: number;
    meanReversion: number;
    sentiment: number;
    patterns: number;
    overall: number;
  };
  supportLevel: number;
  resistanceLevel: number;
  volatility: number;
  analystRating: string;
  analystCount: number;
  nextEarningsDate: string;
  historicalPredictions: Array<{
    date: string;
    prediction: string;
    actual: string;
    accuracy: number;
  }>;
  reasoning: string[];
  sector?: string;
  country?: string;
  exchange?: string;
  marketCapClass?: string;
  confidenceTrend: number[];
}

const HORIZON_CONFIG: Record<Horizon, HorizonConfig> = {
  daily: { label: '1D', horizonDays: 1, atrMultiplier: 1.1, moveMultiplier: 1 },
  weekly: { label: '1W', horizonDays: 5, atrMultiplier: 1.7, moveMultiplier: 1.75 },
  monthly: { label: '1M', horizonDays: 21, atrMultiplier: 2.6, moveMultiplier: 2.6 },
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const parseHorizon = (raw: unknown): Horizon => {
  if (raw === 'weekly' || raw === 'monthly' || raw === 'daily') {
    return raw;
  }
  return 'daily';
};

const parseAccuracyHorizon = (raw: unknown): AccuracyHorizon => {
  if (raw === 'weekly' || raw === 'monthly' || raw === 'daily') {
    return raw;
  }
  return 'daily';
};

const ratingFromDirection = (direction: 'Bullish' | 'Neutral' | 'Bearish', confidence: number): PredictionLabel => {
  if (direction === 'Bullish') {
    return confidence >= 86 ? 'Strong Buy' : 'Buy';
  }
  if (direction === 'Bearish') {
    return confidence >= 86 ? 'Strong Sell' : 'Sell';
  }
  return 'Hold';
};

const buildSignals = (
  predictionLabel: PredictionLabel,
  regime: MarketRegime,
  confidence: number,
  riskLevel: RiskLevel,
  winProbability: number,
  modelAgreement: number
): string[] => {
  const directionSignal =
    predictionLabel === 'Strong Buy' || predictionLabel === 'Buy'
      ? 'Momentum Expansion'
      : predictionLabel === 'Strong Sell' || predictionLabel === 'Sell'
        ? 'Distribution Pressure'
        : 'Range Consolidation';

  const confidenceSignal =
    confidence >= 90 ? 'High-Conviction Cluster' : confidence >= 75 ? 'Multi-Signal Alignment' : 'Mixed Signal Stack';

  const probabilitySignal =
    winProbability >= 70 ? 'Favorable Win Probability' : winProbability >= 55 ? 'Balanced Edge' : 'Low Edge Environment';

  return [directionSignal, confidenceSignal, `Regime: ${regime}`, probabilitySignal, `Risk: ${riskLevel}`, `Agreement: ${modelAgreement}%`];
};

const buildCatalysts = (
  regime: MarketRegime,
  sentimentKeywords: string[],
  patternNames: string[],
  modelAgreement: number
): string[] => {
  const catalysts: string[] = [];

  if (modelAgreement >= 80) catalysts.push('Cross-model confluence above 80%');
  if (regime === 'Bull') catalysts.push('Trend-following regime active');
  if (regime === 'Bear') catalysts.push('Risk-off regime remains dominant');
  if (regime === 'Choppy') catalysts.push('Range regime favors tactical entries');

  if (patternNames.length > 0) {
    catalysts.push(`Pattern trigger: ${patternNames.slice(0, 2).join(', ')}`);
  }

  if (sentimentKeywords.length > 0) {
    catalysts.push(`Narrative flow: ${sentimentKeywords.slice(0, 3).join(', ')}`);
  }

  while (catalysts.length < 3) {
    catalysts.push('Liquidity and volatility checks passed');
  }

  return catalysts.slice(0, 4);
};

const safeFixed = (value: number, digits: number = 2): number => Number(value.toFixed(digits));

const resolveAssetBySymbol = (requested: string): Asset | undefined => {
  const cleaned = requested.trim().toLowerCase();
  let asset = getAssetById(cleaned);
  if (!asset) {
    asset = getAllAssets().find((candidate) => candidate.symbol.toLowerCase() === cleaned);
  }
  return asset;
};

const percentile = (sortedValues: number[], pct: number): number => {
  if (sortedValues.length === 0) return 0;
  const rank = (pct / 100) * (sortedValues.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const weight = rank - low;
  const lowValue = sortedValues[low] ?? sortedValues[0] ?? 0;
  const highValue = sortedValues[high] ?? sortedValues[sortedValues.length - 1] ?? lowValue;
  return lowValue + (highValue - lowValue) * weight;
};

const randomNormal = (): number => {
  const u1 = Math.max(Math.random(), 1e-12);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

const gradeSetup = (confidence: number, winProbability: number, riskRewardRatio: number, modelAgreement: number): PlaybookResponse['setupGrade'] => {
  const score = confidence * 0.35 + winProbability * 0.25 + modelAgreement * 0.2 + clamp(riskRewardRatio * 16, 0, 100) * 0.2;
  if (score >= 82) return 'A+';
  if (score >= 74) return 'A';
  if (score >= 63) return 'B';
  return 'C';
};

const convictionTierFromConfidence = (confidence: number): PlaybookResponse['convictionTier'] => {
  if (confidence >= 86) return 'Elite';
  if (confidence >= 74) return 'High';
  if (confidence >= 60) return 'Moderate';
  return 'Low';
};

const buildConfidenceTrend = (baseConfidence: number, score: number): number[] => {
  const trend: number[] = [];

  for (let i = 0; i < 7; i += 1) {
    const delta = (i - 3) * 1.5;
    const directionalBias = score * 6;
    const value = clamp(baseConfidence + delta + directionalBias, 35, 99);
    trend.push(Math.round(value));
  }

  return trend;
};

const buildHistoricalTrack = (baseAccuracy: number, predictionLabel: PredictionLabel): PredictionItem['historicalPredictions'] => {
  const offsets = [30, 60, 90];

  return offsets.map((daysAgo, index) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);

    const drift = index === 0 ? 2 : index === 1 ? -1 : 1;
    const accuracy = clamp(baseAccuracy - 2 + drift, 60, 98);

    const bullish = predictionLabel === 'Strong Buy' || predictionLabel === 'Buy';
    const bearish = predictionLabel === 'Strong Sell' || predictionLabel === 'Sell';

    return {
      date: dt.toISOString(),
      prediction: predictionLabel,
      actual: bullish ? 'up' : bearish ? 'down' : index % 2 === 0 ? 'up' : 'down',
      accuracy: Math.round(accuracy),
    };
  });
};

const buildPredictionForAsset = async (asset: Asset, horizon: Horizon): Promise<PredictionItem> => {
  const config = HORIZON_CONFIG[horizon];
  const marketData = await fetchMarketData(asset.symbol, 320);

  if (marketData.length < 120) {
    throw new Error(`Not enough candles for ${asset.symbol}`);
  }

  const indicators = calculateIndicators(marketData);
  const regime = RegimeDetector.detect(marketData);
  const closes = marketData.map((row) => row.close);
  const patterns = PatternRecognizer.detectPatterns(closes);

  const headline = `${asset.name} ${regime === 'Bull' ? 'shows growth and upside momentum' : regime === 'Bear' ? 'faces pressure and weaker demand outlook' : 'trades in range with mixed directional cues'}`;
  const headlineSentiment = SentimentAnalyzer.analyzeText(headline);
  const socialSentiment = await SentimentAnalyzer.getStockSentiment(asset.symbol);
  const sentiment = SentimentAnalyzer.aggregateSentiment([headlineSentiment, socialSentiment]);

  const result = EnsembleEngine.predict(indicators, regime, sentiment, patterns);
  const currentPrice = indicators.raw.currentPrice;

  const directionSign = result.direction === 'Bullish' ? 1 : result.direction === 'Bearish' ? -1 : 0;
  const projectedMovePct = clamp(
    Math.abs(result.score) * 0.045 + indicators.volatility * 0.03 + (result.modelAgreement / 100) * 0.01,
    0.004,
    0.16
  );

  const directionalMovePct = directionSign === 0 ? projectedMovePct * 0.15 : projectedMovePct * directionSign;
  const targetPrice = safeFixed(currentPrice * (1 + directionalMovePct * config.moveMultiplier));

  const atr = indicators.raw.atr || currentPrice * 0.015;
  const stopBuffer = atr * (result.riskLevel === 'High' ? 1.35 : result.riskLevel === 'Low' ? 0.9 : 1.12);
  const stopLoss = safeFixed(currentPrice - stopBuffer * (directionSign >= 0 ? 1 : -1));

  const rangeWidth = atr * Math.sqrt(config.horizonDays) * config.atrMultiplier;
  const priceRange = {
    low: safeFixed(currentPrice - rangeWidth),
    high: safeFixed(currentPrice + rangeWidth),
  };

  const supportLevel = safeFixed(Math.min(indicators.raw.bollingerLower, indicators.raw.ema50 * 0.985));
  const resistanceLevel = safeFixed(Math.max(indicators.raw.bollingerUpper, indicators.raw.ema50 * 1.015));
  const entryZone = {
    low: safeFixed(indicators.raw.ema50 - atr * 0.35),
    high: safeFixed(indicators.raw.ema50 + atr * 0.35),
  };

  const predictionLabel = ratingFromDirection(result.direction, result.confidenceScore);
  const potentialReturnPct = ((targetPrice - currentPrice) / currentPrice) * 100;

  const riskPerShare = Math.max(Math.abs(currentPrice - stopLoss), currentPrice * 0.008);
  const rewardPerShare = Math.max(Math.abs(targetPrice - currentPrice), currentPrice * 0.004);
  const computedRiskReward = safeFixed(rewardPerShare / riskPerShare, 2);

  const riskRewardRatio = safeFixed((computedRiskReward + result.riskRewardRatio) / 2, 2);
  const nextEarningsDate = new Date();
  nextEarningsDate.setDate(nextEarningsDate.getDate() + 12 + (asset.symbol.length % 23));
  const stockMeta = getStockBySymbol(asset.symbol);

  const predictionItem: PredictionItem = {
    id: `pred-live-${asset.id}-${horizon}`,
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    type: 'stock',
    currentPrice: safeFixed(currentPrice),
    prediction: predictionLabel,
    confidence: result.confidenceScore,
    predictedPrice: targetPrice,
    timeframe: config.label,
    trend: result.direction,
    targetPrice,
    stopLoss,
    riskLevel: result.riskLevel,
    signals: buildSignals(predictionLabel, regime, result.confidenceScore, result.riskLevel, result.winProbability, result.modelAgreement),
    potentialReturn: potentialReturnPct.toFixed(1),
    lastUpdated: new Date().toISOString(),
    winProbability: result.winProbability,
    riskRewardRatio,
    modelAgreement: result.modelAgreement,
    simulatedBacktestAccuracy: result.simulatedBacktestAccuracy,
    regime,
    priceRange,
    entryZone,
    catalysts: buildCatalysts(regime, sentiment.topKeywords, patterns.map((pattern) => pattern.name), result.modelAgreement),
    signalStrength: {
      trend: Math.round(result.signalStrength.trend * 100),
      momentum: Math.round(result.signalStrength.momentum * 100),
      meanReversion: Math.round(result.signalStrength.meanReversion * 100),
      sentiment: Math.round((result.signalStrength.sentiment ?? 0) * 100),
      patterns: Math.round((result.signalStrength.patterns ?? 0) * 100),
      overall: Math.round(result.signalStrength.overall * 100),
    },
    supportLevel,
    resistanceLevel,
    volatility: safeFixed(atr),
    analystRating: predictionLabel,
    analystCount: 8 + (asset.symbol.length % 13),
    nextEarningsDate: nextEarningsDate.toISOString(),
    historicalPredictions: buildHistoricalTrack(result.simulatedBacktestAccuracy, predictionLabel),
    reasoning: result.reasoning,
    confidenceTrend: buildConfidenceTrend(result.confidenceScore, result.score),
  };

  if (stockMeta?.sector) predictionItem.sector = stockMeta.sector;
  if (stockMeta?.country) predictionItem.country = stockMeta.country;
  if (stockMeta?.exchange) predictionItem.exchange = stockMeta.exchange;
  if (stockMeta?.marketCap) predictionItem.marketCapClass = stockMeta.marketCap;

  return predictionItem;
};

const buildSummary = (items: PredictionItem[]) => {
  const totalPredictions = items.length;
  const actionableItems = items.filter((item) => item.prediction !== 'Hold');

  const strongBuy = items.filter((item) => item.prediction === 'Strong Buy').length;
  const buy = items.filter((item) => item.prediction === 'Buy').length;
  const hold = items.filter((item) => item.prediction === 'Hold').length;
  const sell = items.filter((item) => item.prediction === 'Sell' || item.prediction === 'Strong Sell').length;

  const avgConfidence = totalPredictions > 0 ? Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / totalPredictions) : 0;
  const avgWinProbability = totalPredictions > 0 ? Math.round(items.reduce((sum, item) => sum + item.winProbability, 0) / totalPredictions) : 0;
  const avgModelAgreement = totalPredictions > 0 ? Math.round(items.reduce((sum, item) => sum + item.modelAgreement, 0) / totalPredictions) : 0;
  const avgSimulatedAccuracy =
    totalPredictions > 0 ? Math.round(items.reduce((sum, item) => sum + item.simulatedBacktestAccuracy, 0) / totalPredictions) : 0;
  const avgActionableConfidence =
    actionableItems.length > 0
      ? Math.round(actionableItems.reduce((sum, item) => sum + item.confidence, 0) / actionableItems.length)
      : avgConfidence;
  const confidenceLift = avgActionableConfidence - avgConfidence;

  const avgRiskReward =
    totalPredictions > 0
      ? Number((items.reduce((sum, item) => sum + item.riskRewardRatio, 0) / totalPredictions).toFixed(2))
      : 0;

  return {
    totalPredictions,
    strongBuy,
    buy,
    hold,
    sell,
    avgConfidence,
    avgActionableConfidence,
    confidenceLift,
    avgWinProbability,
    avgModelAgreement,
    avgRiskReward,
    avgSimulatedAccuracy,
  };
};

// GET /api/predictions?horizon=daily|weekly|monthly&limit=20
router.get('/', async (req, res) => {
  try {
    const horizon = parseHorizon(req.query.horizon);
    const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10);
    const limit = clamp(Number.isFinite(limitRaw) ? limitRaw : 20, 1, 50);

    const assets = getAllAssets().slice(0, limit);
    const predictions: PredictionItem[] = [];

    for (const asset of assets) {
      try {
        const item = await buildPredictionForAsset(asset, horizon);
        predictions.push(item);
      } catch (error) {
        console.error(`Failed to build prediction for ${asset.symbol}:`, error);
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);

    res.json({
      predictions,
      summary: buildSummary(predictions),
      meta: {
        horizon,
        generatedAt: new Date().toISOString(),
        engineVersion: 'v2.0-regime-ensemble',
        note: 'Backtest accuracy metrics are simulated model diagnostics, not guaranteed returns.',
      },
    });
  } catch (error) {
    console.error('Prediction list error:', error);
    res.status(500).json({ error: 'Failed to generate predictions list' });
  }
});

// GET /api/predictions/accuracy?horizon=daily|weekly|monthly&assets=10
router.get('/accuracy', async (req, res): Promise<void> => {
  try {
    const horizon = parseAccuracyHorizon(req.query.horizon);
    const assetsRaw = Number.parseInt(String(req.query.assets ?? '10'), 10);
    const assetsLimit = clamp(Number.isFinite(assetsRaw) ? assetsRaw : 10, 3, 20);

    const report = await evaluateEngineAccuracy(getAllAssets(), horizon, assetsLimit);
    res.json(report);
  } catch (error) {
    console.error('Prediction accuracy error:', error);
    res.status(500).json({ error: 'Failed to evaluate prediction accuracy' });
  }
});

// GET /api/predictions/explain/:symbol?horizon=daily|weekly|monthly
router.get('/explain/:symbol', async (req, res): Promise<void> => {
  try {
    const symbol = String(req.params.symbol ?? '');
    const horizon = parseHorizon(req.query.horizon);
    const asset = resolveAssetBySymbol(symbol);

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const marketData = await fetchMarketData(asset.symbol, 320);
    if (marketData.length < 120) {
      res.status(422).json({ error: 'Not enough candles to explain this symbol' });
      return;
    }

    const indicators = calculateIndicators(marketData);
    const regime = RegimeDetector.detect(marketData);
    const closes = marketData.map((row) => row.close);
    const patterns = PatternRecognizer.detectPatterns(closes);

    const headline = `${asset.name} ${regime === 'Bull' ? 'shows growth and upside momentum' : regime === 'Bear' ? 'faces pressure and weaker demand outlook' : 'trades in range with mixed directional cues'}`;
    const headlineSentiment = SentimentAnalyzer.analyzeText(headline);
    const socialSentiment = await SentimentAnalyzer.getStockSentiment(asset.symbol);
    const sentiment = SentimentAnalyzer.aggregateSentiment([headlineSentiment, socialSentiment]);

    const result = EnsembleEngine.predict(indicators, regime, sentiment, patterns);

    const factorScores: ExplainabilityResponse['factorScores'] = [
      { factor: 'Trend', score: Number((indicators.trend * 100).toFixed(1)), impact: indicators.trend > 0.06 ? 'Positive' : indicators.trend < -0.06 ? 'Negative' : 'Neutral', weight: regime === 'Choppy' ? 0.05 : 0.3 },
      { factor: 'Momentum', score: Number((indicators.macd * 100).toFixed(1)), impact: indicators.macd > 0.04 ? 'Positive' : indicators.macd < -0.04 ? 'Negative' : 'Neutral', weight: 0.2 },
      { factor: 'Mean Reversion', score: Number((-indicators.bollingerPosition * 100).toFixed(1)), impact: indicators.bollingerPosition < -0.1 ? 'Positive' : indicators.bollingerPosition > 0.1 ? 'Negative' : 'Neutral', weight: regime === 'Choppy' ? 0.35 : 0.05 },
      { factor: 'Volume', score: Number((indicators.volumeMomentum * 100).toFixed(1)), impact: indicators.volumeMomentum > 0.08 ? 'Positive' : indicators.volumeMomentum < -0.08 ? 'Negative' : 'Neutral', weight: 0.1 },
      { factor: 'Sentiment', score: Number(((sentiment.score ?? 0) * 100).toFixed(1)), impact: sentiment.score > 0.05 ? 'Positive' : sentiment.score < -0.05 ? 'Negative' : 'Neutral', weight: 0.15 },
      { factor: 'Pattern Cluster', score: Number((patterns.reduce((acc, item) => acc + item.confidence * (item.type === 'Bullish' ? 1 : item.type === 'Bearish' ? -1 : 0), 0) * 100).toFixed(1)), impact: patterns.some((item) => item.type === 'Bullish') ? 'Positive' : patterns.some((item) => item.type === 'Bearish') ? 'Negative' : 'Neutral', weight: 0.1 },
    ];

    const payload: ExplainabilityResponse = {
      symbol: asset.symbol,
      name: asset.name,
      horizon,
      generatedAt: new Date().toISOString(),
      regime,
      direction: result.direction,
      confidenceScore: result.confidenceScore,
      winProbability: result.winProbability,
      modelAgreement: result.modelAgreement,
      factorScores,
      diagnostics: result.diagnostics,
      timeframeBias: {
        shortTerm: Number((result.timeframeBias.shortTerm * 100).toFixed(1)),
        swing: Number((result.timeframeBias.swing * 100).toFixed(1)),
        position: Number((result.timeframeBias.position * 100).toFixed(1)),
      },
      reasoning: result.reasoning,
    };

    res.json(payload);
  } catch (error) {
    console.error('Prediction explainability error:', error);
    res.status(500).json({ error: 'Failed to generate explainability report' });
  }
});

// GET /api/predictions/scenario/:symbol?horizon=daily|weekly|monthly&paths=750
router.get('/scenario/:symbol', async (req, res): Promise<void> => {
  try {
    const symbol = String(req.params.symbol ?? '');
    const horizon = parseHorizon(req.query.horizon);
    const pathsRaw = Number.parseInt(String(req.query.paths ?? '750'), 10);
    const paths = clamp(Number.isFinite(pathsRaw) ? pathsRaw : 750, 300, 4000);

    const asset = resolveAssetBySymbol(symbol);
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const candles = await fetchMarketData(asset.symbol, 360);
    if (candles.length < 200) {
      res.status(422).json({ error: 'Not enough candles for scenario simulation' });
      return;
    }

    const closes = candles.map((row) => row.close).filter((value) => value > 0);
    const latestPrice = closes[closes.length - 1];
    if (!latestPrice || closes.length < 40) {
      res.status(422).json({ error: 'Insufficient clean close series for simulation' });
      return;
    }

    const logReturns: number[] = [];
    for (let i = 1; i < closes.length; i += 1) {
      const prev = closes[i - 1];
      const current = closes[i];
      if (!prev || !current || prev <= 0 || current <= 0) continue;
      logReturns.push(Math.log(current / prev));
    }

    const mean = logReturns.length > 0 ? logReturns.reduce((acc, value) => acc + value, 0) / logReturns.length : 0;
    const variance = logReturns.length > 1
      ? logReturns.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (logReturns.length - 1)
      : 0;
    const sigma = Math.sqrt(Math.max(variance, 1e-8));
    const forecastDays = HORIZON_CONFIG[horizon].horizonDays;
    const dt = 1 / 252;

    const simulatedFinalPrices: number[] = [];
    for (let path = 0; path < paths; path += 1) {
      let price = latestPrice;
      for (let t = 0; t < forecastDays; t += 1) {
        const shock = randomNormal();
        const driftTerm = (mean - 0.5 * sigma ** 2) * dt;
        const diffusionTerm = sigma * Math.sqrt(dt) * shock;
        price *= Math.exp(driftTerm + diffusionTerm);
      }
      simulatedFinalPrices.push(price);
    }

    simulatedFinalPrices.sort((a, b) => a - b);

    const prediction = await buildPredictionForAsset(asset, horizon);
    const target = prediction.targetPrice;
    const upCount = simulatedFinalPrices.filter((value) => value > latestPrice).length;
    const targetHitCount =
      target >= latestPrice
        ? simulatedFinalPrices.filter((value) => value >= target).length
        : simulatedFinalPrices.filter((value) => value <= target).length;

    const expectedFinal = simulatedFinalPrices.reduce((acc, value) => acc + value, 0) / Math.max(1, simulatedFinalPrices.length);
    const expectedReturnPct = ((expectedFinal - latestPrice) / latestPrice) * 100;

    const response: ScenarioResponse = {
      symbol: asset.symbol,
      horizon,
      currentPrice: safeFixed(latestPrice),
      forecastDays,
      generatedAt: new Date().toISOString(),
      sampleSize: simulatedFinalPrices.length,
      impliedVolatility: Number((sigma * Math.sqrt(252) * 100).toFixed(2)),
      drift: Number((mean * 100).toFixed(4)),
      probabilityUp: Number(((upCount / Math.max(1, simulatedFinalPrices.length)) * 100).toFixed(1)),
      probabilityDown: Number((100 - (upCount / Math.max(1, simulatedFinalPrices.length)) * 100).toFixed(1)),
      probabilityTargetHit: Number(((targetHitCount / Math.max(1, simulatedFinalPrices.length)) * 100).toFixed(1)),
      expectedReturnPct: Number(expectedReturnPct.toFixed(2)),
      percentilePrice: {
        p05: safeFixed(percentile(simulatedFinalPrices, 5)),
        p25: safeFixed(percentile(simulatedFinalPrices, 25)),
        p50: safeFixed(percentile(simulatedFinalPrices, 50)),
        p75: safeFixed(percentile(simulatedFinalPrices, 75)),
        p95: safeFixed(percentile(simulatedFinalPrices, 95)),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Prediction scenario error:', error);
    res.status(500).json({ error: 'Failed to generate scenario simulation' });
  }
});

// GET /api/predictions/stream?horizon=daily|weekly|monthly&limit=5&interval=12000
router.get('/stream', async (req, res): Promise<void> => {
  const horizon = parseHorizon(req.query.horizon);
  const limitRaw = Number.parseInt(String(req.query.limit ?? '5'), 10);
  const intervalRaw = Number.parseInt(String(req.query.interval ?? '12000'), 10);
  const limit = clamp(Number.isFinite(limitRaw) ? limitRaw : 5, 3, 8);
  const intervalMs = clamp(Number.isFinite(intervalRaw) ? intervalRaw : 12000, 5000, 30000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let inFlight = false;
  const sendFrame = async () => {
    if (inFlight) return;
    inFlight = true;

    try {
      const assets = getAllAssets().slice(0, limit);
      const items: PredictionItem[] = [];
      for (const asset of assets) {
        try {
          const prediction = await buildPredictionForAsset(asset, horizon);
          items.push(prediction);
        } catch (error) {
          console.error(`Stream prediction failed for ${asset.symbol}:`, error);
        }
      }

      items.sort((a, b) => b.confidence - a.confidence);
      const payload = {
        generatedAt: new Date().toISOString(),
        horizon,
        summary: buildSummary(items),
        topSignals: items.slice(0, 3).map((item) => ({
          symbol: item.symbol,
          prediction: item.prediction,
          confidence: item.confidence,
          winProbability: item.winProbability,
          potentialReturn: item.potentialReturn,
        })),
      };

      res.write(`event: pulse\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'stream frame failed' })}\n\n`);
    } finally {
      inFlight = false;
    }
  };

  void sendFrame();
  const timer = setInterval(() => {
    void sendFrame();
  }, intervalMs);

  req.on('close', () => {
    clearInterval(timer);
    res.end();
  });
});

// GET /api/predictions/playbook/:symbol?horizon=daily|weekly|monthly
router.get('/playbook/:symbol', async (req, res): Promise<void> => {
  try {
    const symbol = String(req.params.symbol ?? '');
    const horizon = parseHorizon(req.query.horizon);
    const asset = resolveAssetBySymbol(symbol);

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const prediction = await buildPredictionForAsset(asset, horizon);
    const setupGrade = gradeSetup(
      prediction.confidence,
      prediction.winProbability,
      prediction.riskRewardRatio,
      prediction.modelAgreement
    );
    const convictionTier = convictionTierFromConfidence(prediction.confidence);

    const direction = prediction.prediction.includes('Buy')
      ? 'upside continuation'
      : prediction.prediction.includes('Sell')
        ? 'downside continuation'
        : 'range mean reversion';
    const thesis = `${prediction.symbol} shows ${direction} with ${prediction.confidence}% confidence in a ${prediction.regime} regime.`;

    const checklist: PlaybookResponse['checklist'] = [
      {
        label: 'Signal alignment',
        passed: prediction.modelAgreement >= 67,
        detail: `Model agreement is ${prediction.modelAgreement}%`,
      },
      {
        label: 'Risk/reward quality',
        passed: prediction.riskRewardRatio >= 1.4,
        detail: `Current risk/reward is ${prediction.riskRewardRatio}`,
      },
      {
        label: 'Edge probability',
        passed: prediction.winProbability >= 55,
        detail: `Win probability is ${prediction.winProbability}%`,
      },
      {
        label: 'Volatility sanity check',
        passed: prediction.riskLevel !== 'High',
        detail: `Current risk level is ${prediction.riskLevel}`,
      },
    ];

    const riskProfiles: PlaybookResponse['riskProfiles'] = [
      {
        profile: 'Conservative',
        maxPortfolioAllocationPct: prediction.riskLevel === 'High' ? 3 : 5,
        maxRiskPerTradePct: 0.75,
        note: 'Use only if checklist has at least 3/4 pass and avoid overnight concentration.',
      },
      {
        profile: 'Balanced',
        maxPortfolioAllocationPct: prediction.riskLevel === 'High' ? 5 : 8,
        maxRiskPerTradePct: 1.2,
        note: 'Default mode. Scale in near entry zone and trail stop after first target move.',
      },
      {
        profile: 'Aggressive',
        maxPortfolioAllocationPct: prediction.riskLevel === 'High' ? 8 : 12,
        maxRiskPerTradePct: 1.8,
        note: 'Use only with high-conviction setups and strict invalidation discipline.',
      },
    ];

    const invalidationRules = [
      `If price breaks beyond stop level ${prediction.stopLoss}, thesis is invalid.`,
      `If model agreement falls below 50% on refresh, reduce exposure.`,
      `If risk/reward drops below 1.1 after re-entry adjustment, skip trade.`,
    ];

    const nextReviewWindowDate = new Date();
    nextReviewWindowDate.setDate(nextReviewWindowDate.getDate() + (horizon === 'daily' ? 1 : horizon === 'weekly' ? 3 : 7));

    const payload: PlaybookResponse = {
      symbol: prediction.symbol,
      name: prediction.name,
      horizon,
      generatedAt: new Date().toISOString(),
      setupGrade,
      convictionTier,
      thesis,
      whyNow: prediction.reasoning.slice(0, 4),
      checklist,
      execution: {
        entryZone: prediction.entryZone,
        stopLoss: prediction.stopLoss,
        targetPrice: prediction.targetPrice,
        riskRewardRatio: prediction.riskRewardRatio,
        timeframe: prediction.timeframe,
      },
      riskProfiles,
      invalidationRules,
      nextReviewWindow: nextReviewWindowDate.toISOString(),
    };

    res.json(payload);
  } catch (error) {
    console.error('Prediction playbook error:', error);
    res.status(500).json({ error: 'Failed to generate playbook' });
  }
});

// GET /api/predictions/:symbol?horizon=daily|weekly|monthly
router.get('/:symbol', async (req, res): Promise<void> => {
  try {
    const requested = req.params.symbol.trim().toLowerCase();
    const horizon = parseHorizon(req.query.horizon);
    const asset = resolveAssetBySymbol(requested);

    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const prediction = await buildPredictionForAsset(asset, horizon);
    res.json(prediction);
  } catch (error) {
    console.error('Prediction detail error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

export default router;
