import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Filter,
  Globe,
  Loader2,
  Search,
  Star,
  StarOff,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: "stock";
  current_price: number | null;
  isIndian: boolean;
  livePrice: number | null;
  changePercent1d: number | null;
}

interface WatchlistPayload {
  assets?: Array<{ symbol: string }>;
}

interface MarketStocksPayload {
  items?: Array<{
    id: string;
    symbol: string;
    name: string;
    type: "stock";
    current_price?: number | null;
  }>;
}

interface QuotePayload {
  id: string;
  price: number | null;
  changePercent1d: number | null;
}

const INDIAN_SYMBOLS = new Set([
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "HINDUNILVR",
  "ITC",
  "KOTAKBANK",
  "LT",
  "AXISBANK",
  "BAJFINANCE",
  "MARUTI",
  "BHARTIARTL",
  "ADANIPORTS",
  "POWERGRID",
  "NTPC",
  "SUNPHARMA",
  "DRREDDY",
  "CIPLA",
  "DIVISLAB",
  "ONGC",
  "COALINDIA",
  "GAIL",
  "TATASTEEL",
  "JSWSTEEL",
  "ULTRACEMCO",
  "GRASIM",
  "AMBUJACEM",
  "SHREECEM",
  "ASIANPAINT",
]);

const formatPrice = (price: number | null): string => {
  if (price === null || !Number.isFinite(price)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const Markets = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "change">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState<"all" | "stocks">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());
  const [pendingWatchlistSymbol, setPendingWatchlistSymbol] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);

        const [marketResponse, watchlistResponse] = await Promise.all([
          fetch(`${API_BASE}/api/market/stocks?limit=700`),
          fetch(`${API_BASE}/api/watchlist`),
        ]);

        if (!marketResponse.ok) {
          const payload = (await marketResponse.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load market universe");
        }

        const marketPayload = (await marketResponse.json()) as MarketStocksPayload | { items?: Asset[] };
        const rawItems = Array.isArray((marketPayload as MarketStocksPayload).items)
          ? (marketPayload as MarketStocksPayload).items!
          : [];

        const baseAssets: Asset[] = rawItems.map((asset) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: "stock",
          current_price: asset.current_price ?? null,
          isIndian: INDIAN_SYMBOLS.has(asset.symbol.toUpperCase()),
          livePrice: asset.current_price ?? null,
          changePercent1d: null,
        }));

        setAssets(baseAssets);

        if (watchlistResponse.ok) {
          const watchlistPayload = (await watchlistResponse.json()) as WatchlistPayload;
          const symbols = new Set(
            Array.isArray(watchlistPayload.assets) ? watchlistPayload.assets.map((item) => item.symbol.toUpperCase()) : []
          );
          setWatchlistSymbols(symbols);
        }
      } catch (err) {
        setAssets([]);
        setError(err instanceof Error ? err.message : "Failed to load market data");
      } finally {
        setLoading(false);
      }
    };

    void fetchAssets();
  }, []);

  useEffect(() => {
    if (assets.length === 0) return;
    let cancelled = false;

    const fetchQuotes = async () => {
      const sample = assets.slice(0, 60);
      const results = await Promise.allSettled(
        sample.map(async (asset) => {
          const response = await fetch(`${API_BASE}/api/market/quote/${asset.id}`);
          if (!response.ok) return null;
          const payload = (await response.json()) as QuotePayload;
          if (payload.price === null) return null;
          return {
            id: asset.id,
            price: payload.price,
            changePercent1d: payload.changePercent1d,
          };
        })
      );

      if (cancelled) return;
      const quoteMap = new Map<string, { price: number; changePercent1d: number | null }>();
      results.forEach((entry) => {
        if (entry.status !== "fulfilled" || !entry.value) return;
        quoteMap.set(entry.value.id, { price: entry.value.price, changePercent1d: entry.value.changePercent1d });
      });

      setAssets((prev) =>
        prev.map((asset) => {
          const quote = quoteMap.get(asset.id);
          if (!quote) return asset;
          return {
            ...asset,
            livePrice: quote.price,
            changePercent1d: quote.changePercent1d,
          };
        })
      );
    };

    void fetchQuotes();
    return () => {
      cancelled = true;
    };
  }, [assets.length]);

  const filteredAssets = useMemo(() => {
    let filtered = [...assets];

    if (activeTab !== "all") {
      filtered = filtered.filter((asset) => asset.type === "stock");
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (asset) => asset.name.toLowerCase().includes(query) || asset.symbol.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      const aIndian = a.isIndian ? 1 : 0;
      const bIndian = b.isIndian ? 1 : 0;
      if (aIndian !== bIndian) return bIndian - aIndian;

      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === "asc" ? cmp : -cmp;
      }

      if (sortBy === "price") {
        const aValue = a.livePrice ?? a.current_price ?? 0;
        const bValue = b.livePrice ?? b.current_price ?? 0;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aChange = a.changePercent1d ?? 0;
      const bChange = b.changePercent1d ?? 0;
      return sortOrder === "asc" ? aChange - bChange : bChange - aChange;
    });

    return filtered;
  }, [activeTab, assets, searchQuery, sortBy, sortOrder]);

  const toggleWatchlist = async (asset: Asset) => {
    const symbolKey = asset.symbol.toUpperCase();
    setPendingWatchlistSymbol(symbolKey);
    try {
      if (watchlistSymbols.has(symbolKey)) {
        const response = await fetch(`${API_BASE}/api/watchlist/${asset.id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Failed to remove from watchlist");
        setWatchlistSymbols((prev) => {
          const next = new Set(prev);
          next.delete(symbolKey);
          return next;
        });
        toast.success(`${asset.symbol} removed from watchlist`);
      } else {
        const response = await fetch(`${API_BASE}/api/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: asset.id }),
        });
        if (!response.ok) throw new Error("Failed to add to watchlist");
        setWatchlistSymbols((prev) => {
          const next = new Set(prev);
          next.add(symbolKey);
          return next;
        });
        toast.success(`${asset.symbol} added to watchlist`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Watchlist update failed");
    } finally {
      setPendingWatchlistSymbol(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading markets...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Markets</h1>
            <p className="text-muted-foreground">Live asset universe with watchlist integration</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Live market load failed</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Quick filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortBy("price");
                  setSortOrder("desc");
                }}
              >
                Top price
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortBy("change");
                  setSortOrder("desc");
                }}
              >
                Top gainers
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("stocks")}>
                Stocks only
              </Button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold text-foreground">{assets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Live Quotes</p>
                  <p className="text-2xl font-bold text-foreground">{assets.filter((item) => item.changePercent1d !== null).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Watchlist</p>
                  <p className="text-2xl font-bold text-foreground">{watchlistSymbols.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "stocks")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Assets ({assets.length})</TabsTrigger>
            <TabsTrigger value="stocks">Stocks ({assets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { key: "name", label: "Name" },
                  { key: "price", label: "Price" },
                  { key: "change", label: "Change" },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={sortBy === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (sortBy === key) {
                        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        return;
                      }
                      setSortBy(key as "name" | "price" | "change");
                      setSortOrder("asc");
                    }}
                  >
                    {label} {sortBy === key && (sortOrder === "asc" ? "up" : "down")}
                  </Button>
                ))}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-muted-foreground">Asset</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Price</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">1D Change</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Feed</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => {
                        const price = asset.livePrice ?? asset.current_price;
                        const change = asset.changePercent1d;
                        const hasLiveQuote = change !== null;
                        const inWatchlist = watchlistSymbols.has(asset.symbol.toUpperCase());
                        const watchBusy = pendingWatchlistSymbol === asset.symbol.toUpperCase();

                        return (
                          <tr
                            key={asset.id}
                            className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                            onClick={() => navigate(`/stock/${asset.symbol}`)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <span className="font-mono text-xs font-bold text-primary">{asset.symbol.slice(0, 2)}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{asset.name}</p>
                                  <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {asset.type}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono font-medium text-foreground">{formatPrice(price)}</td>
                            <td className="p-4 text-right">
                              {change === null ? (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              ) : (
                                <div
                                  className={`flex items-center justify-end gap-1 ${
                                    change >= 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                  <span className="font-medium">
                                    {change >= 0 ? "+" : ""}
                                    {change.toFixed(2)}%
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <Badge variant="outline" className={hasLiveQuote ? "border-success/40 text-success" : ""}>
                                {hasLiveQuote ? "Live" : "Reference"}
                              </Badge>
                            </td>
                            <td className="p-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={watchBusy}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void toggleWatchlist(asset);
                                }}
                              >
                                {watchBusy ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : inWatchlist ? (
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                ) : (
                                  <StarOff className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredAssets.length === 0 && (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No assets found matching your criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Markets;
