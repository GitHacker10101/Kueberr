import { TrendingDown, TrendingUp } from "lucide-react";

const quotes = [
  { symbol: "RELIANCE", price: "2,847.50", change: "+2.34%", up: true },
  { symbol: "TCS", price: "3,521.25", change: "+1.12%", up: true },
  { symbol: "INFY", price: "1,456.80", change: "-0.87%", up: false },
  { symbol: "HDFCBANK", price: "1,678.35", change: "+0.45%", up: true },
  { symbol: "SBIN", price: "750.20", change: "+3.21%", up: true },
  { symbol: "ICICIBANK", price: "1,020.50", change: "-1.45%", up: false },
  { symbol: "TATAMOTORS", price: "892.15", change: "+1.92%", up: true },
];

const StockTicker = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/65 py-3 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-card to-transparent" />

      <div className="flex min-w-max items-center gap-3 animate-[ticker-scroll_30s_linear_infinite] px-3">
        {[...quotes, ...quotes].map((quote, index) => (
          <div
            key={`${quote.symbol}-${index}`}
            className="flex min-w-fit items-center gap-3 rounded-xl border border-white/10 bg-background/65 px-4 py-2.5"
          >
            <span className="font-mono text-xs font-semibold text-foreground">{quote.symbol}</span>
            <span className="font-mono text-xs text-muted-foreground">INR {quote.price}</span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${quote.up ? "text-success" : "text-destructive"}`}>
              {quote.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {quote.change}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

export default StockTicker;
