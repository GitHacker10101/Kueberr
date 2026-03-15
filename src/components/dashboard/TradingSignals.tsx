import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Minus, TriangleAlert, Zap } from "lucide-react";
import { API_BASE } from "@/lib/api";

interface PredictionSignal {
  id: string;
  symbol: string;
  name: string;
  prediction: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeframe: string;
  signals?: string[];
  lastUpdated?: string;
}

interface PredictionPayload {
  predictions?: PredictionSignal[];
}

type Signal = {
  id: string;
  symbol: string;
  name: string;
  signal: "BUY" | "SELL" | "HOLD";
  strength: "Strong" | "Moderate" | "Weak";
  price: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  timeframe: string;
  reason: string;
  timestamp: string;
};

const predictionToSignal = (prediction: PredictionSignal): Signal => {
  const signal: Signal["signal"] = prediction.prediction.includes("Buy")
    ? "BUY"
    : prediction.prediction.includes("Sell")
    ? "SELL"
    : "HOLD";

  const strength: Signal["strength"] =
    prediction.confidence >= 85 ? "Strong" : prediction.confidence >= 70 ? "Moderate" : "Weak";

  const updated = prediction.lastUpdated ? new Date(prediction.lastUpdated) : null;
  const timestamp = updated && Number.isFinite(updated.getTime()) ? updated.toLocaleTimeString() : "live";

  return {
    id: prediction.id,
    symbol: prediction.symbol,
    name: prediction.name,
    signal,
    strength,
    price: prediction.currentPrice,
    targetPrice: prediction.targetPrice,
    stopLoss: prediction.stopLoss,
    confidence: prediction.confidence,
    timeframe: prediction.timeframe,
    reason: prediction.signals?.[0] ?? "Model signal",
    timestamp,
  };
};

const TradingSignals = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSignals = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/predictions?horizon=weekly&limit=6&engine=hybrid`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Signals unavailable");
        }

        const payload = (await response.json()) as PredictionPayload;
        const rows = Array.isArray(payload.predictions) ? payload.predictions : [];
        if (cancelled) return;
        setSignals(rows.map(predictionToSignal));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setSignals([]);
        setError(err instanceof Error ? err.message : "Signals unavailable");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchSignals();
    const timer = window.setInterval(() => {
      void fetchSignals();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const successRate = useMemo(() => {
    if (signals.length === 0) return "N/A";
    const avg = signals.reduce((sum, item) => sum + item.confidence, 0) / signals.length;
    return `${avg.toFixed(1)}%`;
  }, [signals]);

  const getSignalIcon = (signal: Signal["signal"]) => {
    if (signal === "BUY") return <ArrowUp className="w-4 h-4 text-success" />;
    if (signal === "SELL") return <ArrowDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-warning" />;
  };

  const getSignalColor = (signal: Signal["signal"]) => {
    if (signal === "BUY") return "bg-success/20 text-success border-success/30";
    if (signal === "SELL") return "bg-destructive/20 text-destructive border-destructive/30";
    return "bg-warning/20 text-warning border-warning/30";
  };

  const getStrengthColor = (strength: Signal["strength"]) => {
    if (strength === "Strong") return "text-success";
    if (strength === "Moderate") return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">AI Trading Signals</h3>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
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
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-mono text-xs font-bold text-primary">{signal.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{signal.symbol}</p>
                    <p className="text-xs text-muted-foreground">{signal.name}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getSignalColor(signal.signal)}`}>
                  {getSignalIcon(signal.signal)}
                  <span>{signal.signal}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <p className="font-mono font-medium text-foreground text-sm">Rs {signal.price.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target Price</p>
                  <p className="font-mono font-medium text-success text-sm">Rs {signal.targetPrice.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${getStrengthColor(signal.strength)}`}>{signal.strength}</span>
                  <span className="text-muted-foreground">{signal.confidence.toFixed(1)}% confidence</span>
                </div>
                <span className="text-muted-foreground">{signal.timestamp}</span>
              </div>

              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground line-clamp-1">{signal.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Signals refreshed every 60 seconds</span>
          <span>Avg confidence: {successRate}</span>
        </div>
      </div>
    </div>
  );
};

export default TradingSignals;
