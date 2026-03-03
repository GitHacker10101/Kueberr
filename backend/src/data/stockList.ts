// Comprehensive stock list for Kueberr - 100+ stocks across global markets

export interface Stock {
    symbol: string;
    name: string;
    exchange: string;
    country: string;
    sector: string;
    marketCap: 'large' | 'mid' | 'small';
    yahooSymbol: string; // For Yahoo Finance API
}

// Indian Stocks - NSE (50 stocks)
export const INDIAN_STOCKS: Stock[] = [
    // Large Cap - Banking & Financial
    { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', country: 'India', sector: 'Banking', marketCap: 'large', yahooSymbol: 'HDFCBANK.NS' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', country: 'India', sector: 'Banking', marketCap: 'large', yahooSymbol: 'ICICIBANK.NS' },
    { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', country: 'India', sector: 'Banking', marketCap: 'large', yahooSymbol: 'SBIN.NS' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', country: 'India', sector: 'Banking', marketCap: 'large', yahooSymbol: 'KOTAKBANK.NS' },
    { symbol: 'AXISBANK', name: 'Axis Bank', exchange: 'NSE', country: 'India', sector: 'Banking', marketCap: 'large', yahooSymbol: 'AXISBANK.NS' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', country: 'India', sector: 'NBFC', marketCap: 'large', yahooSymbol: 'BAJFINANCE.NS' },

    // Large Cap - IT
    { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', country: 'India', sector: 'IT', marketCap: 'large', yahooSymbol: 'TCS.NS' },
    { symbol: 'INFY', name: 'Infosys', exchange: 'NSE', country: 'India', sector: 'IT', marketCap: 'large', yahooSymbol: 'INFY.NS' },
    { symbol: 'WIPRO', name: 'Wipro', exchange: 'NSE', country: 'India', sector: 'IT', marketCap: 'large', yahooSymbol: 'WIPRO.NS' },
    { symbol: 'HCLTECH', name: 'HCL Technologies', exchange: 'NSE', country: 'India', sector: 'IT', marketCap: 'large', yahooSymbol: 'HCLTECH.NS' },
    { symbol: 'TECHM', name: 'Tech Mahindra', exchange: 'NSE', country: 'India', sector: 'IT', marketCap: 'large', yahooSymbol: 'TECHM.NS' },

    // Large Cap - Energy & Oil
    { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', country: 'India', sector: 'Energy', marketCap: 'large', yahooSymbol: 'RELIANCE.NS' },
    { symbol: 'ONGC', name: 'Oil & Natural Gas Corp', exchange: 'NSE', country: 'India', sector: 'Oil & Gas', marketCap: 'large', yahooSymbol: 'ONGC.NS' },
    { symbol: 'BPCL', name: 'Bharat Petroleum', exchange: 'NSE', country: 'India', sector: 'Oil & Gas', marketCap: 'large', yahooSymbol: 'BPCL.NS' },
    { symbol: 'IOC', name: 'Indian Oil Corporation', exchange: 'NSE', country: 'India', sector: 'Oil & Gas', marketCap: 'large', yahooSymbol: 'IOC.NS' },
    { symbol: 'POWERGRID', name: 'Power Grid Corporation', exchange: 'NSE', country: 'India', sector: 'Power', marketCap: 'large', yahooSymbol: 'POWERGRID.NS' },
    { symbol: 'NTPC', name: 'NTPC', exchange: 'NSE', country: 'India', sector: 'Power', marketCap: 'large', yahooSymbol: 'NTPC.NS' },

    // Large Cap - Metals & Mining
    { symbol: 'TATASTEEL', name: 'Tata Steel', exchange: 'NSE', country: 'India', sector: 'Steel', marketCap: 'large', yahooSymbol: 'TATASTEEL.NS' },
    { symbol: 'JSWSTEEL', name: 'JSW Steel', exchange: 'NSE', country: 'India', sector: 'Steel', marketCap: 'large', yahooSymbol: 'JSWSTEEL.NS' },
    { symbol: 'HINDALCO', name: 'Hindalco Industries', exchange: 'NSE', country: 'India', sector: 'Metals', marketCap: 'large', yahooSymbol: 'HINDALCO.NS' },
    { symbol: 'VEDL', name: 'Vedanta', exchange: 'NSE', country: 'India', sector: 'Mining', marketCap: 'large', yahooSymbol: 'VEDL.NS' },
    { symbol: 'COALINDIA', name: 'Coal India', exchange: 'NSE', country: 'India', sector: 'Mining', marketCap: 'large', yahooSymbol: 'COALINDIA.NS' },

    // Large Cap - Auto
    { symbol: 'MARUTI', name: 'Maruti Suzuki', exchange: 'NSE', country: 'India', sector: 'Automobile', marketCap: 'large', yahooSymbol: 'MARUTI.NS' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE', country: 'India', sector: 'Automobile', marketCap: 'large', yahooSymbol: 'TATAMOTORS.NS' },
    { symbol: 'M&M', name: 'Mahindra & Mahindra', exchange: 'NSE', country: 'India', sector: 'Automobile', marketCap: 'large', yahooSymbol: 'M&M.NS' },
    { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', exchange: 'NSE', country: 'India', sector: 'Automobile', marketCap: 'large', yahooSymbol: 'BAJAJ-AUTO.NS' },
    { symbol: 'EICHERMOT', name: 'Eicher Motors', exchange: 'NSE', country: 'India', sector: 'Automobile', marketCap: 'large', yahooSymbol: 'EICHERMOT.NS' },

    // Large Cap - FMCG & Consumer
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE', country: 'India', sector: 'FMCG', marketCap: 'large', yahooSymbol: 'HINDUNILVR.NS' },
    { symbol: 'ITC', name: 'ITC', exchange: 'NSE', country: 'India', sector: 'FMCG', marketCap: 'large', yahooSymbol: 'ITC.NS' },
    { symbol: 'NESTLEIND', name: 'Nestle India', exchange: 'NSE', country: 'India', sector: 'FMCG', marketCap: 'large', yahooSymbol: 'NESTLEIND.NS' },
    { symbol: 'BRITANNIA', name: 'Britannia Industries', exchange: 'NSE', country: 'India', sector: 'FMCG', marketCap: 'large', yahooSymbol: 'BRITANNIA.NS' },
    { symbol: 'DABUR', name: 'Dabur India', exchange: 'NSE', country: 'India', sector: 'FMCG', marketCap: 'mid', yahooSymbol: 'DABUR.NS' },

    // Large Cap - Pharma
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', exchange: 'NSE', country: 'India', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'SUNPHARMA.NS' },
    { symbol: 'DRREDDY', name: 'Dr. Reddys Laboratories', exchange: 'NSE', country: 'India', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'DRREDDY.NS' },
    { symbol: 'CIPLA', name: 'Cipla', exchange: 'NSE', country: 'India', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'CIPLA.NS' },
    { symbol: 'DIVISLAB', name: 'Divi\'s Laboratories', exchange: 'NSE', country: 'India', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'DIVISLAB.NS' },
    { symbol: 'BIOCON', name: 'Biocon', exchange: 'NSE', country: 'India', sector: 'Pharma', marketCap: 'mid', yahooSymbol: 'BIOCON.NS' },

    // Large Cap - Telecom & Cement
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', country: 'India', sector: 'Telecom', marketCap: 'large', yahooSymbol: 'BHARTIARTL.NS' },
    { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', exchange: 'NSE', country: 'India', sector: 'Cement', marketCap: 'large', yahooSymbol: 'ULTRACEMCO.NS' },
    { symbol: 'GRASIM', name: 'Grasim Industries', exchange: 'NSE', country: 'India', sector: 'Cement', marketCap: 'large', yahooSymbol: 'GRASIM.NS' },
    { symbol: 'SHREECEM', name: 'Shree Cement', exchange: 'NSE', country: 'India', sector: 'Cement', marketCap: 'large', yahooSymbol: 'SHREECEM.NS' },
    { symbol: 'AMBUJACEM', name: 'Ambuja Cements', exchange: 'NSE', country: 'India', sector: 'Cement', marketCap: 'mid', yahooSymbol: 'AMBUJACEM.NS' },

    // Mid Cap - Diversified
    { symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', country: 'India', sector: 'Infrastructure', marketCap: 'large', yahooSymbol: 'LT.NS' },
    { symbol: 'ASIANPAINT', name: 'Asian Paints', exchange: 'NSE', country: 'India', sector: 'Paints', marketCap: 'large', yahooSymbol: 'ASIANPAINT.NS' },
    { symbol: 'ADANIPORTS', name: 'Adani Ports', exchange: 'NSE', country: 'India', sector: 'Infrastructure', marketCap: 'large', yahooSymbol: 'ADANIPORTS.NS' },
    { symbol: 'INDUSINDBK', name: 'IndusInd Bank', exchange: 'NSE', country: 'India', sector: 'Banking', marketCap: 'large', yahooSymbol: 'INDUSINDBK.NS' },
    { symbol: 'TITAN', name: 'Titan Company', exchange: 'NSE', country: 'India', sector: 'Retail', marketCap: 'large', yahooSymbol: 'TITAN.NS' },
    { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', exchange: 'NSE', country: 'India', sector: 'Financial Services', marketCap: 'large', yahooSymbol: 'BAJAJFINSV.NS' },
    { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp', exchange: 'NSE', country: 'India', sector: 'Automobile', marketCap: 'large', yahooSymbol: 'HEROMOTOCO.NS' },
];

// US Stocks - NASDAQ/NYSE (40 stocks)
export const US_STOCKS: Stock[] = [
    // Mega Cap Tech
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Technology', marketCap: 'large', yahooSymbol: 'AAPL' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'USA', sector: 'Technology', marketCap: 'large', yahooSymbol: 'MSFT' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Technology', marketCap: 'large', yahooSymbol: 'GOOGL' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'E-commerce', marketCap: 'large', yahooSymbol: 'AMZN' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Social Media', marketCap: 'large', yahooSymbol: 'META' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'USA', sector: 'Semiconductors', marketCap: 'large', yahooSymbol: 'NVDA' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Automotive', marketCap: 'large', yahooSymbol: 'TSLA' },

    // Large Cap Tech
    { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Streaming', marketCap: 'large', yahooSymbol: 'NFLX' },
    { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Software', marketCap: 'large', yahooSymbol: 'ADBE' },
    { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', country: 'USA', sector: 'Cloud', marketCap: 'large', yahooSymbol: 'CRM' },
    { symbol: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', country: 'USA', sector: 'Software', marketCap: 'large', yahooSymbol: 'ORCL' },
    { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', country: 'USA', sector: 'Semiconductors', marketCap: 'large', yahooSymbol: 'INTC' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', country: 'USA', sector: 'Semiconductors', marketCap: 'large', yahooSymbol: 'AMD' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Semiconductors', marketCap: 'large', yahooSymbol: 'QCOM' },

    // Fintech & Payments
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', country: 'USA', sector: 'Payments', marketCap: 'large', yahooSymbol: 'V' },
    { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', country: 'USA', sector: 'Payments', marketCap: 'large', yahooSymbol: 'MA' },
    { symbol: 'PYPL', name: 'PayPal Holdings', exchange: 'NASDAQ', country: 'USA', sector: 'Fintech', marketCap: 'large', yahooSymbol: 'PYPL' },
    { symbol: 'SQ', name: 'Block Inc.', exchange: 'NYSE', country: 'USA', sector: 'Fintech', marketCap: 'mid', yahooSymbol: 'SQ' },

    // E-commerce & Retail
    { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', country: 'Canada', sector: 'E-commerce', marketCap: 'large', yahooSymbol: 'SHOP' },
    { symbol: 'BABA', name: 'Alibaba Group', exchange: 'NYSE', country: 'China', sector: 'E-commerce', marketCap: 'large', yahooSymbol: 'BABA' },
    { symbol: 'JD', name: 'JD.com Inc.', exchange: 'NASDAQ', country: 'China', sector: 'E-commerce', marketCap: 'large', yahooSymbol: 'JD' },

    // Communications & Entertainment
    { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', country: 'USA', sector: 'Entertainment', marketCap: 'large', yahooSymbol: 'DIS' },
    { symbol: 'CMCSA', name: 'Comcast Corporation', exchange: 'NASDAQ', country: 'USA', sector: 'Telecom', marketCap: 'large', yahooSymbol: 'CMCSA' },
    { symbol: 'T', name: 'AT&T Inc.', exchange: 'NYSE', country: 'USA', sector: 'Telecom', marketCap: 'large', yahooSymbol: 'T' },
    { symbol: 'VZ', name: 'Verizon Communications', exchange: 'NYSE', country: 'USA', sector: 'Telecom', marketCap: 'large', yahooSymbol: 'VZ' },

    // Electric Vehicles & Auto
    { symbol: 'NIO', name: 'NIO Inc.', exchange: 'NYSE', country: 'China', sector: 'EV', marketCap: 'mid', yahooSymbol: 'NIO' },
    { symbol: 'RIVN', name: 'Rivian Automotive', exchange: 'NASDAQ', country: 'USA', sector: 'EV', marketCap: 'mid', yahooSymbol: 'RIVN' },
    { symbol: 'F', name: 'Ford Motor Company', exchange: 'NYSE', country: 'USA', sector: 'Automotive', marketCap: 'large', yahooSymbol: 'F' },
    { symbol: 'GM', name: 'General Motors', exchange: 'NYSE', country: 'USA', sector: 'Automotive', marketCap: 'large', yahooSymbol: 'GM' },

    // Growth Tech
    { symbol: 'UBER', name: 'Uber Technologies', exchange: 'NYSE', country: 'USA', sector: 'Ride-sharing', marketCap: 'large', yahooSymbol: 'UBER' },
    { symbol: 'ABNB', name: 'Airbnb Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Travel', marketCap: 'large', yahooSymbol: 'ABNB' },
    { symbol: 'SNAP', name: 'Snap Inc.', exchange: 'NYSE', country: 'USA', sector: 'Social Media', marketCap: 'mid', yahooSymbol: 'SNAP' },
    { symbol: 'TWTR', name: 'Twitter Inc.', exchange: 'NYSE', country: 'USA', sector: 'Social Media', marketCap: 'mid', yahooSymbol: 'TWTR' },
    { symbol: 'SPOT', name: 'Spotify Technology', exchange: 'NYSE', country: 'Sweden', sector: 'Streaming', marketCap: 'mid', yahooSymbol: 'SPOT' },
    { symbol: 'DOCU', name: 'DocuSign Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Software', marketCap: 'mid', yahooSymbol: 'DOCU' },
    { symbol: 'ZM', name: 'Zoom Video Communications', exchange: 'NASDAQ', country: 'USA', sector: 'Communications', marketCap: 'mid', yahooSymbol: 'ZM' },
    { symbol: 'ROKU', name: 'Roku Inc.', exchange: 'NASDAQ', country: 'USA', sector: 'Streaming', marketCap: 'mid', yahooSymbol: 'ROKU' },

    // Banking & Finance
    { symbol: 'JPM', name: 'JPMorgan Chase', exchange: 'NYSE', country: 'USA', sector: 'Banking', marketCap: 'large', yahooSymbol: 'JPM' },
    { symbol: 'BAC', name: 'Bank of America', exchange: 'NYSE', country: 'USA', sector: 'Banking', marketCap: 'large', yahooSymbol: 'BAC' },
    { symbol: 'GS', name: 'Goldman Sachs', exchange: 'NYSE', country: 'USA', sector: 'Investment Banking', marketCap: 'large', yahooSymbol: 'GS' },
];

// Global Stocks (20 stocks)
export const GLOBAL_STOCKS: Stock[] = [
    // European Tech & Auto
    { symbol: 'SAP', name: 'SAP SE', exchange: 'NYSE', country: 'Germany', sector: 'Software', marketCap: 'large', yahooSymbol: 'SAP' },
    { symbol: 'ASML', name: 'ASML Holding', exchange: 'NASDAQ', country: 'Netherlands', sector: 'Semiconductors', marketCap: 'large', yahooSymbol: 'ASML' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor', exchange: 'NYSE', country: 'Taiwan', sector: 'Semiconductors', marketCap: 'large', yahooSymbol: 'TSM' },
    { symbol: 'SONY', name: 'Sony Group Corporation', exchange: 'NYSE', country: 'Japan', sector: 'Electronics', marketCap: 'large', yahooSymbol: 'SONY' },
    { symbol: 'TM', name: 'Toyota Motor Corp', exchange: 'NYSE', country: 'Japan', sector: 'Automotive', marketCap: 'large', yahooSymbol: 'TM' },
    { symbol: 'NKE', name: 'Nike Inc.', exchange: 'NYSE', country: 'USA', sector: 'Apparel', marketCap: 'large', yahooSymbol: 'NKE' },
    { symbol: 'BABA', name: 'Alibaba Group', exchange: 'NYSE', country: 'China', sector: 'E-commerce', marketCap: 'large', yahooSymbol: 'BABA' },
    { symbol: 'PDD', name: 'Pinduoduo Inc.', exchange: 'NASDAQ', country: 'China', sector: 'E-commerce', marketCap: 'large', yahooSymbol: 'PDD' },
    { symbol: 'TCEHY', name: 'Tencent Holdings', exchange: 'OTC', country: 'China', sector: 'Tech Conglomerate', marketCap: 'large', yahooSymbol: 'TCEHY' },
    { symbol: 'BIDU', name: 'Baidu Inc.', exchange: 'NASDAQ', country: 'China', sector: 'Search Engine', marketCap: 'large', yahooSymbol: 'BIDU' },

    // Emerging Markets
    { symbol: 'VALE', name: 'Vale SA', exchange: 'NYSE', country: 'Brazil', sector: 'Mining', marketCap: 'large', yahooSymbol: 'VALE' },
    { symbol: 'PBR', name: 'Petrobras', exchange: 'NYSE', country: 'Brazil', sector: 'Oil & Gas', marketCap: 'large', yahooSymbol: 'PBR' },
    { symbol: 'ITUB', name: 'Itaú Unibanco', exchange: 'NYSE', country: 'Brazil', sector: 'Banking', marketCap: 'large', yahooSymbol: 'ITUB' },

    // Commodities & Materials
    { symbol: 'RIO', name: 'Rio Tinto', exchange: 'NYSE', country: 'UK', sector: 'Mining', marketCap: 'large', yahooSymbol: 'RIO' },
    { symbol: 'BHP', name: 'BHP Group', exchange: 'NYSE', country: 'Australia', sector: 'Mining', marketCap: 'large', yahooSymbol: 'BHP' },

    // Healthcare
    { symbol: 'NVS', name: 'Novartis AG', exchange: 'NYSE', country: 'Switzerland', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'NVS' },
    { symbol: 'RHHBY', name: 'Roche Holding AG', exchange: 'OTC', country: 'Switzerland', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'RHHBY' },
    { symbol: 'SNY', name: 'Sanofi', exchange: 'NASDAQ', country: 'France', sector: 'Pharma', marketCap: 'large', yahooSymbol: 'SNY' },

    // Consumer
    { symbol: 'NSRGY', name: 'Nestle SA', exchange: 'OTC', country: 'Switzerland', sector: 'FMCG', marketCap: 'large', yahooSymbol: 'NSRGY' },
    { symbol: 'UL', name: 'Unilever PLC', exchange: 'NYSE', country: 'UK', sector: 'FMCG', marketCap: 'large', yahooSymbol: 'UL' },
];

// Combined stock list
export const ALL_STOCKS: Stock[] = [
    ...INDIAN_STOCKS,
    ...US_STOCKS,
    ...GLOBAL_STOCKS,
];

// Helper functions
export const getStocksByCountry = (country: string): Stock[] => {
    return ALL_STOCKS.filter(stock => stock.country === country);
};

export const getStocksBySector = (sector: string): Stock[] => {
    return ALL_STOCKS.filter(stock => stock.sector === sector);
};

export const getStocksByMarketCap = (marketCap: 'large' | 'mid' | 'small'): Stock[] => {
    return ALL_STOCKS.filter(stock => stock.marketCap === marketCap);
};

export const getStockBySymbol = (symbol: string): Stock | undefined => {
    return ALL_STOCKS.find(stock => stock.symbol === symbol || stock.yahooSymbol === symbol);
};

export const getAllSectors = (): string[] => {
    return Array.from(new Set(ALL_STOCKS.map(stock => stock.sector))).sort();
};

export const getAllCountries = (): string[] => {
    return Array.from(new Set(ALL_STOCKS.map(stock => stock.country))).sort();
};

export const getTotalStockCount = (): number => {
    return ALL_STOCKS.length;
};

// Export counts for verification
console.log(`Total stocks loaded: ${getTotalStockCount()}`);
console.log(`Indian stocks: ${INDIAN_STOCKS.length}`);
console.log(`US stocks: ${US_STOCKS.length}`);
console.log(`Global stocks: ${GLOBAL_STOCKS.length}`);
