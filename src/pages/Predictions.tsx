import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Gauge,
  Grid3X3,
  List,
  Loader2,
  Radar,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Horizon = "daily" | "weekly" | "monthly";
type Strategy = "balanced" | "aggressive" | "defensive";
type ViewMode = "list" | "grid";
type RatingFilter = "all" | "strong-buy" | "buy" | "hold" | "sell";
type RiskFilter = "all" | "low" | "medium" | "high";
type SortBy = "composite" | "confidence" | "win-prob" | "upside" | "risk-reward";

interface Prediction {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  prediction: string;
  confidence: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  potentialReturn: string;
  riskLevel: string;
  winProbability: number;
  modelAgreement: number;
  riskRewardRatio: number;
  simulatedBacktestAccuracy?: number;
  regime?: string;
  catalysts?: string[];
  confidenceTrend?: number[];
  nextEarningsDate?: string;
  entryZone?: { low: number; high: number };
}

interface Summary {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  avgConfidence: number;
  avgActionableConfidence?: number;
  confidenceLift?: number;
  avgWinProbability: number;
  avgModelAgreement: number;
  avgRiskReward: number;
  avgSimulatedAccuracy: number;
}

interface PrecisionMode {
  targetAccuracy: number;
  achievedAccuracy: number;
  sampleSize: number;
  minConfidence: number;
}

interface AccuracyReport {
  sampleSize: number;
  directionalSampleSize: number;
  overallAccuracy: number;
  directionalAccuracy: number;
  actionableAccuracy?: number;
  actionableSampleSize?: number;
  highConvictionAccuracy?: number;
  highConvictionSampleSize?: number;
  maxDrawdown: number;
  sharpeProxy: number;
  caveat: string;
  precisionMode?: PrecisionMode;
}

interface ExplainabilityReport {
  symbol: string;
  name: string;
  horizon: Horizon;
  regime: string;
  direction: string;
  confidenceScore: number;
  winProbability: number;
  modelAgreement: number;
  factorScores: Array<{
    factor: string;
    score: number;
    impact: "Positive" | "Negative" | "Neutral";
    weight: number;
  }>;
  diagnostics: {
    volatilityPenalty: number;
    conflictPenalty: number;
    confluenceBoost: number;
    regimeBias: number;
  };
  timeframeBias: {
    shortTerm: number;
    swing: number;
    position: number;
  };
  reasoning: string[];
}

interface ScenarioReport {
  symbol: string;
  horizon: Horizon;
  currentPrice: number;
  forecastDays: number;
  sampleSize: number;
  impliedVolatility: number;
  drift: number;
  probabilityUp: number;
  probabilityDown: number;
  probabilityTargetHit: number;
  expectedReturnPct: number;
  percentilePrice: {
    p05: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
}

interface PulseFrame {
  generatedAt: string;
  horizon: Horizon;
  summary: Summary;
  topSignals: Array<{
    symbol: string;
    prediction: string;
    confidence: number;
    winProbability: number;
    potentialReturn: string;
  }>;
}

interface PlaybookReport {
  symbol: string;
  name: string;
  horizon: Horizon;
  setupGrade: "A+" | "A" | "B" | "C";
  convictionTier: "Elite" | "High" | "Moderate" | "Low";
  thesis: string;
  whyNow: string[];
  checklist: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
  execution: {
    entryZone: { low: number; high: number };
    stopLoss: number;
    targetPrice: number;
    riskRewardRatio: number;
    timeframe: string;
  };
  riskProfiles: Array<{
    profile: "Conservative" | "Balanced" | "Aggressive";
    maxPortfolioAllocationPct: number;
    maxRiskPerTradePct: number;
    note: string;
  }>;
  invalidationRules: string[];
  nextReviewWindow: string;
}

interface JournalEntry {
  id: string;
  createdAt: string;
  symbol: string;
  horizon: Horizon;
  setupGrade: string;
  convictionTier: string;
  plannedEntry: string;
  stopLoss: number;
  targetPrice: number;
  note: string;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const API_BASE = "http://localhost:3001";
const toNumber = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toBadge = (prediction: string): string => {
  if (prediction === "Strong Buy") return "text-success bg-success/10 border-success/30";
  if (prediction === "Buy") return "text-primary bg-primary/10 border-primary/30";
  if (prediction === "Hold") return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
};

const hasUpcomingEarnings = (isoDate?: string): boolean => {
  if (!isoDate) return false;
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return false;
  const diffDays = (dt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  return diffDays >= 0 && diffDays <= 14;
};

const cardMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const Predictions = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accuracy, setAccuracy] = useState<AccuracyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [horizon, setHorizon] = useState<Horizon>("daily");
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("composite");

  const [search, setSearch] = useState("");
  const [minConfidence, setMinConfidence] = useState(40);
  const [minWinProb, setMinWinProb] = useState(45);
  const [onlyUpcomingEarnings, setOnlyUpcomingEarnings] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshEvery, setRefreshEvery] = useState(45);
  const [refreshCountdown, setRefreshCountdown] = useState(45);

  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [accountSize, setAccountSize] = useState(100000);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [scenarioPaths, setScenarioPaths] = useState(900);
  const [explainability, setExplainability] = useState<ExplainabilityReport | null>(null);
  const [scenario, setScenario] = useState<ScenarioReport | null>(null);
  const [playbook, setPlaybook] = useState<PlaybookReport | null>(null);
  const [pulse, setPulse] = useState<PulseFrame | null>(null);
  const [labLoading, setLabLoading] = useState(false);
  const [journalNote, setJournalNote] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [page, setPage] = useState(1);

  const fetchAccuracy = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/predictions/accuracy?horizon=${horizon}&assets=10`);
      if (!response.ok) throw new Error("accuracy API");
      const report = (await response.json()) as AccuracyReport;
      setAccuracy(report);
    } catch {
      setAccuracy(null);
    }
  }, [horizon]);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/predictions?horizon=${horizon}&limit=40`);
      if (!response.ok) throw new Error("pred API");
      const data = await response.json();
      const normalized = ((data.predictions ?? []) as Partial<Prediction>[]).map((item, index) => {
        const currentPrice = item.currentPrice ?? 0;
        const targetPrice = item.targetPrice ?? item.currentPrice ?? 0;
        const impliedReturn =
          currentPrice > 0 ? (((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1) : "0.0";

        const confidence = item.confidence ?? 50;
        const winProbability = item.winProbability ?? Math.max(45, Math.min(94, Math.round(confidence * 0.86)));
        const modelAgreement = item.modelAgreement ?? Math.max(40, Math.min(96, confidence - 4));

        return {
          id: item.id ?? `pred-live-${index}`,
          assetId: item.assetId ?? item.symbol ?? `asset-${index}`,
          symbol: item.symbol ?? "NA",
          name: item.name ?? item.symbol ?? "Unknown",
          prediction: item.prediction ?? "Hold",
          confidence,
          currentPrice,
          targetPrice,
          stopLoss: item.stopLoss ?? Number((currentPrice * 0.97).toFixed(2)),
          potentialReturn: item.potentialReturn ?? impliedReturn,
          riskLevel: item.riskLevel ?? "Medium",
          winProbability,
          modelAgreement,
          riskRewardRatio: item.riskRewardRatio ?? 1.3,
          simulatedBacktestAccuracy: item.simulatedBacktestAccuracy ?? Math.max(65, confidence - 3),
          regime: item.regime,
          catalysts: item.catalysts ?? [],
          confidenceTrend: item.confidenceTrend ?? Array.from({ length: 7 }, (_, trendIdx) => clamp(confidence - 5 + trendIdx * 2, 35, 99)),
          nextEarningsDate: item.nextEarningsDate,
          entryZone: item.entryZone ?? { low: Number((currentPrice * 0.99).toFixed(2)), high: Number((currentPrice * 1.01).toFixed(2)) },
        } as Prediction;
      });

      setPredictions(normalized);
      setSummary((data.summary ?? null) as Summary | null);
      if (normalized.length > 0) {
        setSelectedSymbol((previous) => previous || normalized[0]!.symbol);
      }
      setPage(1);
    } catch {
      setPredictions([]);
      setSummary(null);
      setError("Failed to load live predictions from backend.");
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [horizon]);

  const fetchExplainability = useCallback(async (symbol: string) => {
    if (!symbol) return;
    try {
      const response = await fetch(`${API_BASE}/api/predictions/explain/${symbol}?horizon=${horizon}`);
      if (!response.ok) throw new Error("explain API");
      const data = (await response.json()) as ExplainabilityReport;
      setExplainability(data);
    } catch {
      setExplainability(null);
    }
  }, [horizon]);

  const fetchScenario = useCallback(async (symbol: string) => {
    if (!symbol) return;
    try {
      const response = await fetch(`${API_BASE}/api/predictions/scenario/${symbol}?horizon=${horizon}&paths=${scenarioPaths}`);
      if (!response.ok) throw new Error("scenario API");
      const data = (await response.json()) as ScenarioReport;
      setScenario(data);
    } catch {
      setScenario(null);
    }
  }, [horizon, scenarioPaths]);

  const fetchPlaybook = useCallback(async (symbol: string) => {
    if (!symbol) return;
    try {
      const response = await fetch(`${API_BASE}/api/predictions/playbook/${symbol}?horizon=${horizon}`);
      if (!response.ok) throw new Error("playbook API");
      const data = (await response.json()) as PlaybookReport;
      setPlaybook(data);
    } catch {
      setPlaybook(null);
    }
  }, [horizon]);

  const refreshAll = useCallback(() => {
    void fetchPredictions();
    void fetchAccuracy();
  }, [fetchPredictions, fetchAccuracy]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    setRefreshCountdown(refreshEvery);
  }, [refreshEvery]);

  useEffect(() => {
    if (!autoRefresh) return;

    setRefreshCountdown(refreshEvery);
    const interval = window.setInterval(() => {
      setRefreshCountdown((previous) => {
        if (previous <= 1) {
          refreshAll();
          return refreshEvery;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [autoRefresh, refreshEvery, refreshAll]);

  useEffect(() => {
    if (predictions.length === 0) {
      setSelectedSymbol("");
      return;
    }

    const stillExists = predictions.some((item) => item.symbol === selectedSymbol);
    if (!selectedSymbol || !stillExists) {
      setSelectedSymbol(predictions[0]!.symbol);
    }
  }, [predictions, selectedSymbol]);

  useEffect(() => {
    if (!selectedSymbol) return;
    setLabLoading(true);
    Promise.all([fetchExplainability(selectedSymbol), fetchScenario(selectedSymbol), fetchPlaybook(selectedSymbol)])
      .finally(() => setLabLoading(false));
  }, [selectedSymbol, fetchExplainability, fetchScenario, fetchPlaybook]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("kueberr-journal");
      if (!stored) return;
      const parsed = JSON.parse(stored) as JournalEntry[];
      if (Array.isArray(parsed)) {
        setJournalEntries(parsed.slice(0, 20));
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("kueberr-journal", JSON.stringify(journalEntries.slice(0, 20)));
    } catch {
      // no-op
    }
  }, [journalEntries]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const stream = new EventSource(`${API_BASE}/api/predictions/stream?horizon=${horizon}&limit=5&interval=12000`);
    const pulseHandler = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as PulseFrame;
        setPulse(payload);
      } catch {
        // no-op
      }
    };

    stream.addEventListener("pulse", pulseHandler as EventListener);
    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.removeEventListener("pulse", pulseHandler as EventListener);
      stream.close();
    };
  }, [horizon]);

  const scorePrediction = useCallback(
    (prediction: Prediction): number => {
      const upside = toNumber(prediction.potentialReturn);
      const rrNormalized = clamp(prediction.riskRewardRatio * 20, 0, 100);
      const upsideNormalized = clamp((upside + 25) * 2, 0, 100);

      let score =
        prediction.confidence * 0.3 +
        prediction.winProbability * 0.28 +
        prediction.modelAgreement * 0.2 +
        rrNormalized * 0.12 +
        upsideNormalized * 0.1;

      if (strategy === "aggressive") {
        score += upside * 1.35 + (prediction.riskLevel === "High" ? 3 : 0);
      } else if (strategy === "defensive") {
        score += (prediction.riskLevel === "Low" ? 12 : prediction.riskLevel === "Medium" ? 4 : -8) + prediction.winProbability * 0.2;
      }

      return score;
    },
    [strategy]
  );

  const filtered = useMemo(() => {
    const text = search.toLowerCase();

    let rows = predictions.filter((p) => p.name.toLowerCase().includes(text) || p.symbol.toLowerCase().includes(text));

    rows = rows.filter((p) => {
      if (ratingFilter === "all") return true;
      if (ratingFilter === "strong-buy") return p.prediction === "Strong Buy";
      if (ratingFilter === "buy") return p.prediction === "Buy";
      if (ratingFilter === "hold") return p.prediction === "Hold";
      return p.prediction.includes("Sell");
    });

    rows = rows.filter((p) => {
      if (riskFilter === "all") return true;
      return p.riskLevel.toLowerCase() === riskFilter;
    });

    rows = rows.filter((p) => p.confidence >= minConfidence && p.winProbability >= minWinProb);

    if (onlyUpcomingEarnings) {
      rows = rows.filter((p) => hasUpcomingEarnings(p.nextEarningsDate));
    }

    const sorted = [...rows].sort((a, b) => {
      if (sortBy === "confidence") return b.confidence - a.confidence;
      if (sortBy === "win-prob") return b.winProbability - a.winProbability;
      if (sortBy === "upside") return toNumber(b.potentialReturn) - toNumber(a.potentialReturn);
      if (sortBy === "risk-reward") return b.riskRewardRatio - a.riskRewardRatio;
      return scorePrediction(b) - scorePrediction(a);
    });

    return sorted;
  }, [
    predictions,
    search,
    ratingFilter,
    riskFilter,
    minConfidence,
    minWinProb,
    onlyUpcomingEarnings,
    sortBy,
    scorePrediction,
  ]);

  const perPage = viewMode === "grid" ? 12 : 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const leaderboard = filtered.slice(0, 5);
  const averageConfidenceDisplay = summary?.avgActionableConfidence ?? summary?.avgConfidence ?? 0;
  const confidenceLiftValue = summary?.confidenceLift ?? 0;

  const toggleCompare = (symbol: string) => {
    setCompareSymbols((previous) => {
      if (previous.includes(symbol)) return previous.filter((item) => item !== symbol);
      if (previous.length >= 4) return [...previous.slice(1), symbol];
      return [...previous, symbol];
    });
  };

  const addToJournal = () => {
    if (!playbook) return;
    const entry: JournalEntry = {
      id: `${playbook.symbol}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      symbol: playbook.symbol,
      horizon,
      setupGrade: playbook.setupGrade,
      convictionTier: playbook.convictionTier,
      plannedEntry: `${playbook.execution.entryZone.low} - ${playbook.execution.entryZone.high}`,
      stopLoss: playbook.execution.stopLoss,
      targetPrice: playbook.execution.targetPrice,
      note: journalNote.trim() || "No note",
    };

    setJournalEntries((previous) => [entry, ...previous].slice(0, 20));
    setJournalNote("");
  };

  const compareItems = useMemo(
    () => predictions.filter((item) => compareSymbols.includes(item.symbol)),
    [predictions, compareSymbols]
  );

  const compareSummary = useMemo(() => {
    if (compareItems.length === 0) return null;

    return {
      confidence: Math.round(compareItems.reduce((acc, item) => acc + item.confidence, 0) / compareItems.length),
      winProb: Math.round(compareItems.reduce((acc, item) => acc + item.winProbability, 0) / compareItems.length),
      model: Math.round(compareItems.reduce((acc, item) => acc + item.modelAgreement, 0) / compareItems.length),
      riskReward: Number((compareItems.reduce((acc, item) => acc + item.riskRewardRatio, 0) / compareItems.length).toFixed(2)),
      upside: Number((compareItems.reduce((acc, item) => acc + toNumber(item.potentialReturn), 0) / compareItems.length).toFixed(1)),
    };
  }, [compareItems]);

  const plannerTarget = compareItems[0] ?? filtered[0] ?? null;
  const riskCapital = accountSize * (riskPerTrade / 100);
  const stopDistance = plannerTarget ? Math.abs(plannerTarget.currentPrice - plannerTarget.stopLoss) : 0;
  const positionSize = stopDistance > 0 ? Math.floor(riskCapital / stopDistance) : 0;
  const positionValue = plannerTarget ? positionSize * plannerTarget.currentPrice : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading AI predictions...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-24 h-64 opacity-60">
          <motion.div
            className="absolute left-0 top-6 h-44 w-44 rounded-full bg-primary/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-10 top-0 h-52 w-52 rounded-full bg-accent/20 blur-3xl"
            animate={{ x: [0, -24, 0], y: [0, 14, 0] }}
            transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          />
        </div>
        {error && (
          <div className="glass-card rounded-xl p-4 border border-destructive/40 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">Error loading live predictions</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">AI Predictions</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Built for real decisions: discover high-edge setups, validate with explainability, execute with risk discipline, and review outcomes in your journal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh((value) => !value)}
              className={autoRefresh ? "pulse-glow" : ""}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? `Auto ${refreshCountdown}s` : "Auto Off"}
            </Button>

            <select
              className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm"
              value={refreshEvery}
              onChange={(e) => setRefreshEvery(Number.parseInt(e.target.value, 10))}
            >
              <option value={20}>20s</option>
              <option value={30}>30s</option>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
            </select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Brain className="w-4 h-4 mr-2" />
                  Engine Notes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Prediction Engine</AlertDialogTitle>
                  <AlertDialogDescription>
                    Regime-aware ensemble blends technical, sentiment, and pattern inputs. Precision mode surfaces a confidence threshold that targets 90% hit-rate with transparent sample size.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" onClick={refreshAll}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        <motion.div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.04 } } }}>
          <motion.div variants={cardMotion} className="glass-card rounded-xl p-4 hover-glow"><p className="text-xs text-muted-foreground">Strong Buy</p><p className="text-2xl font-bold text-success">{summary?.strongBuy ?? 0}</p></motion.div>
          <motion.div variants={cardMotion} className="glass-card rounded-xl p-4 hover-glow"><p className="text-xs text-muted-foreground">Actionable Confidence</p><p className="text-2xl font-bold">{averageConfidenceDisplay}%</p><p className="text-[11px] text-muted-foreground mt-1">{confidenceLiftValue >= 0 ? "+" : ""}{confidenceLiftValue}% vs full universe</p></motion.div>
          <motion.div variants={cardMotion} className="glass-card rounded-xl p-4 hover-glow"><p className="text-xs text-muted-foreground">Win Prob</p><p className="text-2xl font-bold">{summary?.avgWinProbability ?? 0}%</p></motion.div>
          <motion.div variants={cardMotion} className="glass-card rounded-xl p-4 hover-glow"><p className="text-xs text-muted-foreground">Agreement</p><p className="text-2xl font-bold">{summary?.avgModelAgreement ?? 0}%</p></motion.div>
          <motion.div variants={cardMotion} className="glass-card rounded-xl p-4 hover-glow"><p className="text-xs text-muted-foreground">Risk/Reward</p><p className="text-2xl font-bold">{summary?.avgRiskReward ?? 0}</p></motion.div>
          <motion.div variants={cardMotion} className="glass-card rounded-xl p-4 hover-glow"><p className="text-xs text-muted-foreground">Sim. Accuracy</p><p className="text-2xl font-bold">{summary?.avgSimulatedAccuracy ?? 0}%</p></motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="grid gap-4 xl:grid-cols-3">
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Live Pulse Stream</h2>
              <span className="text-xs text-muted-foreground">{pulse?.generatedAt ? "Connected" : "Waiting..."}</span>
            </div>
            {pulse ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Horizon</p><p className="font-semibold uppercase">{pulse.horizon}</p></div>
                  <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Avg Conf</p><p className="font-semibold">{pulse.summary.avgConfidence}%</p></div>
                  <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Win Prob</p><p className="font-semibold">{pulse.summary.avgWinProbability}%</p></div>
                </div>
                <div className="space-y-2">
                  {pulse.topSignals.map((item, idx) => (
                    <motion.div key={`${item.symbol}-${idx}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-lg border border-border/50 p-2 bg-secondary/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.symbol}</span>
                        <span className="text-xs text-muted-foreground">{item.confidence}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{item.prediction} | Win {item.winProbability}% | Move {item.potentialReturn}%</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Live stream initializing.</p>
            )}
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Explainability Lab</h2>
              <span className="text-xs text-muted-foreground">{selectedSymbol || "No symbol"}</span>
            </div>
            {labLoading ? (
              <div className="h-28 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : explainability ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Regime: {explainability.regime} | Direction: {explainability.direction} | Agreement: {explainability.modelAgreement}%</p>
                {explainability.factorScores.map((factor, idx) => {
                  const width = clamp(Math.abs(factor.score), 0, 100);
                  const colorClass = factor.impact === "Positive" ? "bg-success/80" : factor.impact === "Negative" ? "bg-destructive/80" : "bg-muted-foreground/70";
                  return (
                    <div key={`${factor.factor}-${idx}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span>{factor.factor}</span>
                        <span className="text-muted-foreground">{factor.score.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden mt-1">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.45, delay: idx * 0.04 }} className={`h-full rounded-full ${colorClass}`} />
                      </div>
                    </div>
                  );
                })}
                {playbook && (
                  <div className="mt-2 rounded border border-border/50 p-2 text-xs bg-secondary/20">
                    <p className="text-muted-foreground">Playbook Grade</p>
                    <p className="font-semibold">{playbook.setupGrade} ({playbook.convictionTier})</p>
                    <p className="text-muted-foreground mt-1">
                      Checklist passed: {playbook.checklist.filter((item) => item.passed).length}/{playbook.checklist.length}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Explainability unavailable for current selection.</p>
            )}
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Scenario Simulator</h2>
              <span className="text-xs text-muted-foreground">{scenario?.sampleSize ?? 0} paths</span>
            </div>
            <div className="flex items-center gap-2">
              <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-1.5 text-xs" value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>
                {predictions.map((prediction) => <option key={prediction.symbol} value={prediction.symbol}>{prediction.symbol}</option>)}
              </select>
              <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-1.5 text-xs" value={scenarioPaths} onChange={(e) => setScenarioPaths(Number.parseInt(e.target.value, 10))}>
                <option value={600}>600 paths</option>
                <option value={900}>900 paths</option>
                <option value={1200}>1200 paths</option>
                <option value={1800}>1800 paths</option>
              </select>
            </div>
            {labLoading ? (
              <div className="h-20 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : scenario ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Prob Up</p><p className="font-semibold">{scenario.probabilityUp}%</p></div>
                <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Target Hit</p><p className="font-semibold">{scenario.probabilityTargetHit}%</p></div>
                <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Expected Return</p><p className="font-semibold">{scenario.expectedReturnPct}%</p></div>
                <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Implied Vol</p><p className="font-semibold">{scenario.impliedVolatility}%</p></div>
                <div className="rounded border border-border/50 p-2 col-span-2">
                  <p className="text-muted-foreground">Price Cone</p>
                  <p className="font-semibold">{scenario.percentilePrice.p05} - {scenario.percentilePrice.p95}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Scenario simulation unavailable.</p>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid gap-4 xl:grid-cols-3">
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Accuracy Lab</h2>
              <span className="text-xs text-muted-foreground">{accuracy ? `${accuracy.sampleSize} samples` : "No report"}</span>
            </div>

            {accuracy ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/50 p-2"><p className="text-muted-foreground text-xs">Overall</p><p className="font-semibold text-lg">{accuracy.overallAccuracy}%</p></div>
                  <div className="rounded-lg border border-border/50 p-2"><p className="text-muted-foreground text-xs">Directional</p><p className="font-semibold text-lg">{accuracy.directionalAccuracy}%</p></div>
                  <div className="rounded-lg border border-border/50 p-2"><p className="text-muted-foreground text-xs">Actionable</p><p className="font-semibold text-lg">{accuracy.actionableAccuracy ?? 0}%</p></div>
                  <div className="rounded-lg border border-border/50 p-2"><p className="text-muted-foreground text-xs">High Conviction</p><p className="font-semibold text-lg">{accuracy.highConvictionAccuracy ?? 0}%</p></div>
                </div>

                <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                  <p className="text-xs text-muted-foreground">Precision Mode (target {accuracy.precisionMode?.targetAccuracy ?? 90}%)</p>
                  <p className="font-semibold">{accuracy.precisionMode?.achievedAccuracy ?? 0}% @ {accuracy.precisionMode?.minConfidence ?? 0}+ confidence</p>
                  <p className="text-xs text-muted-foreground">Sample size: {accuracy.precisionMode?.sampleSize ?? 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Accuracy API unavailable.</p>
            )}
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Leaderboard</h2>
              <span className="text-xs text-muted-foreground">Top signals</span>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((item, idx) => {
                const score = Math.round(clamp(scorePrediction(item), 0, 100));
                return (
                  <motion.div key={item.symbol} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }} className="rounded-lg border border-border/50 p-2 bg-secondary/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.symbol}</span>
                      <span className="text-muted-foreground">{score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/60 mt-2 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-300 to-accent" initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6, delay: idx * 0.05 }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Auto Pilot</h2>
              <span className="text-xs text-muted-foreground">Competitor stack</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold">{autoRefresh ? "Live" : "Manual"}</p></div>
              <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Next Refresh</p><p className="font-semibold">{autoRefresh ? `${refreshCountdown}s` : "-"}</p></div>
              <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Horizon</p><p className="font-semibold uppercase">{horizon}</p></div>
              <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Mode</p><p className="font-semibold capitalize">{strategy}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Strategy sorter adapts ranking behavior: aggressive boosts upside, defensive boosts win-rate and lower risk exposure.
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Model Academy</h2>
            <span className="text-xs text-muted-foreground">How predictions are built</span>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="inputs">
              <AccordionTrigger><span className="flex items-center gap-2 text-sm"><Cpu className="w-4 h-4 text-primary" />1) Inputs</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                The model combines normalized technical indicators (trend, momentum, volatility, volume), pattern detection, and sentiment signals. Each module outputs a score between bearish and bullish.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="regime">
              <AccordionTrigger><span className="flex items-center gap-2 text-sm"><Gauge className="w-4 h-4 text-primary" />2) Regime Layer</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                A regime detector classifies market state as Bull, Bear, or Choppy. The ensemble dynamically changes factor weights per regime and becomes conservative in choppy zones to avoid low-quality directional calls.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="confidence">
              <AccordionTrigger><span className="flex items-center gap-2 text-sm"><Target className="w-4 h-4 text-primary" />3) Confidence</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Confidence is calibrated from signal strength, agreement between modules, trend strength (ADX), and volatility penalties. Directional setups get a bonus; neutral setups are capped to avoid fake certainty.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="metrics">
              <AccordionTrigger><span className="flex items-center gap-2 text-sm"><TrendingUp className="w-4 h-4 text-primary" />4) Validation</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Accuracy Lab runs rolling out-of-sample checks by horizon and reports overall, directional, actionable, and precision-mode hit rates with sample size so you can see real performance quality.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="glass-card rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Why People Use This App</h2>
            <span className="text-xs text-muted-foreground">Decision workflow: Discover to Plan to Execute to Review</span>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-border/50 p-3 bg-secondary/20">
              <p className="text-xs text-primary font-semibold">1. Discover Edge</p>
              <p className="text-sm mt-1 text-muted-foreground">
                Rank live opportunities by confidence, win-probability, and risk/reward with regime-aware filters.
              </p>
              <p className="text-xs mt-3 text-muted-foreground">
                Active symbol: <span className="text-foreground font-medium">{selectedSymbol || "None"}</span>
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-border/50 p-3 bg-secondary/20">
              <p className="text-xs text-primary font-semibold">2. Plan Trade</p>
              {playbook ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mt-1">{playbook.thesis}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Setup Grade</p><p className="font-semibold">{playbook.setupGrade}</p></div>
                    <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Conviction</p><p className="font-semibold">{playbook.convictionTier}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Entry: {playbook.execution.entryZone.low} - {playbook.execution.entryZone.high} | Stop: {playbook.execution.stopLoss} | Target: {playbook.execution.targetPrice}</p>
                </div>
              ) : (
                <p className="text-sm mt-1 text-muted-foreground">Playbook unavailable for current symbol.</p>
              )}
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-border/50 p-3 bg-secondary/20">
              <p className="text-xs text-primary font-semibold">3. Execute & Review</p>
              <p className="text-sm mt-1 text-muted-foreground">Save your decision in journal, then compare actual outcome vs planned thesis.</p>
              <div className="mt-2 space-y-2">
                <input
                  value={journalNote}
                  onChange={(e) => setJournalNote(e.target.value)}
                  className="w-full rounded-md bg-background/70 border border-border/50 px-2 py-1.5 text-xs"
                  placeholder="Journal note (setup reason, risk trigger, etc.)"
                />
                <Button size="sm" onClick={addToJournal} disabled={!playbook}>Add To Journal</Button>
              </div>
              <div className="mt-2 max-h-24 overflow-auto space-y-1">
                {journalEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded border border-border/50 p-1.5 text-[11px]">
                    <p className="font-medium">{entry.symbol} {entry.setupGrade} ({entry.convictionTier})</p>
                    <p className="text-muted-foreground">{entry.note}</p>
                  </div>
                ))}
                {journalEntries.length === 0 && <p className="text-[11px] text-muted-foreground">No journal entries yet.</p>}
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-primary" />Screener Controls</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setViewMode("list")} className={`rounded-md border px-2 py-1 ${viewMode === "list" ? "border-primary/50 bg-primary/10" : "border-border/50 bg-secondary/40"}`}><List className="w-4 h-4 mx-auto" /></button>
              <button onClick={() => setViewMode("grid")} className={`rounded-md border px-2 py-1 ${viewMode === "grid" ? "border-primary/50 bg-primary/10" : "border-border/50 bg-secondary/40"}`}><Grid3X3 className="w-4 h-4 mx-auto" /></button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm" value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm" value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
              <option value="defensive">Defensive</option>
            </select>

            <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
              <option value="composite">Sort: Composite</option>
              <option value="confidence">Sort: Confidence</option>
              <option value="win-prob">Sort: Win Probability</option>
              <option value="upside">Sort: Upside %</option>
              <option value="risk-reward">Sort: Risk/Reward</option>
            </select>

            <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}>
              <option value="all">All Ratings</option>
              <option value="strong-buy">Strong Buy</option>
              <option value="buy">Buy</option>
              <option value="hold">Hold</option>
              <option value="sell">Sell/Strong Sell</option>
            </select>

            <select className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}>
              <option value="all">All Risk</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>

            <input className="rounded-md bg-secondary/40 border border-border/50 px-3 py-2 text-sm" placeholder="Search symbol or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
              <div className="flex justify-between text-xs text-muted-foreground mb-2"><span>Min Confidence</span><span>{minConfidence}%</span></div>
              <input type="range" min={35} max={95} value={minConfidence} onChange={(e) => setMinConfidence(Number.parseInt(e.target.value, 10))} className="w-full" />
            </div>
            <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
              <div className="flex justify-between text-xs text-muted-foreground mb-2"><span>Min Win Probability</span><span>{minWinProb}%</span></div>
              <input type="range" min={35} max={95} value={minWinProb} onChange={(e) => setMinWinProb(Number.parseInt(e.target.value, 10))} className="w-full" />
            </div>
            <label className="rounded-lg border border-border/50 p-3 bg-secondary/20 flex items-center justify-between cursor-pointer">
              <span className="text-sm">Upcoming earnings only (14d)</span>
              <input type="checkbox" checked={onlyUpcomingEarnings} onChange={(e) => setOnlyUpcomingEarnings(e.target.checked)} className="accent-primary" />
            </label>
          </div>
        </motion.div>

        {compareItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Radar className="w-4 h-4 text-primary" />Compare Desk ({compareItems.length})</h2>
              <Button size="sm" variant="outline" onClick={() => setCompareSymbols([])}>Clear Compare</Button>
            </div>

            {compareSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Avg Confidence</p><p className="font-semibold">{compareSummary.confidence}%</p></div>
                <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Avg Win Prob</p><p className="font-semibold">{compareSummary.winProb}%</p></div>
                <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Avg Agreement</p><p className="font-semibold">{compareSummary.model}%</p></div>
                <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Avg R/R</p><p className="font-semibold">{compareSummary.riskReward}</p></div>
                <div className="rounded-lg border border-border/50 p-2"><p className="text-xs text-muted-foreground">Avg Upside</p><p className="font-semibold">{compareSummary.upside}%</p></div>
              </div>
            )}
          </motion.div>
        )}

        {plannerTarget && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-3">
            <h2 className="font-semibold">Execution Planner ({plannerTarget.symbol})</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                <p className="text-xs text-muted-foreground">Account Size</p>
                <input type="number" min={1000} value={accountSize} onChange={(e) => setAccountSize(Math.max(1000, Number.parseInt(e.target.value || "1000", 10)))} className="mt-2 w-full rounded-md bg-background/70 border border-border/50 px-2 py-1 text-sm" />
              </div>
              <div className="rounded-lg border border-border/50 p-3 bg-secondary/20">
                <p className="text-xs text-muted-foreground">Risk per Trade %</p>
                <input type="number" step={0.1} min={0.2} max={5} value={riskPerTrade} onChange={(e) => setRiskPerTrade(clamp(Number.parseFloat(e.target.value || "1"), 0.2, 5))} className="mt-2 w-full rounded-md bg-background/70 border border-border/50 px-2 py-1 text-sm" />
              </div>
              <div className="rounded-lg border border-border/50 p-3 bg-secondary/20"><p className="text-xs text-muted-foreground">Position Size</p><p className="text-lg font-semibold mt-2">{positionSize.toLocaleString()} shares</p></div>
              <div className="rounded-lg border border-border/50 p-3 bg-secondary/20"><p className="text-xs text-muted-foreground">Position Value</p><p className="text-lg font-semibold mt-2">{positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-border/50 p-3"><p className="text-xs text-muted-foreground">Entry Zone</p><p className="font-semibold">{plannerTarget.entryZone ? `${plannerTarget.entryZone.low} - ${plannerTarget.entryZone.high}` : plannerTarget.currentPrice}</p></div>
              <div className="rounded-lg border border-border/50 p-3"><p className="text-xs text-muted-foreground">Stop Loss</p><p className="font-semibold text-destructive">{plannerTarget.stopLoss}</p></div>
              <div className="rounded-lg border border-border/50 p-3"><p className="text-xs text-muted-foreground">Target</p><p className="font-semibold text-success">{plannerTarget.targetPrice}</p></div>
            </div>
          </motion.div>
        )}

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="border-b border-border/50 p-4 flex items-center justify-between">
            <h2 className="font-semibold">Signal Board</h2>
            <p className="text-xs text-muted-foreground">Tap compare on up to 4 symbols for side-by-side analysis.</p>
          </div>

          {viewMode === "list" ? (
            <div className="divide-y divide-border/50">
              <AnimatePresence>
                {pageItems.map((prediction, idx) => {
                  const upside = toNumber(prediction.potentialReturn);
                  const composite = Math.round(clamp(scorePrediction(prediction), 0, 100));
                  const selected = compareSymbols.includes(prediction.symbol);

                  return (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ x: 3 }}
                      transition={{ delay: idx * 0.025 }}
                      className="p-4 hover:bg-secondary/20 transition-colors"
                    >
                      <div className="grid xl:grid-cols-12 gap-3">
                        <div className="xl:col-span-2">
                          <p className="font-semibold">{prediction.symbol}</p>
                          <p className="text-xs text-muted-foreground">{prediction.name}</p>
                          <Link to={`/stock/${prediction.assetId}`} className="text-xs text-primary hover:underline mt-1 inline-block">Open details</Link>
                        </div>

                        <div className="xl:col-span-2">
                          <span className={`px-2 py-1 rounded-full border text-xs ${toBadge(prediction.prediction)}`}>{prediction.prediction}</span>
                          <p className="text-xs text-muted-foreground mt-1">{prediction.confidence}% confidence</p>
                        </div>

                        <div className="xl:col-span-2">
                          <p className="text-xs text-muted-foreground">Move / Composite</p>
                          <p className={`font-semibold ${upside >= 0 ? "text-success" : "text-destructive"}`}>{upside >= 0 ? "+" : ""}{prediction.potentialReturn}%</p>
                          <p className="text-xs text-muted-foreground">Score {composite}</p>
                        </div>

                        <div className="xl:col-span-2">
                          <p className="text-xs text-muted-foreground">Win / R/R</p>
                          <p className="text-sm">{prediction.winProbability}% / {prediction.riskRewardRatio}</p>
                          <p className="text-xs text-muted-foreground">Risk {prediction.riskLevel}</p>
                        </div>

                        <div className="xl:col-span-3">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(prediction.catalysts ?? []).slice(0, 3).map((catalyst, catalystIdx) => (
                              <span key={`${prediction.symbol}-c-${catalystIdx}`} className="text-[10px] px-2 py-1 rounded border border-border/50 bg-secondary/30">
                                {catalyst}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-end gap-1">
                            {(prediction.confidenceTrend ?? []).map((value, trendIdx) => (
                              <motion.div
                                key={`${prediction.symbol}-trend-${trendIdx}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(5, value * 0.25)}px` }}
                                transition={{ delay: trendIdx * 0.02 }}
                                className="w-2 rounded-sm bg-primary/80"
                              />
                            ))}
                          </div>
                        </div>

                        <div className="xl:col-span-1 flex xl:justify-end items-center gap-2">
                          <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleCompare(prediction.symbol)}>{selected ? "Added" : "Compare"}</Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pageItems.map((prediction, idx) => {
                const selected = compareSymbols.includes(prediction.symbol);
                return (
                  <motion.div
                    key={prediction.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ delay: idx * 0.025 }}
                    className="glass-card rounded-lg p-3 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold">{prediction.symbol}</p>
                        <p className="text-xs text-muted-foreground">{prediction.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full border text-[10px] ${toBadge(prediction.prediction)}`}>{prediction.prediction}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Confidence</p><p className="font-semibold">{prediction.confidence}%</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Win Prob</p><p className="font-semibold">{prediction.winProbability}%</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">Upside</p><p className="font-semibold">{prediction.potentialReturn}%</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-muted-foreground">R/R</p><p className="font-semibold">{prediction.riskRewardRatio}</p></div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link to={`/stock/${prediction.assetId}`} className="text-xs text-primary hover:underline">Open details</Link>
                      <Button size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleCompare(prediction.symbol)}>{selected ? "Added" : "Compare"}</Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="p-4 border-t border-border/50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * perPage + 1} to {Math.min(filtered.length, currentPage * perPage)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predictions;
