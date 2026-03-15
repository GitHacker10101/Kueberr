import { useEffect, useState } from "react";
import { Activity, BarChart3, Loader2, TrendingUp, TriangleAlert } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface IndicatorPayload {
  id: string;
  symbol: string;
  name: string;
  supportLevel?: number;
  resistanceLevel?: number;
  volatility?: number;
  modelAgreement?: number;
  winProbability?: number;
  riskRewardRatio?: number;
  regime?: string;
  confidence?: number;
}

interface PredictionsPayload {
  predictions?: IndicatorPayload[];
}

const TechnicalIndicators = () => {
  const [row, setRow] = useState<IndicatorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchIndicators = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/predictions?horizon=weekly&limit=1&engine=hybrid`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Indicators unavailable");
        }
        const payload = (await response.json()) as PredictionsPayload;
        const first = Array.isArray(payload.predictions) && payload.predictions.length > 0 ? payload.predictions[0] : null;
        if (cancelled) return;
        setRow(first);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setRow(null);
        setError(err instanceof Error ? err.message : "Indicators unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchIndicators();
    const timer = window.setInterval(() => {
      void fetchIndicators();
    }, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const indicators = row
    ? [
        {
          name: "Support",
          value: row.supportLevel !== undefined ? row.supportLevel.toFixed(2) : "N/A",
          signal: row.supportLevel !== undefined ? "Live" : "Unavailable",
        },
        {
          name: "Resistance",
          value: row.resistanceLevel !== undefined ? row.resistanceLevel.toFixed(2) : "N/A",
          signal: row.resistanceLevel !== undefined ? "Live" : "Unavailable",
        },
        {
          name: "Volatility",
          value: row.volatility !== undefined ? row.volatility.toFixed(2) : "N/A",
          signal: row.volatility !== undefined ? "Live" : "Unavailable",
        },
        {
          name: "Model Agreement",
          value: row.modelAgreement !== undefined ? `${row.modelAgreement.toFixed(1)}%` : "N/A",
          signal: row.modelAgreement !== undefined ? "Live" : "Unavailable",
        },
        {
          name: "Win Probability",
          value: row.winProbability !== undefined ? `${row.winProbability.toFixed(1)}%` : "N/A",
          signal: row.winProbability !== undefined ? "Live" : "Unavailable",
        },
        {
          name: "Risk Reward",
          value: row.riskRewardRatio !== undefined ? row.riskRewardRatio.toFixed(2) : "N/A",
          signal: row.riskRewardRatio !== undefined ? "Live" : "Unavailable",
        },
      ]
    : [];

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Technical Indicators</h3>
        </div>
        {row && (
          <span className="text-xs text-muted-foreground">
            {row.symbol} {row.regime ? `| ${row.regime}` : ""}
          </span>
        )}
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
        <>
          <div className="grid grid-cols-2 gap-4">
            {indicators.map((indicator) => (
              <div key={indicator.name} className="p-4 bg-secondary/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{indicator.name}</span>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-bold text-foreground mb-1">{indicator.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{indicator.signal}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              Live quant-derived technical context
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TechnicalIndicators;
