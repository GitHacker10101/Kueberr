import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Star,
  StarOff,
  Filter,
  BarChart3,
  Loader2,
  Globe
} from "lucide-react";
import { getAllAssets } from "@/data/mockDataService";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock';
  current_price: number;
  change_percent_24h?: number;
  market_cap?: number;
  volume_24h?: number;
  isIndian?: boolean;
}

const INDIAN_SYMBOLS = new Set([
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'HINDUNILVR',
  'ITC',
  'KOTAKBANK',
  'LT',
  'AXISBANK',
  'BAJFINANCE',
  'MARUTI',
  'BHARTIARTL',
  'ADANIPORTS',
  'POWERGRID',
  'NTPC',
  'SUNPHARMA',
  'DRREDDY',
  'CIPLA',
  'DIVISLAB',
  'ONGC',
  'COALINDIA',
  'GAIL',
  'TATASTEEL',
  'JSWSTEEL',
  'ULTRACEMCO',
  'GRASIM',
  'AMBUJACEM',
  'SHREECEM',
  'ASIANPAINT'
]);

const Markets = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<'all' | 'stocks'>('all');
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const allAssets = getAllAssets();

        // Enhance assets with mock data
        const enhancedAssets = allAssets.map(asset => ({
          ...asset,
          change_percent_24h: (Math.random() - 0.5) * 10,
          market_cap: Math.random() * 1000000000000,
          volume_24h: Math.random() * 1000000000,
          isIndian: INDIAN_SYMBOLS.has(asset.symbol.toUpperCase())
        }));

        setAssets(enhancedAssets);
        setFilteredAssets(enhancedAssets);

        // Mock watchlist (in real app, this would come from user data)
        const mockWatchlist = new Set(['RELIANCE', 'TCS']);
        setWatchlist(mockWatchlist);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  useEffect(() => {
    let filtered = assets;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(asset => asset.type === activeTab.slice(0, -1)); // Remove 's' from 'stocks'
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort (Indian stocks first, then by selected sort)
    filtered.sort((a, b) => {
      const aIndian = a.isIndian ? 1 : 0;
      const bIndian = b.isIndian ? 1 : 0;
      if (aIndian !== bIndian) {
        return bIndian - aIndian;
      }

      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.current_price;
          bValue = b.current_price;
          break;
        case 'change':
          aValue = a.change_percent_24h || 0;
          bValue = b.change_percent_24h || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredAssets(filtered);
  }, [assets, searchQuery, sortBy, sortOrder, activeTab]);

  const toggleWatchlist = (symbol: string) => {
    const newWatchlist = new Set(watchlist);
    if (newWatchlist.has(symbol)) {
      newWatchlist.delete(symbol);
    } else {
      newWatchlist.add(symbol);
    }
    setWatchlist(newWatchlist);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000000000) {
      return `₹${(marketCap / 1000000000000).toFixed(1)}T`;
    } else if (marketCap >= 1000000000) {
      return `₹${(marketCap / 1000000000).toFixed(1)}B`;
    } else {
      return `₹${(marketCap / 1000000).toFixed(1)}M`;
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

  const stocksCount = assets.filter(a => a.type === 'stock').length;
  const watchlistCount = watchlist.size;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Markets</h1>
            <p className="text-muted-foreground">Explore stocks</p>
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

        {showFilters && (
          <div className="glass-card rounded-xl p-4" data-testid="filters-panel">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Quick filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortBy('price');
                  setSortOrder('desc');
                }}
              >
                Top price
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortBy('change');
                  setSortOrder('desc');
                }}
              >
                Biggest gainers
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab('stocks');
                }}
              >
                Stocks only
              </Button>
            </div>
          </div>
        )}

        {/* Market Overview */}
        <div className="grid md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-muted-foreground">Stocks</p>
                  <p className="text-2xl font-bold text-foreground">{stocksCount}</p>
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
                  <p className="text-2xl font-bold text-foreground">{watchlistCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Asset Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Assets ({assets.length})</TabsTrigger>
            <TabsTrigger value="stocks">Stocks ({stocksCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Sort Controls */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex gap-2">
                {[
                  { key: 'name', label: 'Name' },
                  { key: 'price', label: 'Price' },
                  { key: 'change', label: 'Change' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={sortBy === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (sortBy === key) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(key);
                        setSortOrder('asc');
                      }
                    }}
                  >
                    {label} {sortBy === key && (sortOrder === 'asc' ? '↑' : '↓')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Assets Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-muted-foreground">Asset</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Price</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">24h Change</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Market Cap</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">Volume</th>
                        <th className="text-center p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => (
                        <tr
                          key={asset.id}
                          className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                          onClick={() => navigate(`/stock/${asset.symbol}`)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="font-mono text-xs font-bold text-primary">
                                  {asset.symbol.slice(0, 2)}
                                </span>
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
                          <td className="p-4 text-right font-mono font-medium text-foreground">
                            {formatPrice(asset.current_price)}
                          </td>
                          <td className="p-4 text-right">
                            <div className={`flex items-center justify-end gap-1 ${(asset.change_percent_24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {(asset.change_percent_24h || 0) >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              <span className="font-medium">
                                {asset.change_percent_24h?.toFixed(2)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-muted-foreground">
                            {asset.market_cap ? formatMarketCap(asset.market_cap) : 'N/A'}
                          </td>
                          <td className="p-4 text-right font-mono text-muted-foreground">
                            {asset.volume_24h ? formatMarketCap(asset.volume_24h) : 'N/A'}
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(asset.symbol);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              {watchlist.has(asset.symbol) ? (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
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
