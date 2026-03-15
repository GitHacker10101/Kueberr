import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { getAssetById } from '../dataService';
import { setResponseMeta } from '../middleware/responseMeta';

const router = Router();
const USER_ID = 'user-1';

interface AlertRow {
  id: string;
  user_id: string;
  asset_id: string;
  type: 'price_above' | 'price_below' | 'prediction_change';
  threshold: number | null;
  message: string;
  is_active: number;
  is_triggered: number;
  created_at: string;
  triggered_at: string | null;
}

const selectAlertsStmt = db.prepare(`
  SELECT id, user_id, asset_id, type, threshold, message, is_active, is_triggered, created_at, triggered_at
  FROM alerts
  WHERE user_id = ?
  ORDER BY created_at DESC
`);

const insertAlertStmt = db.prepare(`
  INSERT INTO alerts (id, user_id, asset_id, type, threshold, message, is_active, is_triggered, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
`);

const deleteAlertStmt = db.prepare(`
  DELETE FROM alerts
  WHERE id = ? AND user_id = ?
`);

// GET /api/alerts - Get user's alerts
router.get('/', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'alerts:db', quality_status: 'ok' });
    const rows = selectAlertsStmt.all(USER_ID) as AlertRow[];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alerts = rows.map((row) => {
      const asset = getAssetById(row.asset_id);
      return {
        id: row.id,
        symbol: asset?.symbol ?? row.asset_id,
        name: asset?.name ?? row.asset_id,
        asset_id: row.asset_id,
        type: row.type,
        threshold: row.threshold,
        message: row.message,
        is_active: Boolean(row.is_active),
        is_triggered: Boolean(row.is_triggered),
        created_at: row.created_at,
        triggered_at: row.triggered_at,
      };
    });

    const stats = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter((item) => item.is_active).length,
      triggeredToday: alerts.filter((item) => {
        if (!item.is_triggered || !item.triggered_at) return false;
        const dt = new Date(item.triggered_at);
        return Number.isFinite(dt.getTime()) && dt >= todayStart;
      }).length,
    };

    res.json({ alerts, stats });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    setResponseMeta(res, { data_source: 'alerts:db', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Failed to fetch alerts data' });
  }
});

// POST /api/alerts - Create new alert
router.post('/', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'alerts:db', quality_status: 'ok' });
    const assetId = String(req.body?.assetId ?? '').trim();
    const type = String(req.body?.type ?? '').trim() as AlertRow['type'];
    const thresholdRaw = req.body?.threshold;
    const threshold = thresholdRaw === undefined || thresholdRaw === null ? null : Number(thresholdRaw);
    const message = String(req.body?.message ?? '').trim();

    if (!assetId || !type) {
      res.status(400).json({ error: 'assetId and type are required' });
      return;
    }

    if (!['price_above', 'price_below', 'prediction_change'].includes(type)) {
      res.status(400).json({ error: 'Invalid alert type' });
      return;
    }

    if (!getAssetById(assetId)) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const id = uuidv4();
    insertAlertStmt.run(id, USER_ID, assetId, type, Number.isFinite(threshold as number) ? threshold : null, message, new Date().toISOString());

    res.status(201).json({ id, message: 'Alert created successfully' });
  } catch (error) {
    console.error('Error creating alert:', error);
    setResponseMeta(res, { data_source: 'alerts:db', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'alerts:db', quality_status: 'ok' });
    const result = deleteAlertStmt.run(req.params.id, USER_ID);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    setResponseMeta(res, { data_source: 'alerts:db', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
