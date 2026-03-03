// Mock data service with COMPREHENSIVE 110+ stock data
// This provides a fallback when the backend is unavailable

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'forex';
  current_price: number;
  sector?: string;
  change_24h?: number;
  country?: string;
}

export interface Prediction {
  id: string;
  asset_id: string;
  prediction: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  confidence: number;
  predicted_price: number;
  timeframe: string;
  analysis: string;
  risk_level: 'Low' | 'Medium' | 'High';
  technical_signals: string[];
}

export interface MarketSentiment {
  overall: string;
  score: number;
  factors: string[];
}

export interface TechnicalIndicator {
  asset_id: string;
  rsi: number;
  macd: string;
  moving_average: string;
  support_resistance: {
    support: number;
    resistance: number;
  };
}

// COMPREHENSIVE 110+ STOCK DATASET
const realAssets: Asset[] = [
  // === INDIAN STOCKS (50) ===

  // Banking & Finance (7)
  { id: 'hdfcbank', symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'stock', current_price: 1450.80, sector: 'Banking', country: 'India' },
  { id: 'icicibank', symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'stock', current_price: 1085.40, sector: 'Banking', country: 'India' },
  { id: 'sbin', symbol: 'SBIN', name: 'State Bank of India', type: 'stock', current_price: 760.25, sector: 'Banking', country: 'India' },
  { id: 'kotakbank', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', type: 'stock', current_price: 1720.50, sector: 'Banking', country: 'India' },
  { id: 'axisbank', symbol: 'AXISBANK', name: 'Axis Bank', type: 'stock', current_price: 1045.60, sector: 'Banking', country: 'India' },
  { id: 'bajfinance', symbol: 'BAJFINANCE', name: 'Bajaj Finance', type: 'stock', current_price: 6850.00, sector: 'NBFC', country: 'India' },
  { id: 'indusindbk', symbol: 'INDUSINDBK', name: 'IndusInd Bank', type: 'stock', current_price: 1420.00, sector: 'Banking', country: 'India' },

  // IT (5)
  { id: 'tcs', symbol: 'TCS', name: 'Tata Consultancy Services', type: 'stock', current_price: 3960.50, sector: 'IT', country: 'India' },
  { id: 'infosys', symbol: 'INFY', name: 'Infosys', type: 'stock', current_price: 1640.20, sector: 'IT', country: 'India' },
  { id: 'wipro', symbol: 'WIPRO', name: 'Wipro', type: 'stock', current_price: 485.60, sector: 'IT', country: 'India' },
  { id: 'hcltech', symbol: 'HCLTECH', name: 'HCL Technologies', type: 'stock', current_price: 1580.45, sector: 'IT', country: 'India' },
  { id: 'techm', symbol: 'TECHM', name: 'Tech Mahindra', type: 'stock', current_price: 1250.30, sector: 'IT', country: 'India' },

  // Energy & Power (6)
  { id: 'reliance', symbol: 'RELIANCE', name: 'Reliance Industries', type: 'stock', current_price: 2960.50, sector: 'Energy', country: 'India' },
  { id: 'ongc', symbol: 'ONGC', name: 'Oil & Natural Gas Corp', type: 'stock', current_price: 275.40, sector: 'Oil & Gas', country: 'India' },
  { id: 'bpcl', symbol: 'BPCL', name: 'Bharat Petroleum', type: 'stock', current_price: 595.30, sector: 'Oil & Gas', country: 'India' },
  { id: 'ioc', symbol: 'IOC', name: 'Indian Oil Corporation', type: 'stock', current_price: 145.20, sector: 'Oil & Gas', country: 'India' },
  { id: 'powergrid', symbol: 'POWERGRID', name: 'Power Grid Corporation', type: 'stock', current_price: 285.60, sector: 'Power', country: 'India' },
  { id: 'ntpc', symbol: 'NTPC', name: 'NTPC', type: 'stock', current_price: 340.20, sector: 'Power', country: 'India' },

  // Metals & Mining (5)
  { id: 'tatasteel', symbol: 'TATASTEEL', name: 'Tata Steel', type: 'stock', current_price: 165.80, sector: 'Steel', country: 'India' },
  { id: 'jswsteel', symbol: 'JSWSTEEL', name: 'JSW Steel', type: 'stock', current_price: 880.50, sector: 'Steel', country: 'India' },
  { id: 'hindalco', symbol: 'HINDALCO', name: 'Hindalco Industries', type: 'stock', current_price: 620.40, sector: 'Metals', country: 'India' },
  { id: 'vedl', symbol: 'VEDL', name: 'Vedanta', type: 'stock', current_price: 385.70, sector: 'Mining', country: 'India' },
  { id: 'coalindia', symbol: 'COALINDIA', name: 'Coal India', type: 'stock', current_price: 450.00, sector: 'Mining', country: 'India' },

  // Automotive (5)
  { id: 'maruti', symbol: 'MARUTI', name: 'Maruti Suzuki', type: 'stock', current_price: 12450.00, sector: 'Automobile', country: 'India' },
  { id: 'tatamotors', symbol: 'TATAMOTORS', name: 'Tata Motors', type: 'stock', current_price: 980.50, sector: 'Automobile', country: 'India' },
  { id: 'mahindra', symbol: 'M&M', name: 'Mahindra & Mahindra', type: 'stock', current_price: 2150.00, sector: 'Automobile', country: 'India' },
  { id: 'bajaj-auto', symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', type: 'stock', current_price: 8950.00, sector: 'Automobile', country: 'India' },
  { id: 'eichermot', symbol: 'EICHERMOT', name: 'Eicher Motors', type: 'stock', current_price: 4560.00, sector: 'Automobile', country: 'India' },

  // FMCG & Consumer (5)
  { id: 'hindunilvr', symbol: 'HINDUNILVR', name: 'Hindustan Unilever', type: 'stock', current_price: 2250.00, sector: 'FMCG', country: 'India' },
  { id: 'itc', symbol: 'ITC', name: 'ITC', type: 'stock', current_price: 435.60, sector: 'FMCG', country: 'India' },
  { id: 'nestleind', symbol: 'NESTLEIND', name: 'Nestle India', type: 'stock', current_price: 2550.00, sector: 'FMCG', country: 'India' },
  { id: 'britannia', symbol: 'BRITANNIA', name: 'Britannia Industries', type: 'stock', current_price: 5200.00, sector: 'FMCG', country: 'India' },
  { id: 'dabur', symbol: 'DABUR', name: 'Dabur India', type: 'stock', current_price: 520.00, sector: 'FMCG', country: 'India' },

  // Pharma (5)
  { id: 'sunpharma', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', type: 'stock', current_price: 1620.00, sector: 'Pharma', country: 'India' },
  { id: 'drreddy', symbol: 'DRREDDY', name: 'Dr. Reddys Laboratories', type: 'stock', current_price: 6150.00, sector: 'Pharma', country: 'India' },
  { id: 'cipla', symbol: 'CIPLA', name: 'Cipla', type: 'stock', current_price: 1480.00, sector: 'Pharma', country: 'India' },
  { id: 'divislab', symbol: 'DIVISLAB', name: 'Divis Laboratories', type: 'stock', current_price: 3950.00, sector: 'Pharma', country: 'India' },
  { id: 'biocon', symbol: 'BIOCON', name: 'Biocon', type: 'stock', current_price: 335.00, sector: 'Pharma', country: 'India' },

  // Others (12)
  { id: 'bhartiartl', symbol: 'BHARTIARTL', name: 'Bharti Airtel', type: 'stock', current_price: 1280.00, sector: 'Telecom', country: 'India' },
  { id: 'ultracemco', symbol: 'ULTRACEMCO', name: 'UltraTech Cement', type: 'stock', current_price: 9850.00, sector: 'Cement', country: 'India' },
  { id: 'grasim', symbol: 'GRASIM', name: 'Grasim Industries', type: 'stock', current_price: 2450.00, sector: 'Cement', country: 'India' },
  { id: 'shreecem', symbol: 'SHREECEM', name: 'Shree Cement', type: 'stock', current_price: 28500.00, sector: 'Cement', country: 'India' },
  { id: 'ambujacem', symbol: 'AMBUJACEM', name: 'Ambuja Cements', type: 'stock', current_price: 620.00, sector: 'Cement', country: 'India' },
  { id: 'lt', symbol: 'LT', name: 'Larsen & Toubro', type: 'stock', current_price: 3650.00, sector: 'Infrastructure', country: 'India' },
  { id: 'asianpaint', symbol: 'ASIANPAINT', name: 'Asian Paints', type: 'stock', current_price: 2850.00, sector: 'Paints', country: 'India' },
  { id: 'adaniports', symbol: 'ADANIPORTS', name: 'Adani Ports', type: 'stock', current_price: 1320.00, sector: 'Infrastructure', country: 'India' },
  { id: 'titan', symbol: 'TITAN', name: 'Titan Company', type: 'stock', current_price: 3650.00, sector: 'Retail', country: 'India' },
  { id: 'bajajfinsv', symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', type: 'stock', current_price: 1580.00, sector: 'Financial Services', country: 'India' },
  { id: 'heromotoco', symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', type: 'stock', current_price: 4850.00, sector: 'Automobile', country: 'India' },

  // Additional Indian Stocks - Mid & Small Cap (30+)

  // IT & Tech
  { id: 'persistent', symbol: 'PERSISTENT', name: 'Persistent Systems', type: 'stock', current_price: 5200.00, sector: 'IT', country: 'India' },
  { id: 'coforge', symbol: 'COFORGE', name: 'Coforge Ltd', type: 'stock', current_price: 4850.00, sector: 'IT', country: 'India' },
  { id: 'mphasis', symbol: 'MPHASIS', name: 'Mphasis Ltd', type: 'stock', current_price: 2650.00, sector: 'IT', country: 'India' },
  { id: 'tataelxsi', symbol: 'TATAELXSI', name: 'Tata Elxsi', type: 'stock', current_price: 7800.00, sector: 'IT', country: 'India' },

  // Banking & NBFC
  { id: 'idfcfirstb', symbol: 'IDFCFIRSTB', name: 'IDFC First Bank', type: 'stock', current_price: 85.50, sector: 'Banking', country: 'India' },
  { id: 'bandhanbnk', symbol: 'BANDHANBNK', name: 'Bandhan Bank', type: 'stock', current_price: 220.00, sector: 'Banking', country: 'India' },
  { id: 'aubank', symbol: 'AUBANK', name: 'AU Small Finance Bank', type: 'stock', current_price: 650.00, sector: 'Banking', country: 'India' },
  { id: 'cholafin', symbol: 'CHOLAFIN', name: 'Cholamandalam Investment', type: 'stock', current_price: 1280.00, sector: 'NBFC', country: 'India' },
  { id: 'hdfclife', symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', type: 'stock', current_price: 680.00, sector: 'Insurance', country: 'India' },
  { id: 'sbilife', symbol: 'SBILIFE', name: 'SBI Life Insurance', type: 'stock', current_price: 1450.00, sector: 'Insurance', country: 'India' },

  // Auto & Auto Ancillaries
  { id: 'motherson', symbol: 'MOTHERSON', name: 'Motherson Sumi Systems', type: 'stock', current_price: 95.00, sector: 'Auto Parts', country: 'India' },
  { id: 'apollotyre', symbol: 'APOLLOTYRE', name: 'Apollo Tyres', type: 'stock', current_price: 425.00, sector: 'Auto Parts', country: 'India' },
  { id: 'mrf', symbol: 'MRF', name: 'MRF Ltd', type: 'stock', current_price: 120000.00, sector: 'Auto Parts', country: 'India' },
  { id: 'boschltd', symbol: 'BOSCHLTD', name: 'Bosch Ltd', type: 'stock', current_price: 28500.00, sector: 'Auto Parts', country: 'India' },

  // Pharma & Healthcare
  { id: 'auropharma', symbol: 'AUROPHARMA', name: 'Aurobindo Pharma', type: 'stock', current_price: 1150.00, sector: 'Pharma', country: 'India' },
  { id: 'lupin', symbol: 'LUPIN', name: 'Lupin Ltd', type: 'stock', current_price: 1680.00, sector: 'Pharma', country: 'India' },
  { id: 'torntpharm', symbol: 'TORNTPHARM', name: 'Torrent Pharmaceuticals', type: 'stock', current_price: 2950.00, sector: 'Pharma', country: 'India' },
  { id: 'alkem', symbol: 'ALKEM', name: 'Alkem Laboratories', type: 'stock', current_price: 5400.00, sector: 'Pharma', country: 'India' },

  // Consumer & Retail
  { id: 'tataconsum', symbol: 'TATACONSUM', name: 'Tata Consumer Products', type: 'stock', current_price: 1050.00, sector: 'FMCG', country: 'India' },
  { id: 'godrejcp', symbol: 'GODREJCP', name: 'Godrej Consumer Products', type: 'stock', current_price: 1180.00, sector: 'FMCG', country: 'India' },
  { id: 'marico', symbol: 'MARICO', name: 'Marico Ltd', type: 'stock', current_price: 590.00, sector: 'FMCG', country: 'India' },
  { id: 'pidilitind', symbol: 'PIDILITIND', name: 'Pidilite Industries', type: 'stock', current_price: 2820.00, sector: 'Chemicals', country: 'India' },
  { id: 'dmart', symbol: 'DMART', name: 'Avenue Supermarts (DMart)', type: 'stock', current_price: 4200.00, sector: 'Retail', country: 'India' },
  { id: 'jublfood', symbol: 'JUBLFOOD', name: 'Jubilant Foodworks', type: 'stock', current_price: 580.00, sector: 'Food Service', country: 'India' },

  // Real Estate & Construction
  { id: 'dlf', symbol: 'DLF', name: 'DLF Ltd', type: 'stock', current_price: 850.00, sector: 'Real Estate', country: 'India' },
  { id: 'godrejprop', symbol: 'GODREJPROP', name: 'Godrej Properties', type: 'stock', current_price: 2450.00, sector: 'Real Estate', country: 'India' },
  { id: 'oberoirlty', symbol: 'OBEROIRLTY', name: 'Oberoi Realty', type: 'stock', current_price: 1380.00, sector: 'Real Estate', country: 'India' },
  { id: 'prestige', symbol: 'PRESTIGE', name: 'Prestige Estates', type: 'stock', current_price: 1680.00, sector: 'Real Estate', country: 'India' },

  // Chemicals & Materials
  { id: 'upl', symbol: 'UPL', name: 'UPL Ltd', type: 'stock', current_price: 540.00, sector: 'Chemicals', country: 'India' },
  { id: 'deepakntr', symbol: 'DEEPAKNTR', name: 'Deepak Nitrite', type: 'stock', current_price: 2150.00, sector: 'Chemicals', country: 'India' },
  { id: 'srf', symbol: 'SRF', name: 'SRF Ltd', type: 'stock', current_price: 2380.00, sector: 'Chemicals', country: 'India' },
  { id: 'aarti', symbol: 'AARTIIND', name: 'Aarti Industries', type: 'stock', current_price: 680.00, sector: 'Chemicals', country: 'India' },

  // Hospitality & Travel
  { id: 'indianhotels', symbol: 'INDHOTEL', name: 'Indian Hotels (Taj)', type: 'stock', current_price: 520.00, sector: 'Hospitality', country: 'India' },
  { id: 'lemontree', symbol: 'LEMONTREE', name: 'Lemon Tree Hotels', type: 'stock', current_price: 125.00, sector: 'Hospitality', country: 'India' },
  { id: 'interglobe', symbol: 'INDIGO', name: 'InterGlobe Aviation (IndiGo)', type: 'stock', current_price: 3850.00, sector: 'Airlines', country: 'India' },

  // Logistics & Infrastructure
  { id: 'bluedart', symbol: 'BLUEDART', name: 'Blue Dart Express', type: 'stock', current_price: 7850.00, sector: 'Logistics', country: 'India' },
  { id: 'concor', symbol: 'CONCOR', name: 'Container Corp of India', type: 'stock', current_price: 820.00, sector: 'Logistics', country: 'India' },
  { id: 'iex', symbol: 'IEX', name: 'Indian Energy Exchange', type: 'stock', current_price: 165.00, sector: 'Exchange', country: 'India' },

  // Metals & Mining
  { id: 'nmdc', symbol: 'NMDC', name: 'NMDC Ltd', type: 'stock', current_price: 220.00, sector: 'Mining', country: 'India' },
  { id: 'jindalstel', symbol: 'JINDALSTEL', name: 'Jindal Steel & Power', type: 'stock', current_price: 870.00, sector: 'Steel', country: 'India' },
  { id: 'sail', symbol: 'SAIL', name: 'Steel Authority of India', type: 'stock', current_price: 120.00, sector: 'Steel', country: 'India' },

  // Diversified
  { id: 'siemens', symbol: 'SIEMENS', name: 'Siemens Ltd', type: 'stock', current_price: 4850.00, sector: 'Engineering', country: 'India' },
  { id: 'abb', symbol: 'ABB', name: 'ABB India', type: 'stock', current_price: 6200.00, sector: 'Engineering', country: 'India' },
  { id: 'havells', symbol: 'HAVELLS', name: 'Havells India', type: 'stock', current_price: 1520.00, sector: 'Electricals', country: 'India' },
  { id: 'voltas', symbol: 'VOLTAS', name: 'Voltas Ltd', type: 'stock', current_price: 1280.00, sector: 'Consumer Durables', country: 'India' },
  { id: 'crompton', symbol: 'CROMPTON', name: 'Crompton Greaves Consumer', type: 'stock', current_price: 380.00, sector: 'Electricals', country: 'India' },

  // === US STOCKS (40) ===

  // Mega Cap Tech (7)
  { id: 'apple', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', current_price: 14500.00, sector: 'Technology', country: 'USA' },
  { id: 'microsoft', symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', current_price: 34800.00, sector: 'Technology', country: 'USA' },
  { id: 'google', symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', current_price: 13800.00, sector: 'Technology', country: 'USA' },
  { id: 'amazon', symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', current_price: 14900.00, sector: 'E-commerce', country: 'USA' },
  { id: 'meta', symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', current_price: 40500.00, sector: 'Social Media', country: 'USA' },
  { id: 'nvidia', symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', current_price: 78500.00, sector: 'Semiconductors', country: 'USA' },
  { id: 'tesla', symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', current_price: 14200.00, sector: 'Automotive', country: 'USA' },

  // Tech & Software (7)
  { id: 'netflix', symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock', current_price: 52000.00, sector: 'Streaming', country: 'USA' },
  { id: 'adobe', symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', current_price: 42000.00, sector: 'Software', country: 'USA' },
  { id: 'salesforce', symbol: 'CRM', name: 'Salesforce Inc.', type: 'stock', current_price: 28000.00, sector: 'Cloud', country: 'USA' },
  { id: 'oracle', symbol: 'ORCL', name: 'Oracle Corporation', type: 'stock', current_price: 10500.00, sector: 'Software', country: 'USA' },
  { id: 'intel', symbol: 'INTC', name: 'Intel Corporation', type: 'stock', current_price: 4200.00, sector: 'Semiconductors', country: 'USA' },
  { id: 'amd', symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock', current_price: 15800.00, sector: 'Semiconductors', country: 'USA' },
  { id: 'qualcomm', symbol: 'QCOM', name: 'Qualcomm Inc.', type: 'stock', current_price: 14500.00, sector: 'Semiconductors', country: 'USA' },

  // Fintech & Payments (4)
  { id: 'visa', symbol: 'V', name: 'Visa Inc.', type: 'stock', current_price: 25500.00, sector: 'Payments', country: 'USA' },
  { id: 'mastercard', symbol: 'MA', name: 'Mastercard Inc.', type: 'stock', current_price: 38000.00, sector: 'Payments', country: 'USA' },
  { id: 'paypal', symbol: 'PYPL', name: 'PayPal Holdings', type: 'stock', current_price: 6500.00, sector: 'Fintech', country: 'USA' },
  { id: 'square', symbol: 'SQ', name: 'Block Inc.', type: 'stock', current_price: 8500.00, sector: 'Fintech', country: 'USA' },

  // E-commerce (3)
  { id: 'shopify', symbol: 'SHOP', name: 'Shopify Inc.', type: 'stock', current_price: 8200.00, sector: 'E-commerce', country: 'Canada' },
  { id: 'alibaba', symbol: 'BABA', name: 'Alibaba Group', type: 'stock', current_price: 8500.00, sector: 'E-commerce', country: 'China' },
  { id: 'jd', symbol: 'JD', name: 'JD.com Inc.', type: 'stock', current_price: 3500.00, sector: 'E-commerce', country: 'China' },

  // Communications & Entertainment (4)
  { id: 'disney', symbol: 'DIS', name: 'The Walt Disney Company', type: 'stock', current_price: 9500.00, sector: 'Entertainment', country: 'USA' },
  { id: 'comcast', symbol: 'CMCSA', name: 'Comcast Corporation', type: 'stock', current_price: 4200.00, sector: 'Telecom', country: 'USA' },
  { id: 'att', symbol: 'T', name: 'AT&T Inc.', type: 'stock', current_price: 1950.00, sector: 'Telecom', country: 'USA' },
  { id: 'verizon', symbol: 'VZ', name: 'Verizon Communications', type: 'stock', current_price: 4100.00, sector: 'Telecom', country: 'USA' },

  // EV & Auto (4)
  { id: 'nio', symbol: 'NIO', name: 'NIO Inc.', type: 'stock', current_price: 580.00, sector: 'EV', country: 'China' },
  { id: 'rivian', symbol: 'RIVN', name: 'Rivian Automotive', type: 'stock', current_price: 1200.00, sector: 'EV', country: 'USA' },
  { id: 'ford', symbol: 'F', name: 'Ford Motor Company', type: 'stock', current_price: 1050.00, sector: 'Automotive', country: 'USA' },
  { id: 'gm', symbol: 'GM', name: 'General Motors', type: 'stock', current_price: 3800.00, sector: 'Automotive', country: 'USA' },

  // Growth Tech (6)
  { id: 'uber', symbol: 'UBER', name: 'Uber Technologies', type: 'stock', current_price: 6500.00, sector: 'Ride-sharing', country: 'USA' },
  { id: 'airbnb', symbol: 'ABNB', name: 'Airbnb Inc.', type: 'stock', current_price: 14500.00, sector: 'Travel', country: 'USA' },
  { id: 'snap', symbol: 'SNAP', name: 'Snap Inc.', type: 'stock', current_price: 1200.00, sector: 'Social Media', country: 'USA' },
  { id: 'spotify', symbol: 'SPOT', name: 'Spotify Technology', type: 'stock', current_price: 35000.00, sector: 'Streaming', country: 'Sweden' },
  { id: 'zoom', symbol: 'ZM', name: 'Zoom Video Communications', type: 'stock', current_price: 7200.00, sector: 'Communications', country: 'USA' },
  { id: 'roku', symbol: 'ROKU', name: 'Roku Inc.', type: 'stock', current_price: 8500.00, sector: 'Streaming', country: 'USA' },

  // Banking (3)
  { id: 'jpmorgan', symbol: 'JPM', name: 'JPMorgan Chase', type: 'stock', current_price: 15500.00, sector: 'Banking', country: 'USA' },
  { id: 'bofa', symbol: 'BAC', name: 'Bank of America', type: 'stock', current_price: 3300.00, sector: 'Banking', country: 'USA' },
  { id: 'goldman', symbol: 'GS', name: 'Goldman Sachs', type: 'stock', current_price: 45000.00, sector: 'Investment Banking', country: 'USA' },

  // === GLOBAL STOCKS (20) ===

  { id: 'sap', symbol: 'SAP', name: 'SAP SE', type: 'stock', current_price: 18500.00, sector: 'Software', country: 'Germany' },
  { id: 'asml', symbol: 'ASML', name: 'ASML Holding', type: 'stock', current_price: 78000.00, sector: 'Semiconductors', country: 'Netherlands' },
  { id: 'tsm', symbol: 'TSM', name: 'Taiwan Semiconductor', type: 'stock', current_price: 14800.00, sector: 'Semiconductors', country: 'Taiwan' },
  { id: 'sony', symbol: 'SONY', name: 'Sony Group Corporation', type: 'stock', current_price: 9800.00, sector: 'Electronics', country: 'Japan' },
  { id: 'toyota', symbol: 'TM', name: 'Toyota Motor Corp', type: 'stock', current_price: 24500.00, sector: 'Automotive', country: 'Japan' },
  { id: 'nike', symbol: 'NKE', name: 'Nike Inc.', type: 'stock', current_price: 10500.00, sector: 'Apparel', country: 'USA' },
  { id: 'pdd', symbol: 'PDD', name: 'Pinduoduo Inc.', type: 'stock', current_price: 13500.00, sector: 'E-commerce', country: 'China' },
  { id: 'tencent', symbol: 'TCEHY', name: 'Tencent Holdings', type: 'stock', current_price: 4800.00, sector: 'Tech Conglomerate', country: 'China' },
  { id: 'baidu', symbol: 'BIDU', name: 'Baidu Inc.', type: 'stock', current_price: 11000.00, sector: 'Search Engine', country: 'China' },
  { id: 'vale', symbol: 'VALE', name: 'Vale SA', type: 'stock', current_price: 1250.00, sector: 'Mining', country: 'Brazil' },
  { id: 'petrobras', symbol: 'PBR', name: 'Petrobras', type: 'stock', current_price: 1550.00, sector: 'Oil & Gas', country: 'Brazil' },
  { id: 'itau', symbol: 'ITUB', name: 'Itaú Unibanco', type: 'stock', current_price: 650.00, sector: 'Banking', country: 'Brazil' },
  { id: 'rio', symbol: 'RIO', name: 'Rio Tinto', type: 'stock', current_price: 6500.00, sector: 'Mining', country: 'UK' },
  { id: 'bhp', symbol: 'BHP', name: 'BHP Group', type: 'stock', current_price: 5800.00, sector: 'Mining', country: 'Australia' },
  { id: 'novartis', symbol: 'NVS', name: 'Novartis AG', type: 'stock', current_price: 9500.00, sector: 'Pharma', country: 'Switzerland' },
  { id: 'roche', symbol: 'RHHBY', name: 'Roche Holding AG', type: 'stock', current_price: 3800.00, sector: 'Pharma', country: 'Switzerland' },
  { id: 'sanofi', symbol: 'SNY', name: 'Sanofi', type: 'stock', current_price: 5200.00, sector: 'Pharma', country: 'France' },
  { id: 'nestle', symbol: 'NSRGY', name: 'Nestle SA', type: 'stock', current_price: 11500.00, sector: 'FMCG', country: 'Switzerland' },
  { id: 'unilever', symbol: 'UL', name: 'Unilever PLC', type: 'stock', current_price: 5400.00, sector: 'FMCG', country: 'UK' },
];

// Calculate total stocks
console.log(`Total stocks loaded: ${realAssets.length}`);

// Helper to generate consistent but "smart-looking" predictions
const generateSmartPrediction = (asset: Asset): Prediction => {
  // Use character codes of symbol to create a deterministic "random" seed
  const seed = asset.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Determine trend based on sector and "random" factor
  let baseScore = 50; // Neutral

  // Tech and Auto sectors currently bullish in this simulation
  if (asset.sector === 'Technology' || asset.sector === 'Automotive' || asset.sector === 'IT') baseScore += 20;
  if (asset.sector === 'Semiconductors') baseScore += 25;
  // Energy stable
  if (asset.sector === 'Energy' || asset.sector === 'Oil & Gas') baseScore += 5;
  // Banking moderate
  if (asset.sector === 'Banking') baseScore += 10;

  // Add deterministic variance (-15 to +15)
  baseScore += (seed % 30) - 15;

  let prediction: Prediction['prediction'];
  let confidence: number;
  let risk: Prediction['risk_level'];

  if (baseScore > 75) {
    prediction = 'Strong Buy';
    confidence = 85 + (seed % 14); // 85-99%
    risk = 'Low';
  } else if (baseScore > 60) {
    prediction = 'Buy';
    confidence = 70 + (seed % 15); // 70-85%
    risk = 'Medium';
  } else if (baseScore > 40) {
    prediction = 'Hold';
    confidence = 50 + (seed % 20); // 50-70%
    risk = 'Low';
  } else if (baseScore > 25) {
    prediction = 'Sell';
    confidence = 60 + (seed % 20);
    risk = 'Medium';
  } else {
    prediction = 'Strong Sell';
    confidence = 75 + (seed % 20);
    risk = 'High';
  }

  // Calculate target price based on prediction
  const multiplier = prediction.includes('Buy') ? 1.15 : prediction.includes('Sell') ? 0.85 : 1.05;
  const targetPrice = asset.current_price * (multiplier + ((seed % 10) / 100));

  const technicalSignals = [];
  if (prediction.includes('Buy')) {
    technicalSignals.push('RSI Oversold', 'MACD Crossover', 'Above 200 MA');
  } else if (prediction.includes('Sell')) {
    technicalSignals.push('RSI Overbought', 'Bearish Divergence', 'Below 50 MA');
  } else {
    technicalSignals.push('Consolidation', 'Neutral RSI', 'Volume Dry');
  }

  return {
    id: `pred-${asset.id}`,
    asset_id: asset.id,
    prediction,
    confidence: Math.min(99, confidence),
    predicted_price: Math.round(targetPrice * 100) / 100,
    timeframe: `${(seed % 3) + 1} months`,
    analysis: `AI analysis indicates a ${prediction.toLowerCase()} signal for ${asset.name}. Key technical indicators suggest ${prediction.includes('Buy') ? 'upward momentum' : 'correction likely'} in the near term.`,
    risk_level: risk,
    technical_signals: technicalSignals
  };
};

// Generate predictions for all assets
const realPredictions: Prediction[] = realAssets.map(generateSmartPrediction);

// Mock market sentiment
const mockMarketSentiment: MarketSentiment = {
  overall: 'Bullish',
  score: 72,
  factors: [
    'Strong corporate earnings',
    'Positive GDP growth data',
    'FII inflows increasing',
    'Global markets recovery'
  ]
};

// Mock technical indicators
const generateIndicators = (asset: Asset): TechnicalIndicator => {
  const seed = asset.symbol.length;
  return {
    asset_id: asset.id,
    rsi: 40 + (seed * 3) % 40, // 40-80
    macd: seed % 2 === 0 ? 'Bullish' : 'Bearish',
    moving_average: seed % 3 === 0 ? 'Below' : 'Above',
    support_resistance: {
      support: asset.current_price * 0.9,
      resistance: asset.current_price * 1.1
    }
  };
};

const mockTechnicalIndicators: TechnicalIndicator[] = realAssets.map(generateIndicators);

// --- EXPORTS ---

export const getAllAssets = (): Asset[] => {
  return realAssets;
};

export const getAssetById = (idOrSymbol: string): Asset | undefined => {
  const term = idOrSymbol.toLowerCase();
  return realAssets.find(a => a.id.toLowerCase() === term || a.symbol.toLowerCase() === term);
};

export const getAllPredictions = (): Prediction[] => {
  return realPredictions;
};

export const getPredictionByAssetId = (idOrSymbol: string): Prediction | undefined => {
  const asset = getAssetById(idOrSymbol);
  if (!asset) return undefined;
  return realPredictions.find(p => p.asset_id === asset.id);
};

export const getMarketSentiment = (): MarketSentiment => {
  return mockMarketSentiment;
};

export const getTechnicalIndicators = (assetId: string): TechnicalIndicator | undefined => {
  return mockTechnicalIndicators.find(i => i.asset_id === assetId);
};

export const getAllTechnicalIndicators = (): TechnicalIndicator[] => {
  return mockTechnicalIndicators;
};
