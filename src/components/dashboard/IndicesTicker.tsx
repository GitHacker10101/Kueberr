import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface IndexItem {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number | null;
  percent: number | null;
  isUp: boolean | null;
}

const formatValue = (value: number): string => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatChange = (value: number | null): string => {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
};

const IndicesTicker = () => {
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchIndices = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/market/indices`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to fetch indices");
        }
        const payload = (await response.json()) as { items?: IndexItem[] };
        if (cancelled) return;
        setIndices(Array.isArray(payload.items) ? payload.items : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Indices unavailable");
        setIndices([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchIndices();
    const timer = window.setInterval(() => {
      void fetchIndices();
    }, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-4">Market Indices</h3>

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
          {indices.map((index) => (
            <div key={index.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{index.name}</p>
                <p className="text-xs text-muted-foreground">{formatValue(index.value)}</p>
              </div>
              <div className={`text-right ${index.isUp === null ? "text-muted-foreground" : index.isUp ? "text-success" : "text-destructive"}`}>
                <div className="flex items-center justify-end gap-1">
                  {index.isUp === null ? (
                    <span className="w-3 h-3 inline-block" />
                  ) : index.isUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <p className="font-medium text-sm">
                    {index.percent === null ? "N/A" : `${index.percent >= 0 ? "+" : ""}${index.percent.toFixed(2)}%`}
                  </p>
                </div>
                <p className="text-xs">{formatChange(index.change)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndicesTicker;
