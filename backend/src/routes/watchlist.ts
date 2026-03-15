import { Router } from 'express';
import { addToWatchlist, getAllAssets, getUserWatchlist, removeFromWatchlist } from '../dataService';
import { fetchMarketData, getLatestPrice } from '../services/marketDataService';
import { getQuantPrediction, isQuantServiceEnabled } from '../services/quantBridge';
import { setResponseMeta } from '../middleware/responseMeta';

const router = Router();
const USER_ID = 'user-1';

const formatPrice = (value: number): string => `Rs ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatPct = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const predictionFromDirection = (direction: 'Bullish' | 'Neutral' | 'Bearish', confidence: number): string => {
  if (direction === 'Bullish') return confidence >= 86 ? 'Strong Buy' : 'Buy';
  if (direction === 'Bearish') return confidence >= 86 ? 'Strong Sell' : 'Sell';
  return 'Hold';
};

const resolveLivePrediction = async (
  symbol: string
): Promise<{ label: string; confidence: number | null; available: boolean }> => {
  if (!isQuantServiceEnabled()) {
    return { label: 'Unavailable', confidence: null, available: false };
  }
  try {
    const pred = await getQuantPrediction(symbol, 'monthly');
    const confidence = Math.round(Math.max(0, Math.min(100, pred.confidence)));
    return {
      label: predictionFromDirection(pred.direction, confidence),
      confidence,
      available: true,
    };
  } catch {
    return { label: 'Unavailable', confidence: null, available: false };
  }
};

const dayChangePct = async (symbol: string, latestPrice: number): Promise<number> => {
  try {
    const candles = await fetchMarketData(symbol, 8, { allowSyntheticFallback: false });
    if (candles.length < 2) return 0;
    const prev = candles[candles.length - 2]?.close ?? latestPrice;
    if (!prev || prev <= 0) return 0;
    return ((latestPrice - prev) / prev) * 100;
  } catch {
    return 0;
  }
};

// GET /api/watchlist - Get user's watchlist with predictions
router.get('/', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'watchlist:db+market', quality_status: 'ok' });
    const userWatchlist = getUserWatchlist(USER_ID);
    const assets = getAllAssets();
    let degraded = false;

    const items = await Promise.all(
      userWatchlist.map(async (entry) => {
        const asset = assets.find((item) => item.id === entry.asset_id);
        if (!asset) return null;

        const latestPriceRaw = await getLatestPrice(asset.symbol, { allowHistoricalFallback: true });
        const latestPrice = latestPriceRaw > 0 ? latestPriceRaw : Number(asset.current_price ?? 0);
        if (!(latestPrice > 0)) return null;

        const prediction = await resolveLivePrediction(asset.symbol);
        if (!prediction.available) {
          degraded = true;
        }
        const changePct = await dayChangePct(asset.symbol, latestPrice);

        return {
          id: entry.id,
          asset_id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          price: formatPrice(latestPrice),
          change: formatPct(changePct),
          isUp: changePct >= 0,
          prediction: prediction.label,
          accuracy: prediction.confidence !== null ? `${prediction.confidence.toFixed(1)}%` : 'N/A',
          type: asset.type,
        };
      })
    );

    const watchlist = items.filter((item): item is NonNullable<typeof item> => Boolean(item));
    const numericAccuracy = watchlist
      .map((item) => Number.parseFloat(item.accuracy.replace('%', '')))
      .filter((value) => Number.isFinite(value));
    const avgAccuracy = numericAccuracy.length > 0 ? numericAccuracy.reduce((sum, item) => sum + item, 0) / numericAccuracy.length : 0;

    if (degraded) {
      setResponseMeta(res, { data_source: 'watchlist:db+market', quality_status: 'degraded' });
    }

    res.json({
      assets: watchlist,
      stats: {
        totalAssets: watchlist.length,
        stocks: watchlist.filter((item) => item.type === 'stock').length,
        avgAccuracy: numericAccuracy.length > 0 ? `${avgAccuracy.toFixed(1)}%` : 'N/A',
      },
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    setResponseMeta(res, { data_source: 'watchlist:db+market', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Failed to fetch watchlist data' });
  }
});

// POST /api/watchlist - Add asset to watchlist
router.post('/', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'watchlist:db', quality_status: 'ok' });
    const assetId = String(req.body?.assetId ?? '').trim();
    if (!assetId) {
      res.status(400).json({ error: 'Missing assetId' });
      return;
    }

    const item = addToWatchlist(USER_ID, assetId);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    setResponseMeta(res, { data_source: 'watchlist:db', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/watchlist/:assetId - Remove asset from watchlist
router.delete('/:assetId', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'watchlist:db', quality_status: 'ok' });
    removeFromWatchlist(USER_ID, req.params.assetId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    setResponseMeta(res, { data_source: 'watchlist:db', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
