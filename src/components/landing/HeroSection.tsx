import { Button } from "@/components/ui/button";
import { ArrowRight, BadgeCheck, Bot, Play, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import StockTicker from "./StockTicker";

const highlights = [
  { value: "91.2%", label: "Average model precision" },
  { value: "-+", label: "Active traders" },
  { value: "24/7", label: "Signal monitoring" },
];

const liveSignals = [
  { symbol: "RELIANCE", action: "Strong Buy", confidence: "87%" },
  { symbol: "TCS", action: "Buy", confidence: "78%" },
  { symbol: "INFY", action: "Hold", confidence: "64%" },
  { symbol: "HDFCBANK", action: "Strong Buy", confidence: "83%" },
];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pb-20 pt-36 sm:pb-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-5%] top-[12%] h-64 w-64 rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute right-[-8%] top-[5%] h-72 w-72 rounded-full bg-accent/20 blur-[110px]" />
        <div className="absolute inset-0 bg-dot-pattern opacity-20" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              AI Market Intelligence Suite
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.04] text-foreground sm:text-5xl lg:text-6xl">
              Trade with a <span className="gradient-text">decision engine</span>, not a dashboard.
            </h1>

            <p className="mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Kueberr combines predictive models, technical context, and real-time market structure into one command surface
              so you can execute faster with conviction.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" className="gap-2">
                <Play className="h-4 w-4 text-primary" />
                Watch Platform Tour
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {highlights.map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl px-4 py-3">
                  <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-panel relative h-full rounded-2xl p-5 sm:p-6">
              <div className="absolute right-5 top-5 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-[11px] font-semibold text-primary">
                Live Signals
              </div>

              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Model Snapshot</p>
                  <p className="text-lg font-semibold text-foreground">NSE Momentum Pulse</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {liveSignals.map((signal, index) => (
                  <div
                    key={signal.symbol}
                    className="glass-card flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div>
                      <p className="font-mono text-sm text-foreground">{signal.symbol}</p>
                      <p className="text-xs text-muted-foreground">{signal.action}</p>
                    </div>
                    <div className="flex items-center gap-2 text-success">
                      <BadgeCheck className="h-4 w-4" />
                      <span className="text-sm font-semibold">{signal.confidence}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-background/55 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Today</p>
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +2.1% strategy delta
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  17 qualifying setups across large-cap momentum names in the last 4 hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <StockTicker />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
