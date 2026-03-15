import { useEffect, useState } from "react";
import { Activity, BarChart3, Loader2, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface SentimentPayload {
  overall: string;
  score: number;
  breadth: {
    up: number;
    down: number;
    flat: number;
    sampleSize: number;
  };
  drivers: {
    topGainers: Array<{ symbol: string; changePct: number }>;
    topLosers: Array<{ symbol: string; changePct: number }>;
    avgReturnPct: number;
  };
}

const MarketSentiment = () => {
  const [payload, setPayload] = useState<SentimentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSentiment = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/sentiment`);
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Sentiment unavailable");
        }
        const data = (await response.json()) as SentimentPayload;
        if (cancelled) return;
        setPayload(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPayload(null);
        setError(err instanceof Error ? err.message : "Sentiment unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchSentiment();
    const timer = window.setInterval(() => {
      void fetchSentiment();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const scoreColor = payload
    ? payload.score >= 70
      ? "text-success"
      : payload.score >= 40
      ? "text-warning"
      : "text-destructive"
    : "text-muted-foreground";

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Market Sentiment</h3>
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
      ) : payload ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Market</span>
            <div className="flex items-center gap-2">
              {payload.overall === "Bullish" ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : payload.overall === "Bearish" ? (
                <TrendingDown className="w-4 h-4 text-destructive" />
              ) : (
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-medium">{payload.overall}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-secondary/20 rounded-lg">
              <p className={`text-2xl font-bold ${scoreColor}`}>{payload.score.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Sentiment Score</p>
            </div>
            <div className="text-center p-3 bg-secondary/20 rounded-lg">
              <p className="text-2xl font-bold text-primary">{payload.breadth.sampleSize}</p>
              <p className="text-xs text-muted-foreground">Sample Size</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Market Breadth</h4>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Up: {payload.breadth.up}</span>
              <span>Flat: {payload.breadth.flat}</span>
              <span>Down: {payload.breadth.down}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden flex">
              <div
                className="bg-success"
                style={{ width: `${payload.breadth.sampleSize > 0 ? (payload.breadth.up / payload.breadth.sampleSize) * 100 : 0}%` }}
              />
              <div
                className="bg-warning"
                style={{ width: `${payload.breadth.sampleSize > 0 ? (payload.breadth.flat / payload.breadth.sampleSize) * 100 : 0}%` }}
              />
              <div
                className="bg-destructive"
                style={{ width: `${payload.breadth.sampleSize > 0 ? (payload.breadth.down / payload.breadth.sampleSize) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Top movers</p>
            {payload.drivers.topGainers.slice(0, 2).map((item) => (
              <div key={`g-${item.symbol}`} className="flex justify-between text-xs">
                <span>{item.symbol}</span>
                <span className="text-success">+{item.changePct.toFixed(2)}%</span>
              </div>
            ))}
            {payload.drivers.topLosers.slice(0, 2).map((item) => (
              <div key={`l-${item.symbol}`} className="flex justify-between text-xs">
                <span>{item.symbol}</span>
                <span className="text-destructive">{item.changePct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketSentiment;
