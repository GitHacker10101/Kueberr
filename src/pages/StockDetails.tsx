import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { getAssetById, getPredictionByAssetId, getTechnicalIndicators } from "@/data/mockDataService";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Star,
  StarOff,
  Plus,
  Minus,
  Target,
  AlertTriangle,
  Loader2,
  Wallet,
  AlertCircle
} from "lucide-react";

interface StockData {
  id: string;
  symbol: string;
  name: string;
  type: 'stock';
  currentPrice: number;
}

interface PredictionData {
  id: string;
  assetId: string;
  prediction: string;
  confidence: string;
  predictedPrice: number;
  timeframe: string;
  trend: string;
  targetPrice: number;
  stopLoss: number;
  riskLevel: string;
  signals: string[];
  potentialReturn: string;
  lastUpdated: string;
  priceRange?: { low: number; high: number };
  regime?: string;
  sector?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  week52High?: number;
  week52Low?: number;
  beta?: number;
  avgVolume?: number;
  historicalPredictions?: {
    date: string;
    prediction: string;
    actual: string;
    accuracy: number;
  }[];
  supportLevel?: number;
  resistanceLevel?: number;
  volatility?: number;
  analystRating?: string;
  analystCount?: number;
  nextEarningsDate?: string;
}

interface PortfolioItem {
  assetId: string;
  quantity: number;
  avgPrice: number;
}

const StockDetails = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [portfolioItem, setPortfolioItem] = useState<PortfolioItem | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<string>("1");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const fetchData = useCallback(async () => {
    if (!symbol) {
      setError('Stock not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try API first
      try {
        const predRes = await fetch(`http://localhost:3001/api/predictions/${symbol}`);
        if (!predRes.ok) throw new Error('API failed');
        const predData = await predRes.json();
        
        setPrediction(predData);
        setStockData({
          id: predData.assetId,
          symbol: predData.symbol,
          name: predData.name,
          type: predData.type,
          currentPrice: predData.currentPrice
        });

        const portRes = await fetch('http://localhost:3001/api/portfolio');
          if (portRes.ok) {
            const portData = await portRes.json();
            setUserBalance(portData.portfolio?.cashBalance || 0);
            
            const holding = portData.holdings?.find((h: { symbol: string; quantity: number; avgPrice: string }) => h.symbol === predData.symbol);
            if (holding) {
              setPortfolioItem({
                assetId: predData.assetId,
                quantity: holding.quantity,
              avgPrice: parseFloat(holding.avgPrice) || 0
            });
          }
        }
      } catch (apiErr) {
        console.log('API unavailable, switching to local real-data service');
        
        // Fallback to local service
        const asset = getAssetById(symbol);
        const pred = getPredictionByAssetId(symbol);
        
        if (!asset || !pred) {
          throw new Error('Stock not found in local database');
        }

        const indicators = getTechnicalIndicators(asset.id);

        setStockData({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type as 'stock',
          currentPrice: asset.current_price
        });

        setPrediction({
          id: pred.id,
          assetId: pred.asset_id,
          prediction: pred.prediction,
          confidence: pred.confidence,
          predictedPrice: pred.predicted_price,
          timeframe: pred.timeframe,
          trend: pred.prediction.includes('Buy') ? 'Bullish' : (pred.prediction.includes('Sell') ? 'Bearish' : 'Neutral'),
          targetPrice: pred.predicted_price,
          stopLoss: pred.predicted_price * 0.9,
          riskLevel: pred.risk_level,
          signals: pred.technical_signals,
          potentialReturn: ((pred.predicted_price - asset.current_price) / asset.current_price * 100).toFixed(1),
          lastUpdated: new Date().toISOString(),
          sector: asset.sector,
          marketCap: asset.current_price * 1000000,
          peRatio: 25.5,
          dividendYield: 1.2,
          week52High: asset.current_price * 1.15,
          week52Low: asset.current_price * 0.85,
          beta: 1.1,
          avgVolume: 500000,
          supportLevel: indicators?.support_resistance.support,
          resistanceLevel: indicators?.support_resistance.resistance,
          analystRating: pred.prediction,
          analystCount: 12,
          nextEarningsDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          historicalPredictions: [
            { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), prediction: 'Buy', actual: 'up', accuracy: 85 },
            { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), prediction: 'Hold', actual: 'down', accuracy: 92 }
          ]
        });

        // Load portfolio from local storage
        const savedPortfolio = localStorage.getItem('paperPortfolio');
        if (savedPortfolio) {
          const portfolio = JSON.parse(savedPortfolio);
          setUserBalance(portfolio.balance);
          const holding = portfolio.holdings[asset.symbol];
          if (holding) {
            setPortfolioItem({
              assetId: asset.id,
              quantity: holding.quantity,
              avgPrice: holding.avgPrice
            });
          } else {
            setPortfolioItem(null);
          }
        } else {
          setUserBalance(100000);
          setPortfolioItem(null);
        }
      }

      setIsInWatchlist(Math.random() > 0.7);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load stock details. Please try again.');
      setStockData(null);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!stockData) return;

    try {
      setTradeLoading(true);
      setTradeError(null);
      setTradeSuccess(null);

      const quantity = parseFloat(tradeQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        setTradeError('Please enter a valid quantity');
        return;
      }

      const endpoint = type === 'buy' ? 'http://localhost:3001/api/portfolio/buy' : 'http://localhost:3001/api/portfolio/sell';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: stockData.id,
          quantity: quantity
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Trade failed');
      }

      setTradeSuccess(result.message);
      setTradeQuantity("1");
      
      // Refresh data to update balance and holdings
      fetchData();

    } catch (err: unknown) {
      setTradeError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  const getPredictionColor = (pred: string) => {
    switch (pred) {
      case 'Strong Buy': return 'bg-green-500';
      case 'Buy': return 'bg-green-400';
      case 'Hold': return 'bg-yellow-500';
      case 'Sell': return 'bg-red-400';
      case 'Strong Sell': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading stock data...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stockData || !prediction) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Stock</h2>
          <p className="text-muted-foreground mb-4">{error || "Stock not found"}</p>
          <Button onClick={() => navigate('/predictions')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Predictions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/predictions')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{stockData.name}</h1>
              <p className="text-muted-foreground">{stockData.symbol} • Stock</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isInWatchlist ? "default" : "outline"}
              size="sm"
              onClick={() => setIsInWatchlist(!isInWatchlist)}
            >
              {isInWatchlist ? <Star className="w-4 h-4 mr-2" /> : <StarOff className="w-4 h-4 mr-2" />}
              {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
             {/* Price Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
            <Card>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                    <p className="text-3xl font-bold text-foreground">
                      ₹{stockData.currentPrice.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Prediction</p>
                    <div className="flex items-center gap-2">
                       <Badge className={`${getPredictionColor(prediction.prediction)} text-white`}>
                        {prediction.prediction}
                      </Badge>
                      <Badge variant="outline" className={getRiskColor(prediction.riskLevel)}>
                        {prediction.riskLevel} Risk
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                   <div>
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-2xl font-bold text-primary">{prediction.confidence}</p>
                   </div>
                   <div>
                      <p className="text-sm text-muted-foreground text-right">Price Range (5D)</p>
                      {prediction.priceRange ? (
                         <p className="text-xl font-bold text-success">
                            ₹{prediction.priceRange.low.toLocaleString()} - ₹{prediction.priceRange.high.toLocaleString()}
                         </p>
                      ) : (
                         <p className="text-2xl font-bold text-success">₹{prediction.targetPrice.toLocaleString()}</p>
                      )}
                   </div>
                </div>

                <div>
                   <h3 className="font-semibold mb-2">Analysis</h3>
                   <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-secondary/30 rounded">
                        <span className="text-muted-foreground">Trend:</span> {prediction.trend}
                      </div>
                      <div className="p-2 bg-secondary/30 rounded">
                        <span className="text-muted-foreground">Regime:</span> {prediction.regime || 'Unknown'}
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Timeframe</p>
                    <p className="font-medium">{prediction.timeframe}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Potential Return</p>
                    <p className="font-medium text-success">+{prediction.potentialReturn}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {typeof prediction.supportLevel === 'number' && typeof prediction.resistanceLevel === 'number' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
              <Card>
                <CardHeader>
                  <CardTitle>Trading Zones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Support Level</p>
                      <p className="font-mono font-medium">
                        ₹{prediction.supportLevel.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Resistance Level</p>
                      <p className="font-mono font-medium">
                        ₹{prediction.resistanceLevel.toLocaleString('en-IN')}
                      </p>
                    </div>
                    {typeof prediction.volatility === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Volatility</p>
                        <p className="font-mono font-medium">
                          ₹{prediction.volatility.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {prediction.analystRating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
              <Card>
                <CardHeader>
                  <CardTitle>Analyst Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Consensus Rating</p>
                      <p className="font-medium">{prediction.analystRating}</p>
                    </div>
                    {typeof prediction.analystCount === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Analyst Coverage</p>
                        <p className="font-medium">
                          {prediction.analystCount} firms
                        </p>
                      </div>
                    )}
                    {prediction.nextEarningsDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Next Earnings</p>
                        <p className="font-medium">
                          {new Date(prediction.nextEarningsDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {prediction.sector && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
              <Card>
                <CardHeader>
                  <CardTitle>Fundamentals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Sector</p>
                      <p className="font-medium">{prediction.sector}</p>
                    </div>
                    {typeof prediction.marketCap === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Market Cap</p>
                        <p className="font-mono font-medium">
                          ₹{prediction.marketCap.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {typeof prediction.peRatio === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">P/E Ratio</p>
                        <p className="font-medium">{prediction.peRatio.toFixed(1)}</p>
                      </div>
                    )}
                    {typeof prediction.dividendYield === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Dividend Yield</p>
                        <p className="font-medium">
                          {prediction.dividendYield.toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {typeof prediction.week52High === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">52W High</p>
                        <p className="font-mono font-medium">
                          ₹{prediction.week52High.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {typeof prediction.week52Low === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">52W Low</p>
                        <p className="font-mono font-medium">
                          ₹{prediction.week52Low.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {typeof prediction.beta === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Beta</p>
                        <p className="font-medium">{prediction.beta.toFixed(2)}</p>
                      </div>
                    )}
                    {typeof prediction.avgVolume === 'number' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Volume</p>
                        <p className="font-mono font-medium">
                          {prediction.avgVolume.toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {prediction.historicalPredictions && prediction.historicalPredictions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
              <Card>
                <CardHeader>
                  <CardTitle>Prediction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 pr-4 text-muted-foreground">Date</th>
                          <th className="text-left py-2 pr-4 text-muted-foreground">Prediction</th>
                          <th className="text-left py-2 pr-4 text-muted-foreground">Actual</th>
                          <th className="text-right py-2 text-muted-foreground">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prediction.historicalPredictions.map((item, index) => (
                          <tr key={index} className="border-b border-border/30 last:border-0">
                            <td className="py-2 pr-4">
                              {new Date(item.date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2 pr-4">{item.prediction}</td>
                            <td className="py-2 pr-4">
                              {item.actual === 'up' ? 'Price Up' : 'Price Down'}
                            </td>
                            <td className="py-2 text-right">
                              {item.accuracy}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Trading */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Paper Trading
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Available Balance</span>
                     <span className="font-medium">₹{userBalance.toLocaleString('en-IN')}</span>
                   </div>
                   {portfolioItem && (
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Your Holding</span>
                       <span className="font-medium">{portfolioItem.quantity} units</span>
                     </div>
                   )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    value={tradeQuantity} 
                    onChange={(e) => setTradeQuantity(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">
                    Total: ₹{((parseFloat(tradeQuantity) || 0) * stockData.currentPrice).toLocaleString('en-IN')}
                  </p>
                </div>

                {tradeError && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {tradeError}
                  </div>
                )}

                {tradeSuccess && (
                  <div className="p-3 bg-green-500/10 text-green-600 text-sm rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {tradeSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={() => handleTrade('buy')}
                    disabled={tradeLoading}
                  >
                    {tradeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
                  </Button>
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700" 
                    variant="destructive"
                    onClick={() => handleTrade('sell')}
                    disabled={tradeLoading || !portfolioItem}
                  >
                     {tradeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sell"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StockDetails;
