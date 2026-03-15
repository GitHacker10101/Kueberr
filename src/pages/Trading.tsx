import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  Loader2,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

const USER_ID = "user-1";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: "stock";
  current_price?: number | null;
}

interface PositionsPayload {
  user_id: string;
  positions: Array<{
    symbol: string;
    quantity: number;
    avg_cost: number;
    market_price: number;
    market_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    exposure_pct: number;
  }>;
  totals: {
    cash: number;
    gross_exposure: number;
    net_exposure: number;
    equity: number;
    unrealized_pnl: number;
    realized_pnl: number;
    transaction_count: number;
  };
}

interface OrdersPayload {
  items: Array<{
    id: string;
    symbol: string;
    side: "BUY" | "SELL";
    type: string;
    quantity: number;
    filled_quantity: number;
    avg_fill_price: number;
    status: string;
    created_at: string;
  }>;
}

interface PredictionPayload {
  symbol: string;
  prediction: string;
  confidence: number;
  targetPrice: number;
  timeframe: string;
  riskLevel: string;
  potentialReturn: string;
}

interface QuotePayload {
  price: number | null;
  changePercent1d: number | null;
}

const formatMoney = (value: number): string =>
  `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const getPredictionColor = (prediction: string) => {
  switch (prediction) {
    case "Strong Buy":
      return "bg-success text-success-foreground";
    case "Buy":
      return "bg-primary text-primary-foreground";
    case "Hold":
      return "bg-warning text-warning-foreground";
    case "Sell":
    case "Strong Sell":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const Trading = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<string>("1");

  const [positions, setPositions] = useState<PositionsPayload | null>(null);
  const [orders, setOrders] = useState<OrdersPayload | null>(null);
  const [prediction, setPrediction] = useState<PredictionPayload | null>(null);
  const [quote, setQuote] = useState<QuotePayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const request = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }, []);

  const loadStaticData = useCallback(async () => {
    const marketPayload = await request<{ items?: Asset[] }>(`${API_BASE}/api/market/stocks?limit=500`);
    const marketAssets = Array.isArray(marketPayload.items) ? marketPayload.items : [];
    setAssets(marketAssets);
    setSelectedAsset((prev) => {
      if (prev) {
        const stillExists = marketAssets.find((item) => item.id === prev.id);
        if (stillExists) return stillExists;
      }
      return marketAssets[0] ?? null;
    });
  }, [request]);

  const loadLiveData = useCallback(async () => {
    const [positionsPayload, ordersPayload] = await Promise.all([
      request<PositionsPayload>(`${API_BASE}/api/command/portfolio/positions?user_id=${USER_ID}`),
      request<OrdersPayload>(`${API_BASE}/api/command/paper/orders?user_id=${USER_ID}&limit=30`),
    ]);
    setPositions(positionsPayload);
    setOrders(ordersPayload);
  }, [request]);

  const refreshAll = useCallback(
    async (showSpinner: boolean = true) => {
      try {
        if (showSpinner) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);
        await Promise.all([loadStaticData(), loadLiveData()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trading data");
      } finally {
        if (showSpinner) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [loadLiveData, loadStaticData]
  );

  useEffect(() => {
    void refreshAll(true);
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedAsset) {
      setPrediction(null);
      setQuote(null);
      return;
    }

    let cancelled = false;
    const fetchDetails = async () => {
      try {
        setDetailsLoading(true);
        const [predictionPayload, quotePayload] = await Promise.all([
          request<PredictionPayload>(
            `${API_BASE}/api/predictions/${selectedAsset.symbol}?horizon=monthly&engine=hybrid`
          ),
          request<QuotePayload>(`${API_BASE}/api/market/quote/${selectedAsset.id}`),
        ]);
        if (cancelled) return;
        setPrediction(predictionPayload);
        setQuote(quotePayload);
      } catch {
        if (cancelled) return;
        setPrediction(null);
        setQuote(null);
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    };

    void fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [request, selectedAsset]);

  const holdingsBySymbol = useMemo(() => {
    const map = new Map<string, { quantity: number; avgCost: number }>();
    (positions?.positions ?? []).forEach((item) => {
      map.set(item.symbol.toUpperCase(), { quantity: item.quantity, avgCost: item.avg_cost });
    });
    return map;
  }, [positions]);

  const selectedHolding = selectedAsset ? holdingsBySymbol.get(selectedAsset.symbol.toUpperCase()) : undefined;

  const filteredAssets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter(
      (asset) => asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query)
    );
  }, [assets, searchTerm]);

  const currentPrice =
    quote?.price ??
    (selectedAsset && selectedAsset.current_price !== null && selectedAsset.current_price !== undefined
      ? selectedAsset.current_price
      : 0);

  const orderTotal = Number.parseFloat(quantity || "0") * currentPrice;

  const executeTrade = async () => {
    if (!selectedAsset) return;
    const qty = Number.parseFloat(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }

    setExecuting(true);
    setError(null);
    try {
      await request(`${API_BASE}/api/command/paper/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          symbol: selectedAsset.symbol.toUpperCase(),
          side: orderType === "buy" ? "BUY" : "SELL",
          type: "market",
          quantity: qty,
          time_in_force: "DAY",
          idempotency_key: `${selectedAsset.symbol}-${orderType}-${Date.now()}`,
        }),
      });

      toast.success(`Order submitted: ${orderType.toUpperCase()} ${qty} ${selectedAsset.symbol}`);
      setQuantity("1");
      await new Promise((resolve) => setTimeout(resolve, 800));
      await loadLiveData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Order submission failed";
      setError(message);
      toast.error(message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading trading center...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Trading Center</h1>
            <p className="text-muted-foreground">Paper OMS execution with live quant portfolio ledger</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Cash Balance</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {formatMoney(positions?.totals.cash ?? 0)}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => void refreshAll(false)} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Card className="h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Select Asset
                </CardTitle>
                <CardDescription>Live market universe</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <div className="overflow-y-auto space-y-2 mt-4 pr-2 flex-1">
                  {filteredAssets.map((asset) => {
                    const selected = selectedAsset?.id === asset.id;
                    const holding = holdingsBySymbol.get(asset.symbol.toUpperCase());
                    return (
                      <div
                        key={asset.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50"
                        }`}
                        onClick={() => {
                          setSelectedAsset(asset);
                          setQuantity("1");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{asset.name}</p>
                            <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                          </div>
                          <Badge variant="outline">{asset.type}</Badge>
                        </div>
                        {holding && (
                          <div className="mt-2 text-xs text-muted-foreground border-t border-border/50 pt-1">
                            Owned: {holding.quantity.toFixed(2)} @ {formatMoney(holding.avgCost)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {selectedAsset && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedAsset.name}
                          <Badge variant="outline">{selectedAsset.symbol}</Badge>
                        </CardTitle>
                        <CardDescription>
                          {detailsLoading ? "Updating live quote..." : `Current Price: ${formatMoney(currentPrice)}`}
                        </CardDescription>
                      </div>
                      {prediction && (
                        <Badge className={getPredictionColor(prediction.prediction)}>
                          {prediction.prediction} ({prediction.confidence.toFixed(1)}%)
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">1D Change</p>
                        <p className={`text-lg font-semibold ${(quote?.changePercent1d ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {quote?.changePercent1d !== null && quote?.changePercent1d !== undefined
                            ? `${quote.changePercent1d >= 0 ? "+" : ""}${quote.changePercent1d.toFixed(2)}%`
                            : "N/A"}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Your Position</p>
                        <p className="text-lg font-semibold">{selectedHolding?.quantity.toFixed(2) ?? "0.00"}</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Cost</p>
                        <p className="text-lg font-semibold">{formatMoney(selectedHolding?.avgCost ?? 0)}</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Account Equity</p>
                        <p className="text-lg font-semibold">{formatMoney(positions?.totals.equity ?? 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Place Market Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={orderType} onValueChange={(value) => setOrderType(value as "buy" | "sell")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="buy" className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Buy
                        </TabsTrigger>
                        <TabsTrigger value="sell" className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Sell
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value={orderType} className="space-y-4 pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              placeholder="Enter quantity"
                              value={quantity}
                              onChange={(event) => setQuantity(event.target.value)}
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <div className="p-3 bg-secondary rounded-md flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Notional</span>
                              <p className="font-mono text-lg font-bold">{formatMoney(orderTotal)}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => void executeTrade()}
                          disabled={executing}
                        >
                          {executing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : orderType === "buy" ? (
                            <TrendingUp className="w-4 h-4 mr-2" />
                          ) : (
                            <TrendingDown className="w-4 h-4 mr-2" />
                          )}
                          {orderType === "buy" ? "Buy" : "Sell"} {selectedAsset.symbol}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {prediction && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        AI Trading Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="rounded border border-border/50 p-3">
                          <p className="text-muted-foreground">Prediction</p>
                          <p className="font-semibold mt-1">{prediction.prediction}</p>
                        </div>
                        <div className="rounded border border-border/50 p-3">
                          <p className="text-muted-foreground">Confidence</p>
                          <p className="font-semibold mt-1">{prediction.confidence.toFixed(1)}%</p>
                        </div>
                        <div className="rounded border border-border/50 p-3">
                          <p className="text-muted-foreground">Target Price</p>
                          <p className="font-semibold mt-1">{formatMoney(prediction.targetPrice)}</p>
                        </div>
                        <div className="rounded border border-border/50 p-3">
                          <p className="text-muted-foreground">Risk Level</p>
                          <p className="font-semibold mt-1">{prediction.riskLevel}</p>
                        </div>
                        <div className="rounded border border-border/50 p-3">
                          <p className="text-muted-foreground">Potential Return</p>
                          <p className="font-semibold mt-1">{prediction.potentialReturn}%</p>
                        </div>
                        <div className="rounded border border-border/50 p-3">
                          <p className="text-muted-foreground">Timeframe</p>
                          <p className="font-semibold mt-1">{prediction.timeframe}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Paper Orders</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-auto">
                    {(orders?.items ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No orders submitted yet.</p>
                    ) : (
                      (orders?.items ?? []).map((order) => (
                        <div key={order.id} className="rounded border border-border/50 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <p>
                              {order.symbol} {order.side} {order.quantity.toFixed(2)}
                            </p>
                            <Badge variant="outline">{order.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Filled {order.filled_quantity.toFixed(2)} @ {order.avg_fill_price.toFixed(2)} |{" "}
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Trading;
