import { NormalizedIndicators } from './technicalAnalysis';
import { MarketRegime } from './regimeDetector';
import { SentimentResult } from './sentimentAnalyzer';
import { Pattern } from './patternRecognition';

export interface PredictionResult {
  direction: 'Bullish' | 'Neutral' | 'Bearish';
  confidence: 'Low' | 'Medium' | 'High';
  score: number; // -1 to 1
  reasoning: string[];
  signalStrength: {
    trend: number;
    momentum: number;
    meanReversion: number;
    overall: number;
    sentiment?: number;
    patterns?: number;
  };
}

export class EnsembleEngine {
  static predict(
    indicators: NormalizedIndicators,
    regime: MarketRegime,
    sentiment?: SentimentResult,
    patterns: Pattern[] = []
  ): PredictionResult {
    // Dynamic Weights based on Regime (updated for new inputs)
    // Base mix: Technicals (75%), Sentiment (15%), Patterns (10%)

    // Technical Sub-weights re-normalized to sum to roughly 0.75 of total
    let weights = {
      trend: 0.25,
      momentum: 0.20,
      meanReversion: 0.10,
      volume: 0.10,
      trendStrength: 0.10,
      sentiment: 0.15,
      patterns: 0.10
    };

    if (regime === 'Bull') {
      weights = { trend: 0.30, momentum: 0.20, meanReversion: 0.05, volume: 0.10, trendStrength: 0.10, sentiment: 0.15, patterns: 0.10 };
    } else if (regime === 'Choppy') {
      weights = { trend: 0.05, momentum: 0.20, meanReversion: 0.35, volume: 0.05, trendStrength: 0.10, sentiment: 0.10, patterns: 0.15 };
    } else if (regime === 'Bear') {
      weights = { trend: 0.30, momentum: 0.20, meanReversion: 0.05, volume: 0.10, trendStrength: 0.10, sentiment: 0.15, patterns: 0.10 };
    }

    // --- Technical Scores ---

    const momentumScore = (
      indicators.rsi * 0.3 +
      indicators.macd * 0.3 +
      indicators.stochastic * 0.25 +
      indicators.cci * 0.15
    );

    const volumeScore = (
      indicators.volumeMomentum * 0.4 +
      indicators.priceVolumeStrength * 0.6
    );

    // Invert BB position for mean reversion (high position = sell signal)
    const meanReversionScore = -indicators.bollingerPosition;

    const trendConfidenceMultiplier = 0.5 + (indicators.adx * 0.5);

    // --- New Component Scores ---

    // Sentiment Score
    const sentimentScore = sentiment ? sentiment.score : 0;

    // Pattern Score
    // Calculate aggregate score from patterns based on confidence and significance
    let patternScore = 0;
    if (patterns.length > 0) {
      let totalPatternWeight = 0;
      patterns.forEach(p => {
        const dir = p.type === 'Bullish' ? 1 : p.type === 'Bearish' ? -1 : 0;
        const sig = p.significance === 'High' ? 1.5 : p.significance === 'Medium' ? 1.0 : 0.5;
        patternScore += dir * p.confidence * sig;
        totalPatternWeight += sig;
      });
      if (totalPatternWeight > 0) {
        patternScore /= totalPatternWeight; // Normalize to -1 to 1 range roughly
      }
      // Cap it
      patternScore = Math.max(-1, Math.min(1, patternScore));
    }

    // --- Weighted Aggregation ---

    const trendComponent = indicators.trend * weights.trend * trendConfidenceMultiplier;
    const momentumComponent = momentumScore * weights.momentum;
    const meanReversionComponent = meanReversionScore * weights.meanReversion;
    const volumeComponent = volumeScore * weights.volume;
    const trendStrengthComponent = indicators.trend * indicators.adx * weights.trendStrength;
    const sentimentComponent = sentimentScore * weights.sentiment;
    const patternComponent = patternScore * weights.patterns;

    const finalScore =
      trendComponent +
      momentumComponent +
      meanReversionComponent +
      volumeComponent +
      trendStrengthComponent +
      sentimentComponent +
      patternComponent;

    // --- Adjustments & Dampening ---

    // Conflict Analysis
    const trendMomentumConflict = Math.abs(indicators.trend - momentumScore);
    let adjustedScore = finalScore;

    if (trendMomentumConflict > 1.2) {
      adjustedScore *= 0.6;
    } else if (trendMomentumConflict > 0.8) {
      adjustedScore *= 0.8;
    }

    if (indicators.volatility > 0.8) {
      adjustedScore *= 0.75;
    }

    // Boost if comprehensive agreement (Technicals + Sentiment + Patterns)
    const techDir = indicators.trend > 0 ? 1 : -1;
    const sentDir = sentimentScore > 0.2 ? 1 : sentimentScore < -0.2 ? -1 : 0;
    const patDir = patternScore > 0.2 ? 1 : patternScore < -0.2 ? -1 : 0;

    if (techDir === sentDir && sentDir === patDir) {
      adjustedScore *= 1.2; // 20% boost for strong confluence
    }

    // --- Output Determination ---

    let direction: PredictionResult['direction'] = 'Neutral';
    if (adjustedScore > 0.2) direction = 'Bullish';
    else if (adjustedScore < -0.2) direction = 'Bearish';

    const absScore = Math.abs(adjustedScore);
    let confidence: PredictionResult['confidence'] = 'Low';
    if (absScore > 0.6) confidence = 'High'; // Increased threshold slightly
    else if (absScore > 0.35) confidence = 'Medium';

    // --- Reasoning Generation ---

    const reasoning: string[] = [];

    // Technical
    if (Math.abs(indicators.trend) > 0.4) {
      const trendDir = indicators.trend > 0 ? 'bullish' : 'bearish';
      reasoning.push(`Strong ${trendDir} trend identified (ADX: ${(indicators.adx * 100).toFixed(0)}%)`);
    }

    // Momentum
    if (Math.abs(momentumScore) > 0.4) {
      reasoning.push(`${momentumScore > 0 ? 'Positive' : 'Negative'} momentum building across oscillators`);
    }

    // Sentiment
    if (sentiment && Math.abs(sentiment.score) > 0.25) {
      reasoning.push(`${sentiment.sentiment} market sentiment detected from news & social media`);
      if (sentiment.topKeywords.length > 0) {
        reasoning.push(`Market focus: ${sentiment.topKeywords.join(', ')}`);
      }
    }

    // Patterns
    if (patterns.length > 0) {
      patterns.forEach(p => {
        if (p.confidence > 0.7) {
          reasoning.push(`${p.name} pattern detected (${p.type})`);
        }
      });
    }

    // Volatility/Risk
    if (indicators.volatility > 0.7) {
      reasoning.push('High volatility detected - increased risk');
    }

    // Confluence
    if (techDir === sentDir && sentDir === patDir) {
      reasoning.push(`High conviction: Technicals, Sentiment, and Patterns all align ${techDir > 0 ? 'Bullish' : 'Bearish'}`);
    }

    if (reasoning.length === 0) {
      reasoning.push('Neutral market conditions - no strong signals');
    }

    return {
      direction,
      confidence,
      score: adjustedScore,
      reasoning,
      signalStrength: {
        trend: Math.abs(trendComponent),
        momentum: Math.abs(momentumComponent),
        meanReversion: Math.abs(meanReversionComponent),
        overall: absScore,
        sentiment: Math.abs(sentimentComponent),
        patterns: Math.abs(patternComponent)
      }
    };
  }
}
