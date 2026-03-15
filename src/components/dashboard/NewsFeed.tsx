import { useEffect, useState } from "react";
import { Clock, ExternalLink, Loader2, Newspaper, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api";

interface FeedItem {
  id: string;
  symbol: string;
  name: string;
  prediction: string;
  confidence: number;
  potentialReturn: string;
  catalysts?: string[];
  lastUpdated?: string;
}

interface PredictionsPayload {
  predictions?: FeedItem[];
}

const NewsFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFeed = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/predictions?horizon=daily&limit=6&engine=hybrid`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Intelligence feed unavailable");
        }
        const payload = (await response.json()) as PredictionsPayload;
        if (cancelled) return;
        setItems(Array.isArray(payload.predictions) ? payload.predictions : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof Error ? err.message : "Intelligence feed unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchFeed();
    const timer = window.setInterval(() => {
      void fetchFeed();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Market Intelligence</h3>
        </div>
        <Button variant="ghost" size="sm" disabled>
          Live
        </Button>
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
        <div className="space-y-4">
          {items.map((item) => {
            const catalyst = item.catalysts?.[0] ?? "No catalyst detail";
            const updated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleTimeString() : "live";
            const sentiment =
              item.prediction.includes("Buy") ? "positive" : item.prediction.includes("Sell") ? "negative" : "neutral";
            return (
              <div key={item.id} className="border-b border-border/50 last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      sentiment === "positive" ? "bg-success" : sentiment === "negative" ? "bg-destructive" : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm leading-tight mb-1">
                      {item.symbol}: {item.prediction} ({item.confidence.toFixed(1)}%)
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{catalyst}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{updated}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                        <a href={`${API_BASE}/api/predictions/${item.symbol}?horizon=daily&engine=hybrid`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
