import { Router } from 'express';
import {
  getUserWatchlist,
  getAssetById,
  getPredictionByAssetId,
  addToWatchlist,
  removeFromWatchlist
} from '../dataService';

const router = Router();

// GET /api/watchlist - Get user's watchlist with predictions
router.get('/', (req, res) => {
  try {
    // For now, using hardcoded user_id. In production, this would come from authentication
    const userId = 'user-1';

    const userWatchlist = getUserWatchlist(userId);

    const watchlist = userWatchlist.map(item => {
      const asset = getAssetById(item.asset_id);
      const prediction = getPredictionByAssetId(item.asset_id);

      if (!asset) return null;

      // Mock price changes (in production, this would come from real market data)
      const mockChanges = {
        'RELIANCE': { change: '+2.34%', isUp: true },
        'TCS': { change: '+1.12%', isUp: true },
        'INFY': { change: '-0.87%', isUp: false },
        'HDFCBANK': { change: '+0.45%', isUp: true },
        'ICICIBANK': { change: '-0.32%', isUp: false },
        'BTC': { change: '+3.21%', isUp: true },
        'ETH': { change: '-1.45%', isUp: false },
        'SOL': { change: '+5.67%', isUp: true },
      };

      const mockChange = mockChanges[asset.symbol as keyof typeof mockChanges] || { change: '0.00%', isUp: true };

      return {
        id: item.id,
        asset_id: asset.id, // Ensure asset_id is passed
        symbol: asset.symbol,
        name: asset.name,
        price: `₹${asset.current_price.toLocaleString('en-IN')}`,
        change: mockChange.change,
        isUp: mockChange.isUp,
        prediction: prediction?.prediction || 'Hold',
        accuracy: `${prediction?.confidence || 85}%`,
        type: asset.type
      };
    }).filter(Boolean);

    // Calculate stats
    const totalAssets = watchlist.length;
    const stocks = watchlist.filter(item => item!.type === 'stock').length;
    const avgAccuracy = watchlist.length > 0
      ? watchlist.reduce((sum, item) => sum + parseFloat(item!.accuracy.replace('%', '')), 0) / watchlist.length
      : 0;

    res.json({
      assets: watchlist,
      stats: {
        totalAssets,
        stocks,
        avgAccuracy: `${avgAccuracy.toFixed(1)}%`
      }
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist data' });
  }
});

// POST /api/watchlist - Add asset to watchlist
router.post('/', (req, res) => {
  try {
    const userId = 'user-1';
    const { assetId } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Missing assetId' });
    }

    const item = addToWatchlist(userId, assetId);
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/watchlist/:assetId - Remove asset from watchlist
router.delete('/:assetId', (req, res) => {
  try {
    const userId = 'user-1';
    const { assetId } = req.params;

    removeFromWatchlist(userId, assetId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
