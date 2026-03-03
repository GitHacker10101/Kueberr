import { ArrowUpRight, BarChart3, Gauge, Newspaper, Shield, Target } from "lucide-react";
import { Link } from "react-router-dom";

const watchlistRows = [
  { symbol: "RELIANCE", price: "2,847.50", move: "+2.34%", up: true },
  { symbol: "TCS", price: "3,521.25", move: "+1.12%", up: true },
  { symbol: "INFY", price: "1,456.80", move: "-0.87%", up: false },
  { symbol: "HDFCBANK", price: "1,678.35", move: "+0.45%", up: true },
];

const DashboardPreview = () => {
  return (
    <section id="preview" className="relative py-24 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">
            One workspace for <span className="gradient-text">analysis and execution.</span>
          </h2>
          <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
            Track market regime, watchlist conviction, and portfolio exposure without switching tools.
          </p>
        </div>

        <div className="glass-panel relative overflow-hidden rounded-3xl p-3 sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />

          <div className="relative grid gap-4 lg:grid-cols-12">
            <aside className="glass-card rounded-2xl p-4 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Risk Monitor</p>
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Portfolio Beta</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">1.08</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Drawdown Guard</p>
                  <p className="mt-1 text-lg font-semibold text-success">Active</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Max Exposure</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">62%</p>
                </div>
              </div>
            </aside>

            <div className="glass-card rounded-2xl p-4 lg:col-span-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">AI Conviction Board</p>
                <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs text-primary">Realtime</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-background/45 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Accuracy</p>
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">91.2%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Rolling 14-day benchmark</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-background/45 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Win/Loss</p>
                    <Gauge className="h-4 w-4 text-accent" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">2.4 : 1</p>
                  <p className="mt-1 text-xs text-muted-foreground">With current risk filter</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-background/45 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Watchlist Focus</p>
                  <Link to="/dashboard" className="text-xs text-primary hover:text-primary/80">
                    Open workspace
                  </Link>
                </div>
                <div className="space-y-2">
                  {watchlistRows.map((row) => (
                    <div key={row.symbol} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                      <p className="font-mono text-xs text-foreground">{row.symbol}</p>
                      <p className="font-mono text-xs text-muted-foreground">INR {row.price}</p>
                      <p className={`text-xs font-semibold ${row.up ? "text-success" : "text-destructive"}`}>{row.move}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="glass-card rounded-2xl p-4 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Market Pulse</p>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-2.5">
                <div className="rounded-lg border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Nifty Breadth</p>
                  <p className="mt-1 text-base font-semibold text-success">68% advancing</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-background/45 p-3">
                  <p className="text-xs text-muted-foreground">Volatility Trend</p>
                  <p className="mt-1 text-base font-semibold text-foreground">Cooling</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-background/45 p-3">
                  <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                    <Newspaper className="h-4 w-4" />
                    <p className="text-xs">News signal</p>
                  </div>
                  <p className="text-sm text-foreground">Financials outperforming after policy commentary.</p>
                </div>
              </div>
              <Link
                to="/dashboard"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Explore full dashboard
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
