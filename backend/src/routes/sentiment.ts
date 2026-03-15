import { Router } from 'express';
import { getAllAssets } from '../dataService';
import { getQuoteSnapshot } from '../services/marketDataService';
import { setResponseMeta } from '../middleware/responseMeta';

const router = Router();

// GET /api/sentiment - Get market sentiment
router.get('/', async (_req, res) => {
  setResponseMeta(res, { data_source: 'sentiment:price-derived', quality_status: 'ok' });

  const universe = getAllAssets().slice(0, 40);
  if (universe.length === 0) {
    setResponseMeta(res, { data_source: 'sentiment:price-derived', quality_status: 'unavailable' });
    res.status(503).json({ error: 'No asset universe available for sentiment computation' });
    return;
  }

  const rows = await Promise.all(
    universe.map(async (asset) => {
      try {
        const snapshot = await getQuoteSnapshot(asset.symbol);
        if (snapshot.changePercent1d === null) return null;
        return {
          symbol: asset.symbol,
          name: asset.name,
          dayRet: snapshot.changePercent1d,
        };
      } catch {
        return null;
      }
    })
  );

  const valid = rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (valid.length < 2) {
    setResponseMeta(res, { data_source: 'sentiment:price-derived', quality_status: 'unavailable' });
    res.status(503).json({ error: 'Insufficient live data for sentiment computation' });
    return;
  }

  const avgRet = valid.reduce((sum, item) => sum + item.dayRet, 0) / valid.length;
  const upCount = valid.filter((item) => item.dayRet > 0).length;
  const downCount = valid.filter((item) => item.dayRet < 0).length;
  const flatCount = valid.length - upCount - downCount;

  const rawScore = 50 + avgRet * 14 + ((upCount - downCount) / valid.length) * 24;
  const score = Math.max(0, Math.min(100, Number(rawScore.toFixed(1))));
  const overall = score >= 60 ? 'Bullish' : score <= 40 ? 'Bearish' : 'Neutral';

  const sorted = [...valid].sort((a, b) => b.dayRet - a.dayRet);
  const topGainers = sorted.slice(0, 4).map((item) => ({
    symbol: item.symbol,
    changePct: Number(item.dayRet.toFixed(2)),
  }));
  const topLosers = sorted.slice(-4).reverse().map((item) => ({
    symbol: item.symbol,
    changePct: Number(item.dayRet.toFixed(2)),
  }));

  res.json({
    overall,
    score,
    breadth: {
      up: upCount,
      down: downCount,
      flat: flatCount,
      sampleSize: valid.length,
    },
    drivers: {
      topGainers,
      topLosers,
      avgReturnPct: Number(avgRet.toFixed(3)),
    },
    factors: [
      `${upCount}/${valid.length} symbols closed positive`,
      `Average 1D return ${avgRet.toFixed(2)}%`,
      `Live sample size: ${valid.length}`,
    ],
    generatedAt: new Date().toISOString(),
  });
});

export default router;
