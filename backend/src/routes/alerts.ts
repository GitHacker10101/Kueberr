import { Router } from 'express';
import db from '../database';
import { getUserAlerts, getAssetById } from '../dataService';

const router = Router();

interface Alert {
  id: string;
  symbol?: string;
  name?: string;
  type: string;
  threshold?: number;
  message: string;
  is_active?: number;
  is_triggered?: number;
  created_at?: string;
  triggered_at?: string;
  isActive?: boolean;
  isTriggered?: boolean;
  asset?: string;
  time?: string;
}

// GET /api/alerts - Get user's alerts
router.get('/', (req, res) => {
  try {
    const userId = 'user-1'; // Hardcoded for now

    // Check if alerts table exists, if not use mock data only
    // In a real app, migrations would handle this
    let alerts: Alert[] = [];
    try {
        const alertsQuery = `
        SELECT
            al.id,
            a.symbol,
            a.name,
            al.type,
            al.threshold,
            al.message,
            al.is_active,
            al.is_triggered,
            al.created_at,
            al.triggered_at
        FROM alerts al
        JOIN assets a ON al.asset_id = a.id
        WHERE al.user_id = ?
        ORDER BY al.created_at DESC
        `;
        alerts = db.prepare(alertsQuery).all(userId);
    } catch (e) {
        // Table likely doesn't exist yet, ignore
    }

    // Mock recent alerts with timestamps
    const mockRecentAlerts = [
      {
        id: 'alert-1',
        asset: 'RELIANCE',
        symbol: 'RELIANCE',
        message: 'Price crossed ₹2,800 resistance',
        time: '2 min ago',
        type: 'success',
        isActive: true,
        isTriggered: true,
        triggeredAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      },
      {
        id: 'alert-2',
        asset: 'INFY',
        symbol: 'INFY',
        message: 'AI prediction changed to Hold',
        time: '15 min ago',
        type: 'warning',
        isActive: true,
        isTriggered: false,
        triggeredAt: null
      },
      {
        id: 'alert-3',
        asset: 'TCS',
        symbol: 'TCS',
        message: 'Approaching target price',
        time: '1 hour ago',
        type: 'info',
        isActive: true,
        isTriggered: false,
        triggeredAt: null
      }
    ];

    // Calculate stats
    const totalAlerts = alerts.length > 0 ? alerts.length : mockRecentAlerts.length;
    const activeAlerts = alerts.length > 0 ? alerts.filter(alert => alert.is_active).length : mockRecentAlerts.filter(alert => alert.isActive).length;
    const triggeredToday = alerts.length > 0 ? alerts.filter(alert => alert.is_triggered).length : mockRecentAlerts.filter(alert => alert.isTriggered).length;

    res.json({
      alerts: alerts.length > 0 ? alerts : mockRecentAlerts,
      stats: {
        totalAlerts,
        activeAlerts,
        triggeredToday
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts data' });
  }
});

// POST /api/alerts - Create new alert
router.post('/', (req, res) => {
  try {
    const { assetId, type, threshold, message } = req.body;
    const userId = 'user-1'; // Hardcoded for now

    if (!assetId || !type) {
      return res.status(400).json({ error: 'Asset ID and type are required' });
    }

    const alertId = `alert-${Date.now()}`;

    // In a real implementation, this would add to the alerts array in dataService
    // For now, just return success
    res.status(201).json({
      id: alertId,
      message: 'Alert created successfully'
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, this would remove from the alerts array in dataService
    // For now, just return success
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
