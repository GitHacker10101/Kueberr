import Database from 'better-sqlite3';
import path from 'path';
import { ALL_STOCKS } from './data/stockList';

// Create database connection
const dbPath = path.join(__dirname, '../data/kueberr.db');
const db: Database.Database = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

const normalizeAssetId = (symbol: string): string =>
  symbol
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `asset-${Date.now()}`;

// Create tables
const createTables = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assets table (stocks only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('stock')),
      current_price REAL,
      last_updated DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Holdings table (user's portfolio)
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      average_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // Watchlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      UNIQUE(user_id, asset_id)
    )
  `);

  // Predictions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      prediction TEXT NOT NULL CHECK (prediction IN ('Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell')),
      confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
      predicted_price REAL,
      timeframe TEXT NOT NULL,
      accuracy REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // Alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('price_above', 'price_below', 'prediction_change')),
      threshold REAL,
      message TEXT,
      is_active BOOLEAN DEFAULT 1,
      is_triggered BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      triggered_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  // Sessions table (auth token persistence)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Insert sample data
  insertSampleData();
};

const insertSampleData = () => {
  // Insert sample user
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password) VALUES (?, ?, ?, ?)
  `);
  insertUser.run('user-1', 'john.doe@example.com', 'John Doe', 'password123');

  const insertAsset = db.prepare(`
    INSERT OR IGNORE INTO assets (id, symbol, name, type, current_price, last_updated)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Seed a broad stock universe. Dedupe by symbol to avoid duplicate listings.
  const bySymbol = new Map<string, (typeof ALL_STOCKS)[number]>();
  ALL_STOCKS.forEach((stock) => {
    const key = stock.symbol.trim().toUpperCase();
    if (!bySymbol.has(key)) {
      bySymbol.set(key, stock);
    }
  });

  bySymbol.forEach((stock, symbol) => {
    insertAsset.run(
      normalizeAssetId(symbol),
      symbol,
      stock.name,
      'stock',
      null,
      new Date().toISOString()
    );
  });

  // Intentionally no seeded holdings/watchlist/predictions/alerts to avoid synthetic user data.
};

// Initialize database
createTables();

export default db;
