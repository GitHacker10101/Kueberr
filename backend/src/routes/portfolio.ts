import { Router } from 'express';
import { getUserHoldings, getAllAssets, getPredictionByAssetId, addHolding, removeHolding } from '../dataService';

const router = Router();

// GET /api/portfolio - Get portfolio data
router.get('/', (req, res) => {
  try {
    const userId = 'user-1'; // Hardcoded for now

    // Force refresh from DB
    const holdings = getUserHoldings(userId);
    const assets = getAllAssets();

    // Calculate portfolio totals
    let totalValue = 0;
    let totalCost = 0;

    const holdingsWithDetails = holdings.map(holding => {
      const asset = assets.find(a => a.id === holding.asset_id);
      if (!asset) return null;

      const currentValue = holding.quantity * asset.current_price;
      const costBasis = holding.quantity * holding.average_price;
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      totalValue += currentValue;
      totalCost += costBasis;

      const prediction = getPredictionByAssetId(asset.id);

      return {
        id: holding.id, // Include holding ID for deletions
        asset_id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        quantity: holding.quantity,
        avgPrice: `₹${holding.average_price.toLocaleString('en-IN')}`,
        currentPrice: `₹${asset.current_price.toLocaleString('en-IN')}`,
        value: `₹${currentValue.toLocaleString('en-IN')}`,
        pnl: pnl >= 0 ? `+₹${pnl.toLocaleString('en-IN')}` : `-₹${Math.abs(pnl).toLocaleString('en-IN')}`,
        pnlPercent: pnlPercent >= 0 ? `+${pnlPercent.toFixed(2)}%` : `${pnlPercent.toFixed(2)}%`,
        isUp: pnl >= 0,
        prediction: prediction?.prediction || 'Hold'
      };
    }).filter(Boolean);

    const totalPnl = totalValue - totalCost;

    // Mock day/week changes (in real app, this would be calculated from historical data)
    // For now we'll just simulate a slight variance from total PnL
    const dayChange = totalPnl * 0.15;

    const portfolioData = {
      portfolio: {
        totalValue: `₹${totalValue.toLocaleString('en-IN')}`,
        dayChange: dayChange >= 0 ? `+₹${Math.abs(dayChange).toLocaleString('en-IN')}` : `-₹${Math.abs(dayChange).toLocaleString('en-IN')}`,
        dayChangePercent: totalValue > 0 ? `+${((dayChange / totalValue) * 100).toFixed(2)}%` : `0.00%`,
        totalPnl: totalPnl >= 0 ? `+₹${Math.abs(totalPnl).toLocaleString('en-IN')}` : `-₹${Math.abs(totalPnl).toLocaleString('en-IN')}`,
        totalPnlPercent: totalCost > 0 ? `${totalPnl >= 0 ? '+' : ''}${((totalPnl / totalCost) * 100).toFixed(2)}%` : `0.00%`,
        isUp: totalPnl >= 0,
        accuracy: "91.2%",
        activeAlerts: 8,
        alertsTriggeredToday: 3
      },
      holdings: holdingsWithDetails
    };

    res.json(portfolioData);
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/portfolio - Add a holding
router.post('/', (req, res) => {
  try {
    const userId = 'user-1';
    const { assetId, quantity, price } = req.body;

    if (!assetId || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const holding = addHolding(userId, assetId, Number(quantity), Number(price));
    res.status(201).json(holding);
  } catch (error) {
    console.error('Error adding holding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/portfolio/:id - Remove a holding
router.delete('/:id', (req, res) => {
  try {
    const userId = 'user-1';
    const { id } = req.params;

    removeHolding(id, userId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing holding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
