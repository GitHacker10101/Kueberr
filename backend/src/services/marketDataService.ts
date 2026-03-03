import yahooFinance from 'yahoo-finance2';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
const REQUEST_DELAY = 1000; // 1 second delay between requests to avoid rate limiting
let lastRequestTime = 0;

export interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchMarketData = async (symbol: string, days: number = 200): Promise<HistoricalData[]> => {
  const cacheKey = `market_data_${symbol}_${days}`;
  const cachedData = cache.get<HistoricalData[]>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_DELAY) {
    await sleep(REQUEST_DELAY - (now - lastRequestTime));
  }
  
  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - (days * 1.5)); // Fetch extra buffer for indicators
    
    const queryOptions = {
      period1: period1.toISOString().split('T')[0],
      interval: '1d' as const,
    };

    const result = await yahooFinance.historical(symbol, queryOptions);
    lastRequestTime = Date.now();

    const formattedData: HistoricalData[] = result.map(quote => ({
      date: quote.date,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume
    })).filter(d => d.close !== null); // Filter out nulls

    // Sort ascending by date
    formattedData.sort((a, b) => a.date.getTime() - b.date.getTime());

    cache.set(cacheKey, formattedData);
    return formattedData;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    throw new Error(`Failed to fetch market data for ${symbol}`);
  }
};

export const getLatestPrice = async (symbol: string): Promise<number> => {
  try {
    const quote = await yahooFinance.quote(symbol);
    return quote.regularMarketPrice || 0;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return 0;
  }
};
