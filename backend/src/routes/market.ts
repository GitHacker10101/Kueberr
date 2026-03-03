import { Router } from 'express';
import { getAssetById, getAllAssets } from '../dataService';

const router = Router();

// GET /api/market/stocks - Get all assets (for search)
router.get('/stocks', (req, res) => {
  try {
    const assets = getAllAssets();
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/market/ohlc/:assetId - Get OHLC data for charts
router.get('/ohlc/:assetId', (req, res) => {
  const { assetId } = req.params;
  const asset = getAssetById(assetId);

  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }

  // Generate mock OHLC data
  const data = [];
  let price = asset.current_price;
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const volatility = price * 0.02;
    const open = price + (Math.random() - 0.5) * volatility;
    const close = price + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;

    data.push({
      t: date.toISOString().split('T')[0],
      o: Number(open.toFixed(2)),
      h: Number(high.toFixed(2)),
      l: Number(low.toFixed(2)),
      c: Number(close.toFixed(2))
    });

    price = close;
  }

  res.json({ data });
});

export default router;
