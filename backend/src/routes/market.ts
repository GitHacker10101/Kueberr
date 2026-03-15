import { Router } from 'express';
import { getAssetById, getAllAssets, getAssetBySymbol, upsertAssetBySymbol } from '../dataService';
import { fetchMarketData, fetchMarketNews, getLatestPrice, getQuoteSnapshot } from '../services/marketDataService';
import { setResponseMeta } from '../middleware/responseMeta';

const router = Router();

// GET /api/market/stocks - Get all assets (for search)
router.get('/stocks', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'market:asset-universe', quality_status: 'ok' });
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const limitRaw = Number.parseInt(String(req.query.limit ?? '250'), 10);
    const limit = Math.min(2000, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 250));
    const assets = getAllAssets()
      .filter((asset) => {
        if (!q) return true;
        return asset.symbol.toLowerCase().includes(q) || asset.name.toLowerCase().includes(q);
      })
      .slice(0, limit);

    res.json({
      items: assets,
      count: assets.length,
      query: q,
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    setResponseMeta(res, { data_source: 'market:asset-universe', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST /api/market/stocks/register - Register a symbol not in local universe yet
router.post('/stocks/register', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'market:asset-universe', quality_status: 'ok' });
    const symbol = String(req.body?.symbol ?? '').trim().toUpperCase();
    const name = String(req.body?.name ?? '').trim();

    if (!symbol) {
      res.status(400).json({ error: 'symbol is required' });
      return;
    }

    const existing = getAssetBySymbol(symbol);
    if (existing) {
      res.json(existing);
      return;
    }

    const asset = upsertAssetBySymbol(symbol, name || symbol);
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error registering symbol:', error);
    setResponseMeta(res, { data_source: 'market:asset-universe', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Failed to register symbol' });
  }
});

// GET /api/market/ohlc/:assetId - Get OHLC data for charts
router.get('/ohlc/:assetId', async (req, res) => {
  setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'ok' });
  const { assetId } = req.params;
  const asset = getAssetById(assetId);

  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  try {
    const candles = await fetchMarketData(asset.symbol, 160, { allowSyntheticFallback: false });
    const data = candles.slice(-90).map((row) => ({
      t: row.date.toISOString().split('T')[0],
      o: Number(row.open.toFixed(2)),
      h: Number(row.high.toFixed(2)),
      l: Number(row.low.toFixed(2)),
      c: Number(row.close.toFixed(2)),
      v: Math.max(0, Math.round(row.volume)),
    }));

    const latestPrice = await getLatestPrice(asset.symbol, { allowHistoricalFallback: true });
    if (latestPrice > 0) {
      data.push({
        t: new Date().toISOString().split('T')[0],
        o: Number(latestPrice.toFixed(2)),
        h: Number(latestPrice.toFixed(2)),
        l: Number(latestPrice.toFixed(2)),
        c: Number(latestPrice.toFixed(2)),
        v: 0,
      });
    }

    res.json({
      symbol: asset.symbol,
      name: asset.name,
      data,
      latestPrice: latestPrice > 0 ? Number(latestPrice.toFixed(2)) : null,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`OHLC fetch failed for ${asset.symbol}:`, error);
    setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'unavailable' });
    res.status(503).json({ error: `Live market data unavailable for ${asset.symbol}` });
  }
});

router.get('/quote/:assetId', async (req, res) => {
  setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'ok' });
  const { assetId } = req.params;
  const asset = getAssetById(assetId);
  if (!asset) {
    setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'unavailable' });
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  try {
    const snapshot = await getQuoteSnapshot(asset.symbol);

    res.json({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      price: snapshot.price > 0 ? Number(snapshot.price.toFixed(2)) : null,
      changePercent1d: snapshot.changePercent1d !== null ? Number(snapshot.changePercent1d.toFixed(3)) : null,
      volume: snapshot.volume,
      asOf: snapshot.asOf,
    });
  } catch (error) {
    console.error(`Quote fetch failed for ${asset.symbol}:`, error);
    setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'unavailable' });
    res.status(503).json({ error: `Live quote unavailable for ${asset.symbol}` });
  }
});

router.get('/indices', async (_req, res) => {
  setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'ok' });

  const indexUniverse = [
    { id: 'nifty50', name: 'NIFTY 50', symbol: '^NSEI' },
    { id: 'sensex', name: 'SENSEX', symbol: '^BSESN' },
    { id: 'sp500', name: 'S&P 500', symbol: '^GSPC' },
    { id: 'nasdaq100', name: 'NASDAQ 100', symbol: '^NDX' },
  ];

  try {
    const rows = await Promise.all(
      indexUniverse.map(async (item) => {
        try {
          const snapshot = await getQuoteSnapshot(item.symbol);
          return {
            id: item.id,
            name: item.name,
            symbol: item.symbol,
            value: Number(snapshot.price.toFixed(2)),
            change: snapshot.previousClose ? Number((snapshot.price - snapshot.previousClose).toFixed(2)) : null,
            percent: snapshot.changePercent1d !== null ? Number(snapshot.changePercent1d.toFixed(3)) : null,
            isUp: snapshot.changePercent1d !== null ? snapshot.changePercent1d >= 0 : null,
            asOf: snapshot.asOf,
          };
        } catch {
          return null;
        }
      })
    );

    const indices = rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
    if (indices.length === 0) {
      setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'unavailable' });
      res.status(503).json({ error: 'Live indices unavailable' });
      return;
    }

    res.json({
      items: indices,
      count: indices.length,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Index fetch failed:', error);
    setResponseMeta(res, { data_source: 'market:yahoo', quality_status: 'unavailable' });
    res.status(503).json({ error: 'Failed to fetch indices' });
  }
});

router.get('/news', async (req, res) => {
  setResponseMeta(res, { data_source: 'market:yahoo-news', quality_status: 'ok' });
  const symbolsRaw = String(req.query.symbols ?? '').trim();
  const limitRaw = Number.parseInt(String(req.query.limit ?? '40'), 10);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitRaw) ? limitRaw : 40));
  const symbols =
    symbolsRaw.length > 0
      ? symbolsRaw
          .split(',')
          .map((item) => item.trim().toUpperCase())
          .filter((item) => item.length > 0)
      : ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'];

  const sentimentFromText = (text: string): 'positive' | 'negative' | 'neutral' => {
    const lower = text.toLowerCase();
    const positiveTokens = ['surge', 'beat', 'growth', 'rise', 'rally', 'gain', 'record'];
    const negativeTokens = ['drop', 'fall', 'miss', 'loss', 'cut', 'decline', 'risk', 'selloff'];
    if (positiveTokens.some((token) => lower.includes(token))) return 'positive';
    if (negativeTokens.some((token) => lower.includes(token))) return 'negative';
    return 'neutral';
  };

  try {
    const news = await fetchMarketNews(symbols, limit);
    const payload = news.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      content: item.summary,
      source: item.source,
      publishedAt: item.publishedAt,
      category: 'market',
      sentiment: sentimentFromText(`${item.title} ${item.summary}`),
      relatedAssets: [item.symbol.toLowerCase()],
      url: item.url,
    }));

    res.json({
      items: payload,
      count: payload.length,
      symbols,
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    console.error('News fetch failed:', error);
    setResponseMeta(res, { data_source: 'market:yahoo-news', quality_status: 'unavailable' });
    res.status(503).json({ error: 'Failed to fetch live market news' });
  }
});

export default router;
