
export interface Pattern {
    name: string;
    type: 'Bullish' | 'Bearish' | 'Neutral';
    significance: 'Low' | 'Medium' | 'High';
    confidence: number; // 0 to 1
    description: string;
}

export class PatternRecognizer {
    /**
     * Detects chart patterns from price history
     * @param prices Array of closing prices (chronological:oldest to newest)
     */
    static detectPatterns(prices: number[]): Pattern[] {
        const patterns: Pattern[] = [];
        const len = prices.length;
        if (len < 20) return patterns; // Need enough data

        const currentPrice = prices[len - 1];
        const prevPrice = prices[len - 2];

        // 1. Detect Double Bottom (Bullish)
        // Simplified logic: Look for two lows at roughly same level separated by a peak
        // real implementation would use zig-zag algorithms
        if (this.isDoubleBottom(prices)) {
            patterns.push({
                name: 'Double Bottom',
                type: 'Bullish',
                significance: 'High',
                confidence: 0.85,
                description: 'Price formed two distinct lows at a similar level, indicating strong support.'
            });
        }

        // 2. Detect Head and Shoulders (Bearish)
        if (this.isHeadAndShoulders(prices)) {
            patterns.push({
                name: 'Head and Shoulders',
                type: 'Bearish',
                significance: 'High',
                confidence: 0.9,
                description: ' classic reversal pattern with three peaks, the middle one being the highest.'
            });
        }

        // 3. Simple Momentum Breakout
        const recentHigh = Math.max(...prices.slice(len - 20, len - 1));
        if (currentPrice !== undefined && currentPrice > recentHigh) {
            patterns.push({
                name: '20-Day Breakout',
                type: 'Bullish',
                significance: 'Medium',
                confidence: 0.75,
                description: 'Price broke above the 20-day high, signalling potential trend continuation.'
            });
        }

        // 4. Consolidation (Squeeze)
        const recentPrices = prices.slice(len - 10);
        const stdDev = this.calculateStdDev(recentPrices);
        const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

        if ((stdDev / avgPrice) < 0.01) { // Very low volatility
            patterns.push({
                name: 'Volatility Squeeze',
                type: 'Neutral',
                significance: 'Medium',
                confidence: 0.6,
                description: 'Price is consolidating in a tight range, expecting a violent move soon.'
            });
        }

        return patterns;
    }

    private static isDoubleBottom(prices: number[]): boolean {
        // Placeholder for complex pattern matching logic
        // Just returning false for safety unless we implement full zig-zag
        return false;
    }

    private static isHeadAndShoulders(prices: number[]): boolean {
        // Placeholder
        return false;
    }

    private static calculateStdDev(data: number[]): number {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
        return Math.sqrt(variance);
    }
}
