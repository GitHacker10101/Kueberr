
export interface SentimentResult {
    score: number; // -1 (Negative) to 1 (Positive)
    magnitude: number; // 0 to 1 (Intensity)
    sources: number; // Number of sources analyzed
    topKeywords: string[];
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
}

export class SentimentAnalyzer {
    // Dictionary of financial sentiment words
    private static bullWords = new Set([
        'growth', 'record', 'gain', 'up', 'bull', 'rally', 'surge', 'beat', 'profit',
        'upgrade', 'buy', 'positive', 'higher', 'strong', 'outperform', 'exceed'
    ]);

    private static bearWords = new Set([
        'loss', 'drop', 'decline', 'down', 'bear', 'crash', 'slump', 'miss', 'warn',
        'downgrade', 'sell', 'negative', 'lower', 'weak', 'underperform', 'recession'
    ]);

    /**
     * analyzes text or headlines to determine sentiment
     * @param text The text to analyze
     */
    static analyzeText(text: string): SentimentResult {
        const tokens = text.toLowerCase().split(/\W+/);
        let score = 0;
        let matches = 0;
        const keywords: string[] = [];

        tokens.forEach(token => {
            if (this.bullWords.has(token)) {
                score += 1;
                matches++;
                keywords.push(token);
            } else if (this.bearWords.has(token)) {
                score -= 1;
                matches++;
                keywords.push(token);
            }
        });

        // Normalize score
        const totalTokens = tokens.length;
        let normalizedScore = totalTokens > 0 && matches > 0 ? (score / matches) : 0;

        // Dampen extreme scores for short texts
        if (totalTokens < 10) normalizedScore *= 0.8;

        return {
            score: normalizedScore,
            magnitude: Math.min(Math.abs(score) / 5, 1), // Cap magnitude
            sources: 1,
            topKeywords: [...new Set(keywords)].slice(0, 5),
            sentiment: normalizedScore > 0.1 ? 'Bullish' : normalizedScore < -0.1 ? 'Bearish' : 'Neutral'
        };
    }

    /**
     * Simulates fetching social sentiment for a stock
     * In a real app, this would call Twitter/Reddit APIs
     */
    static async getStockSentiment(symbol: string): Promise<SentimentResult> {
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 50));

        // Mock complex sentiment logic based on symbol hash
        const hash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const dayMod = new Date().getDate();

        // Deterministic pseudo-randomness for demo consistency
        const baseScore = Math.sin(hash + dayMod);
        const randomNoise = (Math.random() - 0.5) * 0.4;

        const finalScore = Math.max(-1, Math.min(1, baseScore + randomNoise));

        return {
            score: finalScore,
            magnitude: 0.4 + Math.random() * 0.6,
            sources: 100 + Math.floor(Math.random() * 500),
            topKeywords: finalScore > 0 ? ['growth', 'breakout', 'volume'] : ['resistance', 'drop', 'profit-booking'],
            sentiment: finalScore > 0.15 ? 'Bullish' : finalScore < -0.15 ? 'Bearish' : 'Neutral'
        };
    }

    /**
     * Aggregates sentiment from multiple sources
     */
    static aggregateSentiment(results: SentimentResult[]): SentimentResult {
        if (results.length === 0) return { score: 0, magnitude: 0, sources: 0, topKeywords: [], sentiment: 'Neutral' };

        const totalWeight = results.reduce((acc, r) => acc + r.sources, 0);
        const weightedScore = results.reduce((acc, r) => acc + (r.score * r.sources), 0) / totalWeight;
        const avgMagnitude = results.reduce((acc, r) => acc + r.magnitude, 0) / results.length;

        const allKeywords = results.flatMap(r => r.topKeywords);
        // basic frequency count for keywords could go here

        return {
            score: weightedScore,
            magnitude: avgMagnitude,
            sources: totalWeight,
            topKeywords: allKeywords.slice(0, 5), // Just take first 5 for now
            sentiment: weightedScore > 0.1 ? 'Bullish' : weightedScore < -0.1 ? 'Bearish' : 'Neutral'
        };
    }
}
