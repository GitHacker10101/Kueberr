import Database from 'better-sqlite3';
import path from 'path';

// Create database connection
const dbPath = path.join(__dirname, '../data/kueberr.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

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

  // Insert sample data
  insertSampleData();
};

const insertSampleData = () => {
  // Insert sample user
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password) VALUES (?, ?, ?, ?)
  `);
  insertUser.run('user-1', 'john.doe@example.com', 'John Doe', 'password123');

  // Insert sample assets
  const assets = [
    { id: 'reliance', symbol: 'RELIANCE', name: 'Reliance Industries', type: 'stock', price: 2847.50 },
    { id: 'tcs', symbol: 'TCS', name: 'Tata Consultancy', type: 'stock', price: 3521.25 },
    { id: 'infy', symbol: 'INFY', name: 'Infosys Ltd', type: 'stock', price: 1456.80 },
    { id: 'hdfcbank', symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', price: 1678.35 },
    { id: 'icicibank', symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'stock', price: 1123.45 },
  ];

  const insertAsset = db.prepare(`
    INSERT OR IGNORE INTO assets (id, symbol, name, type, current_price, last_updated)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  assets.forEach(asset => {
    insertAsset.run(asset.id, asset.symbol, asset.name, asset.type, asset.price, new Date().toISOString());
  });

  // Insert sample holdings
  const holdings = [
    { user_id: 'user-1', asset_id: 'reliance', quantity: 100, avg_price: 2650.00 },
    { user_id: 'user-1', asset_id: 'tcs', quantity: 50, avg_price: 3400.00 },
    { user_id: 'user-1', asset_id: 'infy', quantity: 100, avg_price: 1520.00 },
  ];

  const insertHolding = db.prepare(`
    INSERT OR IGNORE INTO holdings (id, user_id, asset_id, quantity, average_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  holdings.forEach((holding, index) => {
    insertHolding.run(`holding-${index + 1}`, holding.user_id, holding.asset_id, holding.quantity, holding.avg_price);
  });

  // Insert sample watchlist
  const watchlist = [
    'reliance', 'tcs', 'infy', 'hdfcbank', 'icicibank'
  ];

  const insertWatchlist = db.prepare(`
    INSERT OR IGNORE INTO watchlist (id, user_id, asset_id)
    VALUES (?, ?, ?)
  `);

  watchlist.forEach((assetId, index) => {
    insertWatchlist.run(`watchlist-${index + 1}`, 'user-1', assetId);
  });

  // Insert sample predictions
  const predictions = [
    { asset_id: 'reliance', prediction: 'Strong Buy', confidence: 92, predicted_price: 3100.00, timeframe: '1M' },
    { asset_id: 'tcs', prediction: 'Buy', confidence: 88, predicted_price: 3800.00, timeframe: '1M' },
    { asset_id: 'infy', prediction: 'Hold', confidence: 85, predicted_price: 1450.00, timeframe: '1M' },
    { asset_id: 'hdfcbank', prediction: 'Buy', confidence: 90, predicted_price: 1800.00, timeframe: '1M' },
    { asset_id: 'icicibank', prediction: 'Hold', confidence: 87, predicted_price: 1120.00, timeframe: '1M' },
  ];

  const insertPrediction = db.prepare(`
    INSERT OR IGNORE INTO predictions (id, asset_id, prediction, confidence, predicted_price, timeframe)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  predictions.forEach((pred, index) => {
    insertPrediction.run(`pred-${index + 1}`, pred.asset_id, pred.prediction, pred.confidence, pred.predicted_price, pred.timeframe);
  });

  // Insert sample alerts
  const alerts = [
    { user_id: 'user-1', asset_id: 'infy', type: 'prediction_change', message: 'AI prediction changed to Hold' },
    { user_id: 'user-1', asset_id: 'tcs', type: 'price_above', threshold: 3500, message: 'TCS approaching target price' },
  ];

  const insertAlert = db.prepare(`
    INSERT OR IGNORE INTO alerts (id, user_id, asset_id, type, threshold, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  alerts.forEach((alert, index) => {
    insertAlert.run(`alert-${index + 1}`, alert.user_id, alert.asset_id, alert.type, alert.threshold, alert.message);
  });
};

// Initialize database
createTables();

export default db;
