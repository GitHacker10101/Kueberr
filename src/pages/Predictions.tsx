import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Brain, Target, AlertTriangle, CheckCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllPredictions, getAllAssets, getTechnicalIndicators } from "@/data/mockDataService";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface Prediction {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  type: string;
  currentPrice: number;
  prediction: string;
  confidence: number;
  predictedPrice: number;
  timeframe: string;
  trend: string;
  targetPrice: number;
  stopLoss: number;
  riskLevel: string;
  signals: string[];
  potentialReturn: string;
  lastUpdated: string;
  indicators?: {
    rsi: number;
    macd: number;
    bollinger: { middle: number; upper: number; lower: number };
  };
  series?: number[];
}

interface PredictionsSummary {
  totalPredictions: number;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  avgConfidence: number;
}

const Predictions = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState<PredictionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ohlc, setOhlc] = useState<{ t: string; o: number; h: number; l: number; c: number }[]>([]);
  const [horizon, setHorizon] = useState<"daily" | "weekly" | "monthly">("daily");
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<"all" | "strong-buy" | "buy" | "hold" | "sell">("all");
  const [sortBy, setSortBy] = useState<"confidence" | "potentialReturn">("confidence");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchPredictions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Force fallback for now to ensure data visibility
      throw new Error('Forcing fallback to mock data');

      /* 
      // Try fetching from API first
      const response = await fetch(`http://localhost:3001/api/predictions?horizon=${horizon}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      const data = await response.json();

      if (!data.predictions || data.predictions.length === 0) {
        throw new Error('No predictions returned from API');
      }

      setPredictions(data.predictions);
      setSummary(data.summary);
      if (data.predictions?.length) {
        const first = data.predictions[0];
        const ohlcRes = await fetch(`http://localhost:3001/api/market/ohlc/${first.assetId}`);
        if (ohlcRes.ok) {
          const ohlcData = await ohlcRes.json();
          setOhlc(ohlcData.data);
        }
      }
      */
    } catch (err) {
      console.log('Using fallback mock data due to error:', err);
      // Fallback to extensive mock data
      
      const allAssets = getAllAssets();
      const servicePredictions = getAllPredictions();
      
      const mappedPredictions = servicePredictions.map(p => {
        const asset = allAssets.find(a => a.id === p.asset_id);
        if (!asset) {
            console.warn(`Asset not found for prediction ${p.id} (asset_id: ${p.asset_id})`);
            return null;
        }
        
        const indicators = getTechnicalIndicators(asset.id);
        
        return {
          id: p.id,
          assetId: p.asset_id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          currentPrice: asset.current_price,
          prediction: p.prediction,
          confidence: p.confidence,
          predictedPrice: p.predicted_price,
          timeframe: p.timeframe,
          trend: (p.prediction || '').includes('Buy') ? 'Bullish' : (p.prediction || '').includes('Sell') ? 'Bearish' : 'Neutral',
          targetPrice: p.predicted_price,
          stopLoss: p.predicted_price * 0.9,
          riskLevel: p.risk_level,
          signals: p.technical_signals,
          potentialReturn: ((p.predicted_price - asset.current_price) / asset.current_price * 100).toFixed(1),
          lastUpdated: new Date().toISOString(),
          indicators: indicators ? {
            rsi: indicators.rsi,
            macd: 0, 
            bollinger: { 
              middle: asset.current_price, 
              upper: indicators.support_resistance.resistance, 
              lower: indicators.support_resistance.support 
            }
          } : undefined
        };
      }).filter(Boolean) as Prediction[];

      if (mappedPredictions.length === 0) {
        setError(`Mock data mapping failed. Assets: ${allAssets.length}, Preds: ${servicePredictions.length}`);
      }

      setPredictions(mappedPredictions);
      setSummary({
        totalPredictions: mappedPredictions.length,
        strongBuy: mappedPredictions.filter(p => p.prediction === 'Strong Buy').length,
        buy: mappedPredictions.filter(p => p.prediction === 'Buy').length,
        hold: mappedPredictions.filter(p => p.prediction === 'Hold').length,
        sell: mappedPredictions.filter(p => p.prediction.includes('Sell')).length,
        avgConfidence: mappedPredictions.length > 0 ? Math.round(mappedPredictions.reduce((acc, p) => acc + (p.confidence || 0), 0) / mappedPredictions.length) : 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'Strong Buy': return 'text-success bg-success/10';
      case 'Buy': return 'text-primary bg-primary/10';
      case 'Hold': return 'text-warning bg-warning/10';
      case 'Sell': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted/10';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-success';
      case 'Medium': return 'text-warning';
      case 'High': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading AI predictions...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const filteredPredictions = predictions
    .filter(prediction => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        prediction.name.toLowerCase().includes(term) ||
        prediction.symbol.toLowerCase().includes(term)
      );
    })
    .filter(prediction => {
      if (filterRating === "all") return true;
      if (filterRating === "strong-buy") return prediction.prediction === "Strong Buy";
      if (filterRating === "buy") return prediction.prediction === "Buy";
      if (filterRating === "hold") return prediction.prediction === "Hold";
      if (filterRating === "sell") return prediction.prediction === "Sell";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "confidence") {
        return b.confidence - a.confidence;
      }
      const aReturn = parseFloat(a.potentialReturn);
      const bReturn = parseFloat(b.potentialReturn);
      if (Number.isNaN(aReturn) || Number.isNaN(bReturn)) {
        return 0;
      }
      return bReturn - aReturn;
    });

  const totalPages = Math.ceil(filteredPredictions.length / itemsPerPage);
  const paginatedPredictions = filteredPredictions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="glass-card rounded-xl p-4 border border-destructive/40 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">Error loading live predictions</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error} Current data may be based on fallback values.
            </p>
          </div>
        )}

        {/* Price chart is temporarily disabled to ensure the page never crashes */}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Predictions</h1>
            <p className="text-muted-foreground">Smart trading recommendations powered by advanced algorithms</p>
          </div>
          <div className="flex gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Brain className="w-4 h-4 mr-2" />
                  Model Info
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Prediction Model Overview</AlertDialogTitle>
                  <AlertDialogDescription>
                    Uses moving averages, RSI, MACD, and Bollinger Bands to generate signals. Confidence reflects recent performance on similar assets.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="hero" size="sm" onClick={fetchPredictions}>
              <Target className="w-4 h-4 mr-2" />
              Refresh Predictions
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Strong Buy</p>
                <p className="text-2xl font-bold text-success">{summary?.strongBuy || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buy</p>
                <p className="text-2xl font-bold text-primary">{summary?.buy || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hold</p>
                <p className="text-2xl font-bold text-warning">{summary?.hold || 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-foreground">{summary?.avgConfidence || 0}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Predictions List */}
        <div className="glass-card rounded-xl overflow-hidden relative">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-xl font-semibold text-foreground">Latest Predictions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered analysis for optimal trading decisions ({filteredPredictions.length} assets)
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Horizon</span>
                <select
                  className="text-sm bg-secondary/50 border border-border/50 rounded px-2 py-1"
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value as "daily" | "weekly" | "monthly")}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From</span>
                <input type="date" className="text-sm bg-secondary/50 border border-border/50 rounded px-2 py-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To</span>
                <input type="date" className="text-sm bg-secondary/50 border border-border/50 rounded px-2 py-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Search</span>
                <input
                  type="text"
                  placeholder="Search by name or symbol"
                  className="text-sm bg-secondary/50 border border-border/50 rounded px-2 py-1"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating</span>
                <select
                  className="text-sm bg-secondary/50 border border-border/50 rounded px-2 py-1"
                  value={filterRating}
                  onChange={(e) => {
                    setFilterRating(e.target.value as "all" | "strong-buy" | "buy" | "hold" | "sell");
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All</option>
                  <option value="strong-buy">Strong Buy</option>
                  <option value="buy">Buy</option>
                  <option value="hold">Hold</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by</span>
                <select
                  className="text-sm bg-secondary/50 border border-border/50 rounded px-2 py-1"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as "confidence" | "potentialReturn");
                    setCurrentPage(1);
                  }}
                >
                  <option value="confidence">Confidence</option>
                  <option value="potentialReturn">Potential Return</option>
                </select>
              </div>
            </div>
          </div>

          {paginatedPredictions.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                No predictions match your filters. Try adjusting the search or rating.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border/50 min-h-[500px]">
                <AnimatePresence mode="wait">
                  {paginatedPredictions.map((prediction, index) => (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      layout
                      className="group"
                    >
                      <Link 
                        to={`/stock/${prediction.assetId}`} 
                        className="block p-6 hover:bg-secondary/20 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />
                        
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
                          {/* Asset Info */}
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors group-hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                                <span className="font-mono text-sm font-bold text-primary">
                                  {prediction.symbol.slice(0, 2)}
                                </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{prediction.name}</h3>
                              <p className="text-sm text-muted-foreground">{prediction.symbol} • {prediction.type}</p>
                            </div>
                          </div>

                          {/* Current Price */}
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Current Price</p>
                            <p className="font-mono font-medium text-foreground">₹{prediction.currentPrice.toLocaleString('en-IN')}</p>
                          </div>

                          {/* Prediction */}
                          <div className="text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPredictionColor(prediction.prediction)}`}>
                              {prediction.prediction}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">{prediction.confidence}% confidence</p>
                          </div>

                          {/* Target & Risk */}
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Target Price</p>
                            <p className="font-mono font-medium text-success">₹{prediction.targetPrice.toLocaleString('en-IN')}</p>
                            <p className={`text-xs mt-1 ${getRiskColor(prediction.riskLevel)}`}>
                              {prediction.riskLevel} Risk
                            </p>
                          </div>

                          {/* Potential Return */}
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Potential Return</p>
                            <p className="font-mono font-medium text-success">+{prediction.potentialReturn}%</p>
                            <p className="text-xs text-muted-foreground">{prediction.timeframe}</p>
                          </div>

                          {/* Signals */}
                          <div className="lg:min-w-48">
                            <p className="text-sm text-muted-foreground mb-2">Key Signals</p>
                            <div className="flex flex-wrap gap-1">
                              {prediction.signals.slice(0, 2).map((signal, index) => (
                                <span key={index} className="px-2 py-1 bg-secondary/50 rounded text-xs text-muted-foreground border border-transparent group-hover:border-primary/20 transition-colors">
                                  {signal}
                                </span>
                              ))}
                            </div>
                            {prediction.indicators && (
                              <div className="mt-2 text-xs text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                                RSI {prediction.indicators.rsi} • MACD {prediction.indicators.macd}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-border/50 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(filteredPredictions.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredPredictions.length, currentPage * itemsPerPage)} of {filteredPredictions.length} predictions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Logic to show current page centered window
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        p = currentPage - 2 + i;
                      }
                      if (p > totalPages) return null;
                      
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === p
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-secondary text-muted-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predictions;
