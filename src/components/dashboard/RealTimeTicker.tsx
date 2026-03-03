import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  prediction: string;
  confidence: number;
}

const RealTimeTicker = () => {
  const [stocks, setStocks] = useState<StockData[]>([
    { symbol: "RELIANCE", name: "Reliance Industries", price: 2847.50, change: 65.25, changePercent: 2.34, volume: 2456789, prediction: "Strong Buy", confidence: 92 },
    { symbol: "TCS", name: "Tata Consultancy", price: 3521.25, change: 39.10, changePercent: 1.12, volume: 1234567, prediction: "Buy", confidence: 88 },
    { symbol: "INFY", name: "Infosys Ltd", price: 1456.80, change: -12.65, changePercent: -0.87, volume: 987654, prediction: "Hold", confidence: 85 },
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 1678.35, change: 23.45, changePercent: 1.42, volume: 3456789, prediction: "Buy", confidence: 90 },
    { symbol: "BTC", name: "Bitcoin", price: 8745230, change: 271890, changePercent: 3.21, volume: 45678, prediction: "Strong Buy", confidence: 94 },
    { symbol: "ETH", name: "Ethereum", price: 324580, change: -4785, changePercent: -1.45, volume: 23456, prediction: "Buy", confidence: 91 },
  ]);

  useEffect(() => {
    // Simulate real-time updates every 3 seconds
    const interval = setInterval(() => {
      setStocks(prevStocks =>
        prevStocks.map(stock => {
          // Random price movement (-0.5% to +0.5%)
          const changePercent = (Math.random() - 0.5) * 0.01;
          const newPrice = stock.price * (1 + changePercent);
          const newChange = newPrice - stock.price;
          const newChangePercent = (newChange / stock.price) * 100;

          return {
            ...stock,
            price: newPrice,
            change: stock.change + newChange,
            changePercent: newChangePercent,
            volume: stock.volume + Math.floor(Math.random() * 1000),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, symbol: string) => {
    return `₹${price.toFixed(2)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Live Market</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {stocks.map((stock) => (
          <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="font-mono text-xs font-bold text-primary">
                  {stock.symbol.slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{stock.symbol}</p>
                <p className="text-xs text-muted-foreground">{stock.name.slice(0, 15)}...</p>
              </div>
            </div>

            <div className="text-right">
              <p className="font-mono font-medium text-foreground text-sm">
                {formatPrice(stock.price, stock.symbol)}
              </p>
              <div className={`flex items-center gap-1 text-xs ${stock.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stock.changePercent >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-xs text-muted-foreground">Vol: {formatVolume(stock.volume)}</p>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                stock.prediction === 'Strong Buy'
                  ? 'bg-success/20 text-success'
                  : stock.prediction === 'Buy'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-warning/20 text-warning'
              }`}>
                {stock.prediction}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updates every 3 seconds</span>
          <span>AI Confidence: 89.5%</span>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTicker;
