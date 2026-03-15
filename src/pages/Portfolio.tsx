import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Loader2, RefreshCw, ShieldAlert, Sparkles, Waves } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const USER_ID = "user-1";

type TabKey = "overview" | "risk" | "stress" | "optimizer" | "orders" | "journal";

interface PositionsPayload {
  user_id: string;
  positions: Array<{
    symbol: string;
    quantity: number;
    avg_cost: number;
    market_price: number;
    market_value: number;
    unrealized_pnl: number;
    realized_pnl: number;
    exposure_pct: number;
  }>;
  totals: {
    cash: number;
    gross_exposure: number;
    net_exposure: number;
    equity: number;
    unrealized_pnl: number;
    realized_pnl: number;
    transaction_count: number;
  };
  generated_at: string;
}

interface RiskPayload {
  var_95: number;
  cvar_95: number;
  annual_vol: number;
  beta_proxy: number;
  max_drawdown: number;
  concentration_hhi: number;
  correlation_concentration: number;
  risk_regime: string;
  risk_confidence: number;
  limit_breaches: Array<{ code: string; severity: string; message: string }>;
}

interface StressPayload {
  impacts: Array<{ scenario_id: number; name: string; type: string; impact_value: number; impact_pct_equity: number }>;
  worst_case_value: number;
  worst_case_pct_equity: number;
  estimated_recovery_days: number;
}

interface OptimizerPayload {
  target_weights: Array<{ symbol: string; current_weight: number; target_weight: number; delta_weight: number }>;
  trade_recommendations: Array<{ symbol: string; action: string; quantity: number; notional: number; price_reference: number }>;
  expected_risk_delta: number;
  expected_return_delta: number;
  turnover_cost_estimate: number;
}

interface OrdersPayload {
  items: Array<{
    id: string;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    filled_quantity: number;
    avg_fill_price: number;
    status: string;
    created_at: string;
  }>;
}

interface FillsPayload {
  items: Array<{
    id: string;
    order_id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    fee: number;
    created_at: string;
  }>;
}

interface JournalEntry {
  id: string;
  createdAt: string;
  title: string;
  note: string;
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "risk", label: "Risk" },
  { key: "stress", label: "Stress Lab" },
  { key: "optimizer", label: "Rebalance Optimizer" },
  { key: "orders", label: "Paper Orders" },
  { key: "journal", label: "Execution Journal" },
];

const fmtMoney = (value: number): string => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (value: number): string => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

const Portfolio = () => {
  const [tab, setTab] = useState<TabKey>("overview");
  const [positions, setPositions] = useState<PositionsPayload | null>(null);
  const [risk, setRisk] = useState<RiskPayload | null>(null);
  const [stress, setStress] = useState<StressPayload | null>(null);
  const [optimizer, setOptimizer] = useState<OptimizerPayload | null>(null);
  const [orders, setOrders] = useState<OrdersPayload | null>(null);
  const [fills, setFills] = useState<FillsPayload | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [txSymbol, setTxSymbol] = useState("AAPL");
  const [txSide, setTxSide] = useState<"BUY" | "SELL">("BUY");
  const [txQty, setTxQty] = useState("10");
  const [txPrice, setTxPrice] = useState("180");

  const [orderSymbol, setOrderSymbol] = useState("AAPL");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop" | "stop_limit">("market");
  const [orderQty, setOrderQty] = useState("5");
  const [orderLimit, setOrderLimit] = useState("175");
  const [orderStop, setOrderStop] = useState("172");

  const [shock, setShock] = useState("-0.03");
  const [maxWeight, setMaxWeight] = useState("0.30");
  const [minWeight, setMinWeight] = useState("0.00");
  const [turnoverLimit, setTurnoverLimit] = useState("0.35");
  const [targetVol, setTargetVol] = useState("0.22");
  const [cashBuffer, setCashBuffer] = useState("0.05");

  const [journalTitle, setJournalTitle] = useState("");
  const [journalNote, setJournalNote] = useState("");

  const request = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }, []);

  const loadBase = useCallback(async () => {
    const [p, r, o, f] = await Promise.all([
      request<PositionsPayload>(`${API_BASE}/api/command/portfolio/positions?user_id=${USER_ID}`),
      request<RiskPayload>(`${API_BASE}/api/command/risk/snapshot?user_id=${USER_ID}`),
      request<OrdersPayload>(`${API_BASE}/api/command/paper/orders?user_id=${USER_ID}&limit=80`),
      request<FillsPayload>(`${API_BASE}/api/command/paper/fills?user_id=${USER_ID}&limit=80`),
    ]);
    setPositions(p);
    setRisk(r);
    setOrders(o);
    setFills(f);
  }, [request]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load command center");
    } finally {
      setLoading(false);
    }
  }, [loadBase]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("kueberr-command-journal");
      if (raw) {
        const parsed = JSON.parse(raw) as JournalEntry[];
        if (Array.isArray(parsed)) setJournalEntries(parsed.slice(0, 40));
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kueberr-command-journal", JSON.stringify(journalEntries.slice(0, 40)));
  }, [journalEntries]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const stream = new EventSource(`${API_BASE}/api/command/stream?user_id=${USER_ID}`);
    const onRisk = (event: MessageEvent) => {
      try {
        setRisk(JSON.parse(event.data) as RiskPayload);
      } catch {
        // no-op
      }
    };
    const onOrder = () => {
      void request<OrdersPayload>(`${API_BASE}/api/command/paper/orders?user_id=${USER_ID}&limit=80`).then(setOrders).catch(() => null);
    };
    const onFill = () => {
      void Promise.all([
        request<OrdersPayload>(`${API_BASE}/api/command/paper/orders?user_id=${USER_ID}&limit=80`).then(setOrders),
        request<FillsPayload>(`${API_BASE}/api/command/paper/fills?user_id=${USER_ID}&limit=80`).then(setFills),
        request<PositionsPayload>(`${API_BASE}/api/command/portfolio/positions?user_id=${USER_ID}`).then(setPositions),
      ]).catch(() => null);
    };
    stream.addEventListener("risk_snapshot_updated", onRisk as EventListener);
    stream.addEventListener("order_status_changed", onOrder as EventListener);
    stream.addEventListener("fill_created", onFill as EventListener);
    stream.onerror = () => stream.close();
    return () => {
      stream.removeEventListener("risk_snapshot_updated", onRisk as EventListener);
      stream.removeEventListener("order_status_changed", onOrder as EventListener);
      stream.removeEventListener("fill_created", onFill as EventListener);
      stream.close();
    };
  }, [request]);

  const kpis = useMemo(() => {
    if (!positions) return [];
    return [
      { label: "Equity", value: fmtMoney(positions.totals.equity) },
      { label: "Cash", value: fmtMoney(positions.totals.cash) },
      { label: "Unrealized PnL", value: fmtMoney(positions.totals.unrealized_pnl) },
      { label: "Realized PnL", value: fmtMoney(positions.totals.realized_pnl) },
      { label: "Gross Exposure", value: fmtMoney(positions.totals.gross_exposure) },
      { label: "Transactions", value: String(positions.totals.transaction_count) },
    ];
  }, [positions]);

  const submitTransaction = async () => {
    setBusy(true);
    setError(null);
    try {
      await request(`${API_BASE}/api/command/portfolio/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          symbol: txSymbol.trim().toUpperCase(),
          side: txSide,
          quantity: Number.parseFloat(txQty),
          price: Number.parseFloat(txPrice),
          fees: 0,
        }),
      });
      await loadBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit transaction");
    } finally {
      setBusy(false);
    }
  };

  const runStress = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await request<StressPayload>(`${API_BASE}/api/command/stress/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          scenarios: [{ type: "market", shock: Number.parseFloat(shock), name: "Custom market shock" }],
        }),
      });
      setStress(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stress run failed");
    } finally {
      setBusy(false);
    }
  };

  const runOptimizer = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await request<OptimizerPayload>(`${API_BASE}/api/command/optimizer/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          constraints: {
            max_weight: Number.parseFloat(maxWeight),
            min_weight: Number.parseFloat(minWeight),
            turnover_limit: Number.parseFloat(turnoverLimit),
            target_vol: Number.parseFloat(targetVol),
            cash_buffer: Number.parseFloat(cashBuffer),
          },
        }),
      });
      setOptimizer(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimizer failed");
    } finally {
      setBusy(false);
    }
  };

  const submitOrder = async () => {
    setBusy(true);
    setError(null);
    try {
      await request(`${API_BASE}/api/command/paper/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: USER_ID,
          symbol: orderSymbol.trim().toUpperCase(),
          side: orderSide,
          type: orderType,
          quantity: Number.parseFloat(orderQty),
          limit_price: orderType === "limit" || orderType === "stop_limit" ? Number.parseFloat(orderLimit) : undefined,
          stop_price: orderType === "stop" || orderType === "stop_limit" ? Number.parseFloat(orderStop) : undefined,
          time_in_force: "DAY",
          idempotency_key: `${orderSymbol}-${orderSide}-${Date.now()}`,
        }),
      });
      await loadBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order submit failed");
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setBusy(true);
    setError(null);
    try {
      await request(`${API_BASE}/api/command/paper/orders/${orderId}/cancel?user_id=${USER_ID}`, { method: "POST" });
      await loadBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  const addJournal = () => {
    const title = journalTitle.trim();
    const note = journalNote.trim();
    if (!title || !note) return;
    const entryId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    setJournalEntries((prev) => [{ id: entryId, createdAt: new Date().toISOString(), title, note }, ...prev].slice(0, 40));
    setJournalTitle("");
    setJournalNote("");
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-slate-900 via-slate-800 to-black p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Quant Command Center</h1>
              <p className="text-sm text-slate-300">Portfolio intelligence, stress analytics, optimizer, and audited paper OMS.</p>
            </div>
            <Button variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10" onClick={() => void refreshAll()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <motion.div key={kpi.label} whileHover={{ y: -2 }} className="glass-card rounded-xl p-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-lg font-semibold">{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass-card rounded-xl p-2 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-lg border px-3 py-2 text-sm ${tab === item.key ? "border-primary/50 bg-primary/15 text-primary" : "border-border/50 bg-secondary/20 text-muted-foreground"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-52 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              {tab === "overview" && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="glass-card rounded-xl p-4 xl:col-span-2">
                    <h2 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Positions</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-muted-foreground"><th className="text-left py-2">Symbol</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Market</th><th className="text-right py-2">U.PnL</th><th className="text-right py-2">Weight</th></tr></thead>
                        <tbody>
                          {(positions?.positions ?? []).map((row) => (
                            <tr key={row.symbol} className="border-t border-border/40">
                              <td className="py-2">{row.symbol}</td>
                              <td className="text-right">{row.quantity.toFixed(2)}</td>
                              <td className="text-right">{fmtMoney(row.market_price)}</td>
                              <td className={`text-right ${row.unrealized_pnl >= 0 ? "text-success" : "text-destructive"}`}>{row.unrealized_pnl >= 0 ? "+" : ""}{fmtMoney(row.unrealized_pnl)}</td>
                              <td className="text-right">{fmtPct(row.exposure_pct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-4 space-y-2">
                    <h2 className="font-semibold">Manual Transaction</h2>
                    <Label>Symbol</Label><Input value={txSymbol} onChange={(e) => setTxSymbol(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Side</Label><select className="w-full rounded-md border border-border/50 bg-secondary/40 px-2 py-2 text-sm" value={txSide} onChange={(e) => setTxSide(e.target.value as "BUY" | "SELL")}><option value="BUY">BUY</option><option value="SELL">SELL</option></select></div>
                      <div><Label>Qty</Label><Input type="number" value={txQty} onChange={(e) => setTxQty(e.target.value)} /></div>
                    </div>
                    <Label>Price</Label><Input type="number" value={txPrice} onChange={(e) => setTxPrice(e.target.value)} />
                    <Button className="w-full" onClick={submitTransaction} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Commit</Button>
                  </div>
                </div>
              )}

              {tab === "risk" && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="glass-card rounded-xl p-4 xl:col-span-2">
                    <h2 className="font-semibold mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" />Risk Snapshot</h2>
                    <div className="grid md:grid-cols-3 gap-2 text-sm">
                      <div className="rounded border border-border/50 p-2"><p className="text-xs text-muted-foreground">VaR 95%</p><p className="font-semibold">{risk ? fmtPct(risk.var_95) : "-"}</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-xs text-muted-foreground">CVaR 95%</p><p className="font-semibold">{risk ? fmtPct(risk.cvar_95) : "-"}</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-xs text-muted-foreground">Annual Vol</p><p className="font-semibold">{risk ? fmtPct(risk.annual_vol) : "-"}</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-xs text-muted-foreground">Beta</p><p className="font-semibold">{risk?.beta_proxy.toFixed(2) ?? "-"}</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-xs text-muted-foreground">Max DD</p><p className="font-semibold">{risk ? fmtPct(risk.max_drawdown) : "-"}</p></div>
                      <div className="rounded border border-border/50 p-2"><p className="text-xs text-muted-foreground">HHI</p><p className="font-semibold">{risk?.concentration_hhi.toFixed(3) ?? "-"}</p></div>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-4">
                    <h2 className="font-semibold mb-2">Risk-Limit Breaches</h2>
                    <div className="space-y-2 text-xs">
                      {(risk?.limit_breaches ?? []).map((breach) => <div key={breach.code} className="rounded border border-border/60 p-2"><p className="font-medium">{breach.code}</p><p className="text-muted-foreground">{breach.message}</p></div>)}
                      {(risk?.limit_breaches.length ?? 0) === 0 && <p className="text-muted-foreground">No active breaches.</p>}
                    </div>
                  </div>
                </div>
              )}

              {tab === "stress" && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="glass-card rounded-xl p-4 space-y-2">
                    <h2 className="font-semibold">Stress Scenario</h2>
                    <Label>Market Shock</Label>
                    <Input value={shock} onChange={(e) => setShock(e.target.value)} placeholder="-0.03" />
                    <Button className="w-full" onClick={runStress} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Waves className="w-4 h-4 mr-2" />}Run Stress</Button>
                  </div>
                  <div className="glass-card rounded-xl p-4 xl:col-span-2">
                    <h2 className="font-semibold mb-2">Stress Output</h2>
                    {stress ? (
                      <div className="space-y-2 text-sm">
                        <p>Worst case: <span className={stress.worst_case_value < 0 ? "text-destructive" : "text-success"}>{fmtMoney(stress.worst_case_value)}</span></p>
                        <p>Worst case % equity: {fmtPct(stress.worst_case_pct_equity)}</p>
                        <p>Estimated recovery: {stress.estimated_recovery_days} days</p>
                        <div className="space-y-1 text-xs">
                          {stress.impacts.map((item) => <p key={item.scenario_id}>{item.name} ({item.type}) {"->"} {fmtMoney(item.impact_value)} ({fmtPct(item.impact_pct_equity)})</p>)}
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Run a stress scenario to get impact projections.</p>}
                  </div>
                </div>
              )}

              {tab === "optimizer" && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="glass-card rounded-xl p-4 space-y-2">
                    <h2 className="font-semibold flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-primary" />Constraints</h2>
                    <Label>Max Weight</Label><Input value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
                    <Label>Min Weight</Label><Input value={minWeight} onChange={(e) => setMinWeight(e.target.value)} />
                    <Label>Turnover Limit</Label><Input value={turnoverLimit} onChange={(e) => setTurnoverLimit(e.target.value)} />
                    <Label>Target Vol</Label><Input value={targetVol} onChange={(e) => setTargetVol(e.target.value)} />
                    <Label>Cash Buffer</Label><Input value={cashBuffer} onChange={(e) => setCashBuffer(e.target.value)} />
                    <Button className="w-full" onClick={runOptimizer} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Optimize</Button>
                  </div>
                  <div className="glass-card rounded-xl p-4 xl:col-span-2">
                    <h2 className="font-semibold mb-2">Optimizer Output</h2>
                    {optimizer ? (
                      <div className="space-y-2 text-sm">
                        <p>Risk delta: {fmtPct(optimizer.expected_risk_delta)} | Return delta: {fmtPct(optimizer.expected_return_delta)}</p>
                        <p>Turnover cost est: {fmtMoney(optimizer.turnover_cost_estimate)}</p>
                        <div className="space-y-1 text-xs">
                          {optimizer.target_weights.map((item) => <p key={item.symbol}>{item.symbol}: {fmtPct(item.current_weight)} {"->"} {fmtPct(item.target_weight)}</p>)}
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Run optimizer to generate target weights and trade list.</p>}
                  </div>
                </div>
              )}

              {tab === "orders" && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="glass-card rounded-xl p-4 space-y-2">
                    <h2 className="font-semibold">Submit Paper Order</h2>
                    <Label>Symbol</Label><Input value={orderSymbol} onChange={(e) => setOrderSymbol(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Side</Label><select className="w-full rounded-md border border-border/50 bg-secondary/40 px-2 py-2 text-sm" value={orderSide} onChange={(e) => setOrderSide(e.target.value as "BUY" | "SELL")}><option value="BUY">BUY</option><option value="SELL">SELL</option></select></div>
                      <div><Label>Type</Label><select className="w-full rounded-md border border-border/50 bg-secondary/40 px-2 py-2 text-sm" value={orderType} onChange={(e) => setOrderType(e.target.value as "market" | "limit" | "stop" | "stop_limit")}><option value="market">market</option><option value="limit">limit</option><option value="stop">stop</option><option value="stop_limit">stop_limit</option></select></div>
                    </div>
                    <Label>Quantity</Label><Input type="number" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} />
                    {(orderType === "limit" || orderType === "stop_limit") && <><Label>Limit</Label><Input type="number" value={orderLimit} onChange={(e) => setOrderLimit(e.target.value)} /></>}
                    {(orderType === "stop" || orderType === "stop_limit") && <><Label>Stop</Label><Input type="number" value={orderStop} onChange={(e) => setOrderStop(e.target.value)} /></>}
                    <Button className="w-full" onClick={submitOrder} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Send Order</Button>
                  </div>
                  <div className="glass-card rounded-xl p-4 xl:col-span-2 space-y-3">
                    <h2 className="font-semibold">OMS Blotter</h2>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {(orders?.items ?? []).map((item) => {
                        const isFinal = ["FILLED", "CANCELED", "REJECTED", "EXPIRED"].includes(item.status);
                        return (
                          <div key={item.id} className="rounded border border-border/50 p-2 text-sm">
                            <div className="flex justify-between items-center gap-2">
                              <div>
                                <p>{item.symbol} {item.side} {item.quantity.toFixed(2)} ({item.type})</p>
                                <p className="text-xs text-muted-foreground">Filled {item.filled_quantity.toFixed(2)} @ {item.avg_fill_price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded border border-border/50">{item.status}</span>
                                {!isFinal && <Button size="sm" variant="outline" onClick={() => cancelOrder(item.id)}>Cancel</Button>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded border border-border/50 p-2 text-xs max-h-36 overflow-auto">
                      {(fills?.items ?? []).map((fill) => <p key={fill.id}>{fill.symbol} {fill.side} {fill.quantity.toFixed(2)} @ {fill.price.toFixed(2)} (fee {fill.fee.toFixed(4)})</p>)}
                    </div>
                  </div>
                </div>
              )}

              {tab === "journal" && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="glass-card rounded-xl p-4 space-y-2">
                    <h2 className="font-semibold">Execution Journal</h2>
                    <Label>Title</Label><Input value={journalTitle} onChange={(e) => setJournalTitle(e.target.value)} />
                    <Label>Note</Label><textarea value={journalNote} onChange={(e) => setJournalNote(e.target.value)} className="w-full min-h-28 rounded-md border border-border/50 bg-secondary/40 px-3 py-2 text-sm" />
                    <Button className="w-full" onClick={addJournal}>Save Entry</Button>
                  </div>
                  <div className="glass-card rounded-xl p-4 xl:col-span-2 space-y-2 max-h-80 overflow-auto">
                    {journalEntries.map((entry) => (
                      <div key={entry.id} className="rounded border border-border/50 p-2 text-sm">
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                        <p className="text-muted-foreground mt-1">{entry.note}</p>
                      </div>
                    ))}
                    {journalEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;
