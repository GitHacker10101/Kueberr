import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Star,
  StarOff,
  Target,
  Wallet,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/api";

const USER_ID = "user-1";

interface StockData {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
}

interface PredictionData {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
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
  priceRange?: { low: number; high: number };
  regime?: string;
  sector?: string;
  marketCapClass?: string;
  supportLevel?: number;
  resistanceLevel?: number;
  volatility?: number;
  analystRating?: string;
  analystCount?: number;
  nextEarningsDate?: string;
  historicalPredictions?: Array<{
    date: string;
    prediction: string;
    actual: string;
    accuracy: number;
  }>;
  winProbability?: number;
  riskRewardRatio?: number;
  modelAgreement?: number;
  catalysts?: string[];
}

interface PositionItem {
  symbol: string;
  quantity: number;
  avg_cost: number;
}

interface PositionsPayload {
  positions: PositionItem[];
  totals: {
    cash: number;
  };
}

interface WatchlistPayload {
  assets?: Array<{
    asset_id: string;
    symbol: string;
  }>;
}

const formatMoney = (value: number): string =>
  `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const StockDetails = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [position, setPosition] = useState<PositionItem | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<string>("1");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const request = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }, []);

  const fetchData = useCallback(async () => {
    if (!symbol) {
      setError("Stock not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const symbolUpper = symbol.trim().toUpperCase();
      const [predictionPayload, positionsPayload, watchlistPayload] = await Promise.all([
        request<PredictionData>(`${API_BASE}/api/predictions/${symbolUpper}?horizon=monthly&engine=hybrid`),
        request<PositionsPayload>(`${API_BASE}/api/command/portfolio/positions?user_id=${USER_ID}`).catch(() => ({
          positions: [],
          totals: { cash: 0 },
        })),
        request<WatchlistPayload>(`${API_BASE}/api/watchlist`).catch(() => ({ assets: [] })),
      ]);

      setPrediction(predictionPayload);
      setStockData({
        id: predictionPayload.assetId,
        symbol: predictionPayload.symbol,
        name: predictionPayload.name,
        currentPrice: predictionPayload.currentPrice,
      });

      const activePosition =
        positionsPayload.positions.find(
          (item) => item.symbol.trim().toUpperCase() === predictionPayload.symbol.trim().toUpperCase()
        ) ?? null;
      setPosition(activePosition);
      setUserBalance(positionsPayload.totals.cash ?? 0);

      const inWatchlist = (watchlistPayload.assets ?? []).some(
        (item) => item.symbol.trim().toUpperCase() === predictionPayload.symbol.trim().toUpperCase()
      );
      setIsInWatchlist(inWatchlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stock details");
      setStockData(null);
      setPrediction(null);
      setPosition(null);
      setUserBalance(0);
      setIsInWatchlist(false);
    } finally {
      setLoading(false);
    }
  }, [request, symbol]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const ensureAssetId = useCallback(async (): Promise<string> => {
    if (stockData?.id) return stockData.id;
    if (!stockData?.symbol) throw new Error("Asset symbol unavailable");

    const payload = await request<{ id: string }>(`${API_BASE}/api/market/stocks/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: stockData.symbol, name: stockData.name }),
    });
    return payload.id;
  }, [request, stockData]);

  const toggleWatchlist = async () => {
    if (!stockData) return;
    setWatchlistLoading(true);
    setTradeError(null);
    setTradeSuccess(null);

    try {
      const assetId = await ensureAssetId();
      if (isInWatchlist) {
        await request(`${API_BASE}/api/watchlist/${assetId}`, { method: "DELETE" });
        setIsInWatchlist(false);
        setTradeSuccess(`${stockData.symbol} removed from watchlist`);
      } else {
        await request(`${API_BASE}/api/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId }),
        });
        setIsInWatchlist(true);
        setTradeSuccess(`${stockData.symbol} added to watchlist`);
      }
    } catch (err) {
      setTradeError(err instanceof Error ? err.message : "Failed to update watchlist");
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleTrade = async (side: "BUY" | "SELL") => {
    if (!stockData) return;

    const quantity = Number.parseFloat(tradeQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setTradeError("Please enter a valid quantity");
      return;
    }

    setTradeLoading(true);
    setTradeError(null);
    setTradeSuccess(null);

    try {
      await request(`${API_BASE}/api/command/portfolio/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          symbol: stockData.symbol.toUpperCase(),
          side,
          quantity,
          price: stockData.currentPrice,
          fees: 0,
        }),
      });

      setTradeSuccess(`${side} transaction recorded for ${quantity} ${stockData.symbol}`);
      setTradeQuantity("1");
      await fetchData();
    } catch (err) {
      setTradeError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setTradeLoading(false);
    }
  };

  const potentialReturnText = useMemo(() => {
    if (!prediction) return "0.0";
    const parsed = Number.parseFloat(prediction.potentialReturn);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(1);
    }
    return prediction.potentialReturn;
  }, [prediction]);

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
          <Button onClick={() => navigate("/predictions")}>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/predictions")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{stockData.name}</h1>
              <p className="text-muted-foreground">{stockData.symbol} | Stock</p>
            </div>
          </div>
          <Button variant={isInWatchlist ? "default" : "outline"} size="sm" onClick={() => void toggleWatchlist()} disabled={watchlistLoading}>
            {watchlistLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isInWatchlist ? (
              <Star className="w-4 h-4 mr-2" />
            ) : (
              <StarOff className="w-4 h-4 mr-2" />
            )}
            {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Card>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                      <p className="text-3xl font-bold text-foreground">{formatMoney(stockData.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Prediction</p>
                      <div className="flex items-center gap-2">
                        <Badge>{prediction.prediction}</Badge>
                        <Badge variant="outline">{prediction.riskLevel} Risk</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground">Confidence</p>
                      <p className="text-xl font-bold text-primary">{prediction.confidence.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground">Potential Return</p>
                      <p className="text-xl font-bold text-success">+{potentialReturnText}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground">Win Probability</p>
                      <p className="text-lg font-semibold">{prediction.winProbability?.toFixed(1) ?? "N/A"}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/20">
                      <p className="text-sm text-muted-foreground">Risk Reward</p>
                      <p className="text-lg font-semibold">{prediction.riskRewardRatio?.toFixed(2) ?? "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Target Price</p>
                      <p className="font-medium">{formatMoney(prediction.targetPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stop Loss</p>
                      <p className="font-medium">{formatMoney(prediction.stopLoss)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Timeframe</p>
                      <p className="font-medium">{prediction.timeframe}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Signals</h3>
                    <div className="flex flex-wrap gap-2">
                      {(prediction.signals ?? []).map((signal) => (
                        <span key={signal} className="text-xs rounded-full border border-border/60 px-2 py-1 bg-secondary/20">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Technical Zones and Context</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Support</p>
                    <p className="font-medium">{prediction.supportLevel ? formatMoney(prediction.supportLevel) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resistance</p>
                    <p className="font-medium">
                      {prediction.resistanceLevel ? formatMoney(prediction.resistanceLevel) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Volatility</p>
                    <p className="font-medium">{prediction.volatility ? prediction.volatility.toFixed(2) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Regime</p>
                    <p className="font-medium">{prediction.regime ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sector</p>
                    <p className="font-medium">{prediction.sector ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model Agreement</p>
                    <p className="font-medium">{prediction.modelAgreement?.toFixed(1) ?? "N/A"}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Analyst Rating</p>
                    <p className="font-medium">{prediction.analystRating ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Analyst Count</p>
                    <p className="font-medium">{prediction.analystCount ?? "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Earnings</p>
                    <p className="font-medium">
                      {prediction.nextEarningsDate
                        ? new Date(prediction.nextEarningsDate).toLocaleDateString("en-IN")
                        : "N/A"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {Array.isArray(prediction.historicalPredictions) && prediction.historicalPredictions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
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
                            <tr key={`${item.date}-${index}`} className="border-b border-border/30 last:border-0">
                              <td className="py-2 pr-4">{new Date(item.date).toLocaleDateString("en-IN")}</td>
                              <td className="py-2 pr-4">{item.prediction}</td>
                              <td className="py-2 pr-4">{item.actual === "up" ? "Price Up" : "Price Down"}</td>
                              <td className="py-2 text-right">{item.accuracy}%</td>
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

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Portfolio Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-secondary/50 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash Balance</span>
                      <span className="font-medium">{formatMoney(userBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Holding</span>
                      <span className="font-medium">{position ? position.quantity.toFixed(2) : "0.00"} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Cost</span>
                      <span className="font-medium">{formatMoney(position?.avg_cost ?? 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input type="number" min="0.01" step="0.01" value={tradeQuantity} onChange={(event) => setTradeQuantity(event.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Notional: {formatMoney((Number.parseFloat(tradeQuantity) || 0) * stockData.currentPrice)}
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
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => void handleTrade("BUY")} disabled={tradeLoading}>
                      {tradeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
                    </Button>
                    <Button className="w-full bg-red-600 hover:bg-red-700" variant="destructive" onClick={() => void handleTrade("SELL")} disabled={tradeLoading}>
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
