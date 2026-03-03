import db from './database';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock';
  current_price: number;
}

export interface Holding {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  average_price: number;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  asset_id: string;
}

export interface Prediction {
  id: string;
  asset_id: string;
  prediction: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  confidence: number;
  predicted_price: number;
  timeframe: string;
}

export interface Alert {
  id: string;
  user_id: string;
  asset_id: string;
  type: 'price_above' | 'price_below' | 'prediction_change';
  threshold?: number;
  message: string;
  is_active: boolean;
  is_triggered: boolean;
}

// --- Database Accessors ---

export const getAllAssets = (): Asset[] => {
  const stmt = db.prepare('SELECT * FROM assets');
  return stmt.all() as Asset[];
};

export const getAssetById = (assetId: string): Asset | undefined => {
  const stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
  return stmt.get(assetId) as Asset | undefined;
};

export const getAllPredictions = (): Prediction[] => {
  const stmt = db.prepare('SELECT * FROM predictions');
  return stmt.all() as Prediction[];
};

export const getPredictionByAssetId = (assetId: string): Prediction | undefined => {
  const stmt = db.prepare('SELECT * FROM predictions WHERE asset_id = ?');
  return stmt.get(assetId) as Prediction | undefined;
};

// --- Portfolio / Holdings ---

export const getUserHoldings = (userId: string): Holding[] => {
  const stmt = db.prepare('SELECT * FROM holdings WHERE user_id = ?');
  return stmt.all(userId) as Holding[];
};

export const addHolding = (userId: string, assetId: string, quantity: number, averagePrice: number): Holding => {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO holdings (id, user_id, asset_id, quantity, average_price)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, userId, assetId, quantity, averagePrice);

  return {
    id,
    user_id: userId,
    asset_id: assetId,
    quantity,
    average_price: averagePrice,
  };
};

export const removeHolding = (id: string, userId: string): void => {
  const stmt = db.prepare('DELETE FROM holdings WHERE id = ? AND user_id = ?');
  stmt.run(id, userId);
};

// --- Watchlist ---

export const getUserWatchlist = (userId: string): WatchlistItem[] => {
  const stmt = db.prepare('SELECT * FROM watchlist WHERE user_id = ?');
  return stmt.all(userId) as WatchlistItem[];
};

export const addToWatchlist = (userId: string, assetId: string): WatchlistItem => {
  // Check if already exists
  const checkStmt = db.prepare('SELECT * FROM watchlist WHERE user_id = ? AND asset_id = ?');
  const existing = checkStmt.get(userId, assetId) as WatchlistItem | undefined;

  if (existing) {
    return existing;
  }

  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO watchlist (id, user_id, asset_id)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, userId, assetId);

  return {
    id,
    user_id: userId,
    asset_id: assetId
  };
};

export const removeFromWatchlist = (userId: string, assetId: string): void => {
  const stmt = db.prepare('DELETE FROM watchlist WHERE user_id = ? AND asset_id = ?');
  stmt.run(userId, assetId);
};

// --- Alerts ---

export const getUserAlerts = (userId: string): Alert[] => {
  const stmt = db.prepare('SELECT * FROM alerts WHERE user_id = ?');
  return stmt.all(userId) as Alert[];
};

// --- Users ---

export const getAllUsers = (): User[] => {
  const stmt = db.prepare('SELECT id, email, name FROM users');
  return stmt.all() as User[];
};

