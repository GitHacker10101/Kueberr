import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, AlertCircle, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getAllAssets, getAssetById, getPredictionByAssetId } from "@/data/mockDataService";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock';
  current_price: number;
}

interface Portfolio {
  balance: number;
  holdings: {
    [symbol: string]: {
      quantity: number;
      avgPrice: number;
    };
  };
  history: {
    type: 'buy' | 'sell';
    symbol: string;
    quantity: number;
    price: number;
    date: string;
  }[];
}

interface Prediction {
  id: string;
  asset_id: string;
  prediction: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  confidence: number;
  predicted_price: number;
  timeframe: string;
}

const INDIAN_SYMBOLS = new Set([
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'WIPRO',
  'AXISBANK',
  'KOTAKBANK',
  'ITC',
  'LT',
  'TATASTEEL',
  'JSWSTEEL',
  'ONGC',
  'COALINDIA',
  'GAIL',
  'HINDUNILVR',
  'BAJFINANCE',
  'MARUTI',
  'BHARTIARTL',
  'POWERGRID',
  'NTPC',
  'SUNPHARMA',
  'DRREDDY',
  'CIPLA',
  'DIVISLAB',
  'ULTRACEMCO',
  'GRASIM',
  'AMBUJACEM',
  'SHREECEM',
  'ASIANPAINT'
]);

const Trading = () => {
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [quantity, setQuantity] = useState<string>("");
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [portfolio, setPortfolio] = useState<Portfolio>({
    balance: 100000,
    holdings: {},
    history: []
  });

  useEffect(() => {
    const allAssets = getAllAssets();
    setAssets(allAssets);
    if (allAssets.length > 0) {
      setSelectedAsset(allAssets[0]);
    }

    const saved = localStorage.getItem('paperPortfolio');
    if (saved) {
      try {
        setPortfolio(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse portfolio", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('paperPortfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedFilteredAssets = [...filteredAssets].sort((a, b) => {
    const aIndian = INDIAN_SYMBOLS.has(a.symbol.toUpperCase()) ? 1 : 0;
    const bIndian = INDIAN_SYMBOLS.has(b.symbol.toUpperCase()) ? 1 : 0;
    if (aIndian !== bIndian) return bIndian - aIndian;
    return a.name.localeCompare(b.name);
  });

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    setQuantity("");
  };

  const calculateTotal = () => {
    if (!selectedAsset || !quantity) return 0;
    return selectedAsset.current_price * parseFloat(quantity);
  };

  const executeTrade = () => {
    if (!selectedAsset || !quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Invalid Order",
        description: "Please enter a valid quantity.",
        variant: "destructive"
      });
      return;
    }

    const qty = parseFloat(quantity);
    const total = selectedAsset.current_price * qty;
    const newPortfolio = { ...portfolio };

    if (orderType === 'buy') {
      if (newPortfolio.balance < total) {
        toast({
          title: "Insufficient Funds",
          description: `You need ₹${total.toLocaleString()} but have ₹${newPortfolio.balance.toLocaleString()}`,
          variant: "destructive"
        });
        return;
      }

      newPortfolio.balance -= total;
      const currentHolding = newPortfolio.holdings[selectedAsset.symbol] || { quantity: 0, avgPrice: 0 };
      const newQty = currentHolding.quantity + qty;
      const newAvgPrice = ((currentHolding.quantity * currentHolding.avgPrice) + total) / newQty;
      
      newPortfolio.holdings[selectedAsset.symbol] = {
        quantity: newQty,
        avgPrice: newAvgPrice
      };
      
      toast({
        title: "Order Executed",
        description: `Bought ${qty} ${selectedAsset.symbol} for ₹${total.toLocaleString()}`,
      });
    } else {
      const currentHolding = newPortfolio.holdings[selectedAsset.symbol];
      if (!currentHolding || currentHolding.quantity < qty) {
        toast({
          title: "Insufficient Holdings",
          description: `You only have ${currentHolding?.quantity || 0} shares of ${selectedAsset.symbol}`,
          variant: "destructive"
        });
        return;
      }

      newPortfolio.balance += total;
      newPortfolio.holdings[selectedAsset.symbol].quantity -= qty;
      if (newPortfolio.holdings[selectedAsset.symbol].quantity === 0) {
        delete newPortfolio.holdings[selectedAsset.symbol];
      }

      toast({
        title: "Order Executed",
        description: `Sold ${qty} ${selectedAsset.symbol} for ₹${total.toLocaleString()}`,
      });
    }

    newPortfolio.history.unshift({
      type: orderType,
      symbol: selectedAsset.symbol,
      quantity: qty,
      price: selectedAsset.current_price,
      date: new Date().toISOString()
    });

    setPortfolio(newPortfolio);
    setQuantity("");
  };

  const resetAccount = () => {
    if (confirm("Are you sure you want to reset your paper trading account? This will clear all holdings and history.")) {
      setPortfolio({
        balance: 100000,
        holdings: {},
        history: []
      });
      toast({
        title: "Account Reset",
        description: "Balance restored to ₹1,00,000",
      });
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'Strong Buy': return 'bg-success text-success-foreground';
      case 'Buy': return 'bg-primary text-primary-foreground';
      case 'Hold': return 'bg-warning text-warning-foreground';
      case 'Sell': return 'bg-destructive text-destructive-foreground';
      case 'Strong Sell': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const prediction = selectedAsset ? getPredictionByAssetId(selectedAsset.id) : null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Trading Center</h1>
            <p className="text-muted-foreground">Paper Trading Simulator</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-mono font-bold text-primary">₹{portfolio.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            </div>
            <Button variant="outline" size="icon" onClick={resetAccount} title="Reset Account">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Asset Selection */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Select Asset
                </CardTitle>
                <CardDescription>Choose an asset to trade</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="space-y-4 flex-1 flex flex-col">
                  <Input
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="overflow-y-auto space-y-2 pr-2 flex-1">
                    {sortedFilteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedAsset?.id === asset.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-secondary/50'
                        }`}
                        onClick={() => handleAssetSelect(asset)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{asset.name}</p>
                            <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm text-foreground">
                              ₹{asset.current_price.toLocaleString()}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {asset.type}
                            </Badge>
                          </div>
                        </div>
                        {portfolio.holdings[asset.symbol] && (
                          <div className="mt-2 text-xs text-muted-foreground flex justify-between border-t border-border/50 pt-1">
                            <span>Owned: {portfolio.holdings[asset.symbol].quantity}</span>
                            <span className={asset.current_price >= portfolio.holdings[asset.symbol].avgPrice ? 'text-success' : 'text-destructive'}>
                              {((asset.current_price - portfolio.holdings[asset.symbol].avgPrice) / portfolio.holdings[asset.symbol].avgPrice * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trading Panel */}
          <div className="lg:col-span-8 space-y-6">
            {selectedAsset && (
              <>
                {/* Asset Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {selectedAsset.name}
                          <Badge variant="outline">{selectedAsset.symbol}</Badge>
                        </CardTitle>
                        <CardDescription>
                          Current Price: ₹{selectedAsset.current_price.toLocaleString()}
                        </CardDescription>
                      </div>
                      {prediction && (
                        <Badge className={getPredictionColor(prediction.prediction)}>
                          {prediction.prediction} ({prediction.confidence}%)
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Market Cap</p>
                        <p className="text-lg font-semibold">₹{(selectedAsset.current_price * 1000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">24h Change</p>
                        <p className="text-lg font-semibold text-success">+2.34%</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Your Position</p>
                        <p className="text-lg font-semibold">{portfolio.holdings[selectedAsset.symbol]?.quantity || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-secondary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">Avg Cost</p>
                        <p className="text-lg font-semibold">₹{portfolio.holdings[selectedAsset.symbol]?.avgPrice.toFixed(2) || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Trading Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Place Order
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

                      <TabsContent value="buy" className="space-y-4 pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              placeholder="Enter quantity"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              min="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <div className="p-3 bg-secondary rounded-md flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Cost</span>
                              <p className="font-mono text-lg font-bold">
                                ₹{calculateTotal().toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button className="w-full" size="lg" onClick={executeTrade}>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Buy {selectedAsset.symbol}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Available Balance: ₹{portfolio.balance.toLocaleString()}
                        </p>
                      </TabsContent>

                      <TabsContent value="sell" className="space-y-4 pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sell-quantity">Quantity</Label>
                            <Input
                              id="sell-quantity"
                              type="number"
                              placeholder="Enter quantity"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              min="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <div className="p-3 bg-secondary rounded-md flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Proceeds</span>
                              <p className="font-mono text-lg font-bold">
                                ₹{calculateTotal().toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button variant="destructive" className="w-full" size="lg" onClick={executeTrade}>
                          <TrendingDown className="w-4 h-4 mr-2" />
                          Sell {selectedAsset.symbol}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Available to Sell: {portfolio.holdings[selectedAsset.symbol]?.quantity || 0} shares
                        </p>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* AI Insights */}
                {prediction && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        AI Trading Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">AI Prediction:</span>
                          <Badge className={getPredictionColor(prediction.prediction)}>
                            {prediction.prediction}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Confidence:</span>
                          <span className="font-semibold">{prediction.confidence}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Target Price:</span>
                          <span className="font-mono font-semibold">
                            ₹{prediction.predicted_price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Timeframe:</span>
                          <span className="font-semibold">{prediction.timeframe}</span>
                        </div>
                        <div className="p-3 bg-secondary/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                              Based on advanced AI analysis of market data, technical indicators, and sentiment analysis.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Trading;
