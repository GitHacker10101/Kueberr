import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Loader2,
  Minus,
  PieChart,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/lib/api";

interface SentimentPayload {
  overall: "Bullish" | "Neutral" | "Bearish" | string;
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
  factors: string[];
  generatedAt: string;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const Sentiment = () => {
  const [sentiment, setSentiment] = useState<SentimentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/api/sentiment`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to load sentiment");
        }
        const payload = (await response.json()) as SentimentPayload;
        setSentiment(payload);
      } catch (err) {
        setSentiment(null);
        setError(err instanceof Error ? err.message : "Failed to load sentiment");
      } finally {
        setLoading(false);
      }
    };

    void fetchSentiment();
  }, []);

  const sentimentColor = useMemo(() => {
    if (!sentiment) return "text-muted-foreground";
    if (sentiment.score >= 70) return "text-green-500";
    if (sentiment.score >= 40) return "text-yellow-500";
    return "text-red-500";
  }, [sentiment]);

  const sentimentIcon = useMemo(() => {
    if (!sentiment) return <Minus className="w-12 h-12 text-muted-foreground" />;
    if (sentiment.overall === "Bullish") return <TrendingUp className="w-12 h-12 text-green-500" />;
    if (sentiment.overall === "Bearish") return <TrendingDown className="w-12 h-12 text-red-500" />;
    return <Minus className="w-12 h-12 text-yellow-500" />;
  }, [sentiment]);

  const breadthTotal = sentiment?.breadth.sampleSize ?? 0;
  const breadthUpPct = breadthTotal > 0 ? (sentiment!.breadth.up / breadthTotal) * 100 : 0;
  const breadthDownPct = breadthTotal > 0 ? (sentiment!.breadth.down / breadthTotal) * 100 : 0;
  const breadthFlatPct = breadthTotal > 0 ? (sentiment!.breadth.flat / breadthTotal) * 100 : 0;
  const gaugeRotation = sentiment ? clamp((sentiment.score / 100) * 360 - 45, -45, 315) : -45;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <h1 className="text-3xl font-bold mb-2">Market Sentiment</h1>
          <p className="text-muted-foreground">Live market mood from real breadth and daily return data.</p>
        </motion.div>

        {loading && (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading live sentiment...</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">Sentiment unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && sentiment && (
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
              <Card className="h-full border-primary/20 bg-gradient-to-br from-background to-secondary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Live Sentiment Gauge
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="mb-4">{sentimentIcon}</div>
                  <div className="relative flex items-center justify-center">
                    <div className="w-52 h-52 rounded-full border-8 border-secondary flex items-center justify-center relative">
                      <div
                        className="absolute inset-0 rounded-full border-8 border-transparent border-t-primary border-r-primary transition-all duration-700"
                        style={{ transform: `rotate(${gaugeRotation}deg)` }}
                      />
                      <div className="text-center">
                        <span className={`text-5xl font-bold ${sentimentColor}`}>{sentiment.score.toFixed(1)}</span>
                        <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">{sentiment.overall}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 w-full space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Extreme Fear</span>
                      <span>Extreme Greed</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                      <div
                        className="absolute top-0 h-full w-1 bg-white"
                        style={{ left: `${clamp(sentiment.score, 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    As of {new Date(sentiment.generatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Breadth and Drivers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Positive breadth</span>
                      <span className="font-semibold text-green-500">{breadthUpPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${breadthUpPct.toFixed(1)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span>Up: {sentiment.breadth.up}</span>
                      <span>Flat: {sentiment.breadth.flat}</span>
                      <span>Down: {sentiment.breadth.down}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                      <p className="text-xs text-muted-foreground">Average 1D Return</p>
                      <p className={`font-semibold mt-1 ${sentiment.drivers.avgReturnPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {sentiment.drivers.avgReturnPct >= 0 ? "+" : ""}
                        {sentiment.drivers.avgReturnPct.toFixed(2)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                      <p className="text-xs text-muted-foreground">Sample Size</p>
                      <p className="font-semibold mt-1">{sentiment.breadth.sampleSize}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                      <p className="text-xs text-muted-foreground">Down Breadth</p>
                      <p className="font-semibold mt-1 text-red-500">{breadthDownPct.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                      <p className="text-xs text-muted-foreground">Flat Breadth</p>
                      <p className="font-semibold mt-1 text-yellow-500">{breadthFlatPct.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Top Movers</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded border border-border/50 p-2">
                        <p className="text-muted-foreground mb-1">Gainers</p>
                        <div className="space-y-1">
                          {sentiment.drivers.topGainers.map((item) => (
                            <div key={`g-${item.symbol}`} className="flex items-center justify-between">
                              <span>{item.symbol}</span>
                              <Badge variant="outline" className="text-green-500 border-green-500/40">
                                +{item.changePct.toFixed(2)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded border border-border/50 p-2">
                        <p className="text-muted-foreground mb-1">Losers</p>
                        <div className="space-y-1">
                          {sentiment.drivers.topLosers.map((item) => (
                            <div key={`l-${item.symbol}`} className="flex items-center justify-between">
                              <span>{item.symbol}</span>
                              <Badge variant="outline" className="text-red-500 border-red-500/40">
                                {item.changePct.toFixed(2)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {sentiment.factors.map((factor) => (
                      <div key={factor} className="rounded-md border border-border/50 px-2 py-1.5 text-xs text-muted-foreground">
                        {factor}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Sentiment;
