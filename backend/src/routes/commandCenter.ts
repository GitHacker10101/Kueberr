import express from 'express';
import http from 'http';
import https from 'https';
import {
  cancelQuantPaperOrder,
  createQuantPaperOrder,
  createQuantPortfolioTransaction,
  getQuantPaperFills,
  getQuantPaperOrders,
  getQuantPortfolioPositions,
  getQuantRiskSnapshot,
  getQuantServiceBaseUrl,
  isQuantServiceEnabled,
  runQuantRebalance,
  runQuantStress,
  type QuantPaperOrderRequest,
  type QuantPortfolioTransactionRequest,
} from '../services/quantBridge';
import { setResponseMeta } from '../middleware/responseMeta';

const router = express.Router();

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const toNumber = (raw: unknown, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const toUserId = (raw: unknown): string => {
  const value = String(raw ?? 'user-1').trim();
  return value || 'user-1';
};
const parseStreamBaseUrl = (): URL => {
  const raw = getQuantServiceBaseUrl();
  return new URL(raw.endsWith('/') ? raw : `${raw}/`);
};

const sendQuantUnavailable = (res: express.Response): void => {
  setResponseMeta(res, { data_source: 'quant:gateway', quality_status: 'unavailable' });
  res.status(503).json({ error: 'Quant service is disabled or unavailable' });
};

const optionalString = (raw: unknown): string | null => {
  if (raw === undefined || raw === null) {
    return null;
  }
  const value = String(raw).trim();
  return value ? value : null;
};

const optionalNumber = (raw: unknown): number | null => {
  if (raw === undefined || raw === null) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

router.post('/portfolio/transactions', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:portfolio', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }

    const timestamp = optionalString(req.body?.timestamp);
    const payload: QuantPortfolioTransactionRequest = {
      user_id: toUserId(req.body?.user_id),
      symbol: String(req.body?.symbol ?? '').trim().toUpperCase(),
      side: String(req.body?.side ?? '').trim().toUpperCase() as 'BUY' | 'SELL',
      quantity: toNumber(req.body?.quantity, 0),
      price: toNumber(req.body?.price, 0),
      fees: toNumber(req.body?.fees, 0),
    };
    if (timestamp) {
      payload.timestamp = timestamp;
    }
    const response = await createQuantPortfolioTransaction(payload);
    res.status(201).json(response);
  } catch (error) {
    console.error('Command portfolio transaction error:', error);
    setResponseMeta(res, { data_source: 'quant:portfolio', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to create portfolio transaction' });
  }
});

router.get('/portfolio/positions', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:portfolio', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.query.user_id);
    const response = await getQuantPortfolioPositions(userId);
    res.json(response);
  } catch (error) {
    console.error('Command portfolio positions error:', error);
    setResponseMeta(res, { data_source: 'quant:portfolio', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to fetch positions' });
  }
});

router.get('/risk/snapshot', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:risk', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.query.user_id);
    const lookbackDays = clamp(toNumber(req.query.lookback_days, 365), 120, 3000);
    const response = await getQuantRiskSnapshot(userId, lookbackDays);
    res.json(response);
  } catch (error) {
    console.error('Command risk snapshot error:', error);
    setResponseMeta(res, { data_source: 'quant:risk', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to fetch risk snapshot' });
  }
});

router.post('/stress/run', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:stress', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.body?.user_id);
    const scenariosRaw = Array.isArray(req.body?.scenarios) ? req.body.scenarios : [];
    const scenarios = scenariosRaw
      .map((item: unknown) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null))
      .filter((item: Record<string, unknown> | null): item is Record<string, unknown> => item !== null);

    const response = await runQuantStress(userId, scenarios);
    res.json(response);
  } catch (error) {
    console.error('Command stress run error:', error);
    setResponseMeta(res, { data_source: 'quant:stress', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to run stress scenarios' });
  }
});

router.post('/optimizer/rebalance', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:optimizer', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.body?.user_id);
    const constraints =
      typeof req.body?.constraints === 'object' && req.body?.constraints !== null
        ? (req.body.constraints as Record<string, unknown>)
        : {};
    const response = await runQuantRebalance(userId, constraints);
    res.json(response);
  } catch (error) {
    console.error('Command rebalance error:', error);
    setResponseMeta(res, { data_source: 'quant:optimizer', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to compute rebalance' });
  }
});

router.post('/paper/orders', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const limitPrice = optionalNumber(req.body?.limit_price);
    const stopPrice = optionalNumber(req.body?.stop_price);
    const timestamp = optionalString(req.body?.timestamp);
    const idempotencyKey = optionalString(req.body?.idempotency_key);

    const payload: QuantPaperOrderRequest = {
      user_id: toUserId(req.body?.user_id),
      symbol: String(req.body?.symbol ?? '').trim().toUpperCase(),
      side: String(req.body?.side ?? '').trim().toUpperCase() as 'BUY' | 'SELL',
      type: String(req.body?.type ?? 'market').trim().toLowerCase() as QuantPaperOrderRequest['type'],
      quantity: toNumber(req.body?.quantity, 0),
      time_in_force: req.body?.time_in_force ? String(req.body.time_in_force).trim().toUpperCase() as 'DAY' | 'GTC' | 'IOC' : 'DAY',
    };
    if (limitPrice !== null) {
      payload.limit_price = limitPrice;
    }
    if (stopPrice !== null) {
      payload.stop_price = stopPrice;
    }
    if (timestamp) {
      payload.timestamp = timestamp;
    }
    if (idempotencyKey) {
      payload.idempotency_key = idempotencyKey;
    }
    const response = await createQuantPaperOrder(payload);
    res.status(201).json(response);
  } catch (error) {
    console.error('Command create paper order error:', error);
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to create paper order' });
  }
});

router.get('/paper/orders', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.query.user_id);
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = clamp(toNumber(req.query.limit, 50), 1, 250);
    const offset = clamp(toNumber(req.query.offset, 0), 0, 5000);
    const response = await getQuantPaperOrders(userId, status, limit, offset);
    res.json(response);
  } catch (error) {
    console.error('Command list paper orders error:', error);
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to list paper orders' });
  }
});

router.post('/paper/orders/:orderId/cancel', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.query.user_id ?? req.body?.user_id);
    const orderId = String(req.params.orderId ?? '').trim();
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }
    const response = await cancelQuantPaperOrder(userId, orderId);
    res.json(response);
  } catch (error) {
    console.error('Command cancel order error:', error);
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to cancel order' });
  }
});

router.get('/paper/fills', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'ok' });
    if (!isQuantServiceEnabled()) {
      sendQuantUnavailable(res);
      return;
    }
    const userId = toUserId(req.query.user_id);
    const limit = clamp(toNumber(req.query.limit, 100), 1, 500);
    const offset = clamp(toNumber(req.query.offset, 0), 0, 5000);
    const response = await getQuantPaperFills(userId, limit, offset);
    res.json(response);
  } catch (error) {
    console.error('Command list fills error:', error);
    setResponseMeta(res, { data_source: 'quant:paper-oms', quality_status: 'degraded' });
    res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to list paper fills' });
  }
});

router.get('/stream', async (req, res) => {
  if (!isQuantServiceEnabled()) {
    sendQuantUnavailable(res);
    return;
  }

  const userId = toUserId(req.query.user_id);
  const base = parseStreamBaseUrl();
  const streamUrl = new URL('command/stream', base);
  streamUrl.searchParams.set('user_id', userId);

  const client = streamUrl.protocol === 'https:' ? https : http;
  const upstream = client.request(
    streamUrl,
    { method: 'GET', headers: { Accept: 'text/event-stream' } },
    (upstreamRes) => {
      if ((upstreamRes.statusCode ?? 500) >= 400) {
        res.status(upstreamRes.statusCode ?? 500).json({ error: 'Upstream command stream failed' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      upstreamRes.on('data', (chunk) => res.write(chunk));
      upstreamRes.on('end', () => res.end());
    }
  );

  upstream.on('error', (error) => {
    console.error('Command stream proxy error:', error);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to connect upstream command stream' });
    } else {
      res.end();
    }
  });

  upstream.end();
  req.on('close', () => {
    upstream.destroy();
    res.end();
  });
});

export default router;
