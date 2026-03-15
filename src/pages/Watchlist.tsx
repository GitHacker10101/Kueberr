import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowUpDown, Search, Plus, Star, Trash2, Loader2, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface WatchlistItem {
  id: string;
  asset_id: string; // Added asset_id
  symbol: string;
  name: string;
  price: string;
  change: string;
  isUp: boolean;
  prediction: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  accuracy: string;
  type: string;
  marketCap?: string; // Optional for now
  volume?: string;    // Optional for now
}

interface WatchlistStats {
  totalAssets: number;
  stocks: number;
  avgAccuracy: string;
}

interface MarketStockSearchItem {
  id: string;
  symbol: string;
  name: string;
  type: string;
}

const Watchlist = () => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<WatchlistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Stock State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MarketStockSearchItem[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/watchlist`);
      if (!response.ok) throw new Error('Failed to fetch watchlist');
      const data = await response.json();

      setWatchlist(data.assets);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      // Fallback
      toast.error("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  // Filter local watchlist
  const filteredWatchlist = watchlist.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Search API for adding stocks
  useEffect(() => {
    const searchStocks = async () => {
      if (addSearchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/market/stocks?limit=400`);
        if (response.ok) {
          const payload = (await response.json()) as { items?: MarketStockSearchItem[] } | MarketStockSearchItem[];
          const allStocks = Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : [];
          const filtered = allStocks.filter((s) =>
            s.symbol.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(addSearchQuery.toLowerCase())
          ).slice(0, 5);
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search failed", err);
      }
    };

    const timeoutId = setTimeout(searchStocks, 300);
    return () => clearTimeout(timeoutId);
  }, [addSearchQuery]);

  const handleAddToWatchlist = async (stock: any) => {
    setAddingId(stock.id);
    try {
      const response = await fetch(`${API_BASE}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: stock.id }),
      });

      if (!response.ok) throw new Error('Failed to add');

      toast.success(`${stock.symbol} added to watchlist`);
      setIsDialogOpen(false);
      setAddSearchQuery("");
      fetchWatchlist();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add to watchlist");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveFromWatchlist = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation(); // Prevent row click
    if (!confirm("Remove from watchlist?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/watchlist/${assetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove');

      toast.success("Removed from watchlist");
      fetchWatchlist();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove");
    }
  };

  const getPredictionColor = (prediction: string) => {
    if (prediction.includes('Strong Buy')) return 'text-success bg-success/10 border-success/20';
    if (prediction.includes('Buy')) return 'text-success bg-success/10 border-success/20';
    if (prediction.includes('Sell')) return 'text-destructive bg-destructive/10 border-destructive/20';
    return 'text-warning bg-warning/10 border-warning/20';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Watchlist</h1>
            <p className="text-muted-foreground">Track your favorite assets and their AI predictions</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Symbol
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add to Watchlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search symbol (e.g. RELIANCE)..."
                      className="pl-9"
                      value={addSearchQuery}
                      onChange={(e) => setAddSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    {searchResults.length === 0 && addSearchQuery.length > 1 && (
                      <div className="text-center text-muted-foreground py-4">No stocks found</div>
                    )}
                    {searchResults.map(stock => (
                      <div
                        key={stock.id}
                        className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-md cursor-pointer mb-1"
                        onClick={() => handleAddToWatchlist(stock)}
                      >
                        <div>
                          <p className="font-bold">{stock.symbol}</p>
                          <p className="text-xs text-muted-foreground">{stock.name}</p>
                        </div>
                        <Button size="sm" variant="ghost" disabled={addingId === stock.id}>
                          {addingId === stock.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">Total Assets</p>
            <p className="text-2xl font-bold mt-1">{stats?.totalAssets || 0}</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">Average Accuracy</p>
            <p className="text-2xl font-bold mt-1 text-primary">{stats?.avgAccuracy || "0%"}</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">Stocks</p>
            <p className="text-2xl font-bold mt-1">{stats?.stocks || 0}</p>
          </div>
        </div>

        {/* Main List */}
        <div className="glass-card rounded-xl overflow-hidden min-h-[400px]">
          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search watchlist..."
                className="pl-9 bg-secondary/20 border-white/5"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="hidden md:flex">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 bg-secondary/10 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4 md:col-span-3">Asset</div>
            <div className="col-span-3 md:col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right hidden md:block">Change</div>
            <div className="col-span-3 text-center">AI Prediction</div>
            <div className="col-span-2 text-center hidden md:block">Confidence</div>
            <div className="col-span-2 md:col-span-1 text-center">Action</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredWatchlist.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                Your watchlist is empty or no matches found.
              </div>
            ) : (
              filteredWatchlist.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/stock/${item.symbol}`)}
                >
                  <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <div>
                      <div className="font-bold text-white">{item.symbol}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">{item.name}</div>
                    </div>
                  </div>

                  <div className="col-span-3 md:col-span-2 text-right font-mono text-white">
                    {item.price}
                  </div>

                  <div className={`col-span-2 text-right hidden md:block ${item.isUp ? 'text-success' : 'text-destructive'}`}>
                    {item.change}
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPredictionColor(item.prediction)}`}>
                      {item.prediction}
                    </span>
                  </div>

                  <div className="col-span-2 text-center text-muted-foreground text-sm hidden md:block">
                    {item.accuracy}
                  </div>

                  <div className="col-span-2 md:col-span-1 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveFromWatchlist(e, item.asset_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Watchlist;
