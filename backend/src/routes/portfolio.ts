import { Router } from 'express';
import { addHolding, getAllAssets, getUserAlerts, getUserHoldings, removeHolding } from '../dataService';
import { fetchMarketData, getLatestPrice } from '../services/marketDataService';
import { getQuantPrediction, isQuantServiceEnabled } from '../services/quantBridge';
import { setResponseMeta } from '../middleware/responseMeta';

const router = Router();

const USER_ID = 'user-1';

const toNumber = (value: unknown, fallback: number = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: number): string => `Rs ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatSignedCurrency = (value: number): string => `${value >= 0 ? '+' : '-'}Rs ${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const formatSignedPct = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

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

const resolveDayWeekChange = async (symbol: string, latestPrice: number): Promise<{ dayChange: number; weekChange: number }> => {
  try {
    const candles = await fetchMarketData(symbol, 12, { allowSyntheticFallback: false });
    if (candles.length < 7) {
      return { dayChange: 0, weekChange: 0 };
    }
    const closes = candles.map((row) => row.close).filter((value) => Number.isFinite(value) && value > 0);
    const prevDay = closes[closes.length - 2];
    const prevWeek = closes[closes.length - 6];
    const dayChange = prevDay ? latestPrice - prevDay : 0;
    const weekChange = prevWeek ? latestPrice - prevWeek : 0;
    return { dayChange, weekChange };
  } catch {
    return { dayChange: 0, weekChange: 0 };
  }
};

// GET /api/portfolio - Get portfolio data
router.get('/', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'portfolio:ledger+market', quality_status: 'ok' });
    const holdings = getUserHoldings(USER_ID);
    const assets = getAllAssets();

    let totalValue = 0;
    let totalCost = 0;
    let dayChangeValue = 0;
    let weekChangeValue = 0;

    let degraded = false;
    const holdingsWithDetails = await Promise.all(
      holdings.map(async (holding) => {
        const asset = assets.find((item) => item.id === holding.asset_id);
        if (!asset) return null;

        const fallbackPrice = toNumber(asset.current_price, 0);
        const latestPriceRaw = await getLatestPrice(asset.symbol, { allowHistoricalFallback: true });
        const latestPrice = latestPriceRaw > 0 ? latestPriceRaw : fallbackPrice;
        if (latestPrice <= 0) return null;

        const currentValue = holding.quantity * latestPrice;
        const costBasis = holding.quantity * holding.average_price;
        const pnl = currentValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        const changes = await resolveDayWeekChange(asset.symbol, latestPrice);

        totalValue += currentValue;
        totalCost += costBasis;
        dayChangeValue += changes.dayChange * holding.quantity;
        weekChangeValue += changes.weekChange * holding.quantity;

        const prediction = await resolveLivePrediction(asset.symbol);
        if (!prediction.available) {
          degraded = true;
        }
        return {
          id: holding.id,
          asset_id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          quantity: holding.quantity,
          avgPrice: formatCurrency(holding.average_price),
          currentPrice: formatCurrency(latestPrice),
          value: formatCurrency(currentValue),
          pnl: formatSignedCurrency(pnl),
          pnlPercent: formatSignedPct(pnlPercent),
          isUp: pnl >= 0,
          prediction: prediction.label,
          predictionConfidence: prediction.confidence,
        };
      })
    );

    const filteredHoldings = holdingsWithDetails.filter((item): item is NonNullable<typeof item> => Boolean(item));
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const accuracy =
      filteredHoldings.length > 0
        ? filteredHoldings.reduce((acc, item) => acc + (item.predictionConfidence ?? 0), 0) /
          Math.max(
            1,
            filteredHoldings.filter((item) => typeof item.predictionConfidence === 'number').length
          )
        : 0;

    const userAlerts = getUserAlerts(USER_ID);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const alertsTriggeredToday = userAlerts.filter((alert) => {
      if (!alert.is_triggered) return false;
      const triggeredAt = (alert as unknown as { triggered_at?: string }).triggered_at;
      if (!triggeredAt) return false;
      const dt = new Date(triggeredAt);
      return Number.isFinite(dt.getTime()) && dt >= todayStart;
    }).length;

    if (degraded) {
      setResponseMeta(res, { data_source: 'portfolio:ledger+market', quality_status: 'degraded' });
    }
    res.json({
      portfolio: {
        totalValue: formatCurrency(totalValue),
        dayChange: formatSignedCurrency(dayChangeValue),
        dayChangePercent: formatSignedPct(totalValue > 0 ? (dayChangeValue / totalValue) * 100 : 0),
        weekChange: formatSignedCurrency(weekChangeValue),
        totalPnl: formatSignedCurrency(totalPnl),
        totalPnlPercent: formatSignedPct(totalPnlPercent),
        isUp: totalPnl >= 0,
        accuracy: Number.isFinite(accuracy) && accuracy > 0 ? `${accuracy.toFixed(1)}%` : 'N/A',
        activeAlerts: userAlerts.filter((alert) => alert.is_active).length,
        alertsTriggeredToday,
      },
      holdings: filteredHoldings,
    });
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    setResponseMeta(res, { data_source: 'portfolio:ledger+market', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/portfolio - Add a holding
router.post('/', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'portfolio:ledger', quality_status: 'ok' });
    const { assetId, quantity, price } = req.body;
    const qty = toNumber(quantity, 0);
    const avgPrice = toNumber(price, 0);

    if (!assetId || qty <= 0 || avgPrice <= 0) {
      res.status(400).json({ error: 'assetId, quantity, and price are required' });
      return;
    }

    const holding = addHolding(USER_ID, String(assetId), qty, avgPrice);
    res.status(201).json(holding);
  } catch (error) {
    console.error('Error adding holding:', error);
    setResponseMeta(res, { data_source: 'portfolio:ledger', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/portfolio/:id - Remove a holding
router.delete('/:id', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'portfolio:ledger', quality_status: 'ok' });
    removeHolding(req.params.id, USER_ID);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing holding:', error);
    setResponseMeta(res, { data_source: 'portfolio:ledger', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
