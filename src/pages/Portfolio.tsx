import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Plus, Download, PieChart, Loader2, Trash2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Holding {
  id: string; // Added ID
  name: string;
  symbol: string;
  quantity: number;
  avgPrice: string;
  currentPrice: string;
  value: string;
  pnl: string;
  pnlPercent: string;
  isUp: boolean;
}

interface Allocation {
  name: string;
  value: number;
  color: string;
}

interface PortfolioData {
  totalValue: string;
  totalPnl: string;
  totalPnlPercent: string;
  todayChange: string;
  weekChange: string;
  holdings: Holding[];
  allocation: Allocation[];
}

const Portfolio = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Holding State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/portfolio');
      if (!response.ok) throw new Error('Failed to fetch portfolio data');
      const data = await response.json();

      const apiPortfolio = data.portfolio;
      const apiHoldings = data.holdings as Holding[];

      const mapped: PortfolioData = {
        totalValue: apiPortfolio.totalValue,
        totalPnl: apiPortfolio.totalPnl,
        totalPnlPercent: apiPortfolio.totalPnlPercent,
        todayChange: apiPortfolio.dayChange,
        weekChange: "+₹45,230 (+3.89%)", // Mocked for now
        holdings: apiHoldings,
        allocation: [
          { name: "Stocks", value: 85, color: "bg-primary" },
          { name: "Cash", value: 15, color: "bg-warning" },
        ]
      };

      setPortfolioData(mapped);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Failed to load portfolio data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Debounced search for stocks
  useEffect(() => {
    const searchStocks = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await fetch(`http://localhost:3001/api/market/stocks`); // In real app, search endpoint
        if (response.ok) {
          const allStocks = await response.json();
          const filtered = allStocks.filter((s: any) =>
            s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 5);
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error("Search failed", err);
      }
    };

    const timeoutId = setTimeout(searchStocks, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAddHolding = async () => {
    if (!selectedStock || !quantity || !avgPrice) {
      toast.error("Please fill all fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:3001/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetId: selectedStock.id,
          quantity: Number(quantity),
          price: Number(avgPrice)
        }),
      });

      if (!response.ok) throw new Error('Failed to add holding');

      toast.success("Holding added successfully");
      setIsDialogOpen(false);

      // Reset form
      setSelectedStock(null);
      setQuantity("");
      setAvgPrice("");
      setSearchQuery("");

      // Refresh data
      fetchPortfolioData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add holding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm("Are you sure you want to remove this holding?")) return;

    try {
      const response = await fetch(`http://localhost:3001/api/portfolio/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete holding');

      toast.success("Holding removed");
      fetchPortfolioData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove holding");
    }
  };

  if (loading && !portfolioData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading portfolio...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="glass-card rounded-xl p-4 border border-destructive/40 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">Error loading live portfolio data</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error} - Make sure both frontend and backend are running.
            </p>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Portfolio</h1>
            <p className="text-muted-foreground">Track your investments and performance</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holding
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Holding</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Stock Search */}
                  <div className="space-y-2">
                    <Label>Select Stock</Label>
                    {!selectedStock ? (
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search symbol (e.g. RELIANCE, TCS)..."
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchResults.length > 0 && (
                          <ScrollArea className="absolute z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md h-40 mt-1">
                            <div className="p-1">
                              {searchResults.map(stock => (
                                <div
                                  key={stock.id}
                                  className="flex items-center justify-between p-2 rounded-sm hover:bg-accent cursor-pointer text-sm"
                                  onClick={() => {
                                    setSelectedStock(stock);
                                    setAvgPrice(stock.current_price.toString());
                                    setSearchResults([]);
                                  }}
                                >
                                  <span className="font-bold">{stock.symbol}</span>
                                  <span className="text-muted-foreground truncate max-w-[120px]">{stock.name}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 border rounded-md bg-secondary/20">
                        <div>
                          <p className="font-bold text-foreground">{selectedStock.symbol}</p>
                          <p className="text-xs text-muted-foreground">{selectedStock.name}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStock(null)}>Change</Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Average Price ({'₹'})</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0.00"
                        value={avgPrice}
                        onChange={(e) => setAvgPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button className="w-full" onClick={handleAddHolding} disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add to Portfolio
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-card rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Portfolio Value</p>
                <p className="text-4xl md:text-5xl font-bold text-foreground">{portfolioData?.totalValue}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-success">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-medium">{portfolioData?.totalPnl}</span>
                  </div>
                  <span className="text-success text-sm">({portfolioData?.totalPnlPercent}) all time</span>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Today</p>
                  <p className="text-success font-medium">{portfolioData?.todayChange}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">This Week</p>
                  <p className="text-success font-medium">{portfolioData?.weekChange}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Allocation</h3>
            </div>
            <div className="space-y-3">
              {portfolioData?.allocation.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-medium text-foreground">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Performance History</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm rounded-lg text-muted-foreground hover:bg-secondary">1W</button>
              <button className="px-3 py-1 text-sm rounded-lg bg-primary/10 text-primary">1M</button>
              <button className="px-3 py-1 text-sm rounded-lg text-muted-foreground hover:bg-secondary">3M</button>
              <button className="px-3 py-1 text-sm rounded-lg text-muted-foreground hover:bg-secondary">1Y</button>
              <button className="px-3 py-1 text-sm rounded-lg text-muted-foreground hover:bg-secondary">All</button>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center border border-border/50 rounded-lg bg-secondary/20">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-primary/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Portfolio performance chart</p>
              <p className="text-sm text-muted-foreground">(Integrate Plotly for live charts)</p>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="font-semibold text-foreground">Your Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Asset</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Quantity</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Avg. Price</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Current Price</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Value</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">P&L</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(
                  portfolioData?.holdings || []
                ).map((holding) => (
                  <tr key={holding.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="font-mono text-xs font-bold text-primary">
                            {holding.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{holding.name}</p>
                          <p className="text-sm text-muted-foreground">{holding.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">{holding.quantity}</td>
                    <td className="px-6 py-4 text-right font-mono text-muted-foreground">{holding.avgPrice}</td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">{holding.currentPrice}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-foreground">{holding.value}</td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 ${holding.isUp ? 'text-success' : 'text-destructive'}`}>
                        {holding.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <div>
                          <p className="font-mono font-medium">{holding.pnl}</p>
                          <p className="text-xs">{holding.pnlPercent}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteHolding(holding.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;
