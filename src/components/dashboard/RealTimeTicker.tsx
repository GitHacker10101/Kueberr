import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface TickerItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  potentialReturn: string;
  prediction: string;
  confidence: number;
}

interface PredictionsPayload {
  predictions?: TickerItem[];
}

const formatPrice = (value: number): string =>
  `Rs ${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const RealTimeTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTicker = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/predictions?horizon=daily&limit=8&engine=hybrid`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Ticker unavailable");
        }
        const payload = (await response.json()) as PredictionsPayload;
        if (cancelled) return;
        setItems(Array.isArray(payload.predictions) ? payload.predictions : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof Error ? err.message : "Ticker unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchTicker();
    const timer = window.setInterval(() => {
      void fetchTicker();
    }, 25000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Live Market</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <TriangleAlert className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {items.map((item) => {
            const potential = Number.parseFloat(item.potentialReturn ?? "0");
            const up = Number.isFinite(potential) ? potential >= 0 : true;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-mono text-xs font-bold text-primary">{item.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.symbol}</p>
                    <p className="text-xs text-muted-foreground">{item.name.slice(0, 18)}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono font-medium text-foreground text-sm">{formatPrice(item.currentPrice)}</p>
                  <div className={`flex items-center gap-1 text-xs ${up ? "text-success" : "text-destructive"}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>
                      {Number.isFinite(potential) ? `${potential >= 0 ? "+" : ""}${potential.toFixed(2)}%` : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <p className="text-xs text-muted-foreground">{item.confidence.toFixed(1)}% conf</p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      item.prediction.includes("Buy")
                        ? "bg-success/20 text-success"
                        : item.prediction.includes("Sell")
                        ? "bg-destructive/20 text-destructive"
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    {item.prediction}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updates every 25 seconds</span>
          <span>{items.length} tracked symbols</span>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTicker;
