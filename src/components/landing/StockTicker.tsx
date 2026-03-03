import { TrendingUp, TrendingDown } from "lucide-react";

const stocks = [
  { symbol: "RELIANCE", price: "2,847.50", change: "+2.34%", isUp: true },
  { symbol: "TCS", price: "3,521.25", change: "+1.12%", isUp: true },
  { symbol: "INFY", price: "1,456.80", change: "-0.87%", isUp: false },
  { symbol: "HDFCBANK", price: "1,678.35", change: "+0.45%", isUp: true },
  { symbol: "SBIN", price: "750.20", change: "+3.21%", isUp: true },
  { symbol: "ICICIBANK", price: "1,020.50", change: "-1.45%", isUp: false },
  { symbol: "WIPRO", price: "445.60", change: "+0.78%", isUp: true },
  { symbol: "TATAMOTORS", price: "892.15", change: "+1.92%", isUp: true },
];

const StockTicker = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
      
      <div className="flex gap-6 animate-[scroll_30s_linear_infinite]">
        {[...stocks, ...stocks].map((stock, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card/50 border border-border/50 whitespace-nowrap min-w-fit"
          >
            <span className="font-mono font-semibold text-foreground">{stock.symbol}</span>
            <span className="font-mono text-muted-foreground">₹{stock.price}</span>
            <div className={`flex items-center gap-1 ${stock.isUp ? 'text-success' : 'text-destructive'}`}>
              {stock.isUp ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-mono text-sm font-medium">{stock.change}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

export default StockTicker;
