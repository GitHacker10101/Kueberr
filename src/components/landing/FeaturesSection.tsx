import { BellRing, Bot, CandlestickChart, Layers, Radar, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Model Consensus Engine",
    description: "Multiple AI agents score each setup and surface only high-conviction opportunities.",
  },
  {
    icon: CandlestickChart,
    title: "Context-Aware Charts",
    description: "Price action overlays with support, liquidity zones, and trend strength in one view.",
  },
  {
    icon: BellRing,
    title: "Signal Alerts",
    description: "Receive instant notifications when confidence, momentum, or risk conditions shift.",
  },
  {
    icon: Layers,
    title: "Portfolio Heatmap",
    description: "Visualize sector and position concentration before risk accumulates.",
  },
  {
    icon: Workflow,
    title: "Execution Playbooks",
    description: "Rule-based entries, exits, and stop logic to keep decisions systematic.",
  },
  {
    icon: ShieldCheck,
    title: "Risk Guardrails",
    description: "Built-in drawdown controls and exposure limits tuned for active traders.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-56 w-[80%] -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Why traders switch to Kueberr
          </div>
          <h2 className="mt-5 text-balance text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">
            Built for signal quality, <span className="gradient-text">not noise.</span>
          </h2>
          <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every workflow is designed to shorten analysis time and improve execution discipline.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="glass-card-glow group rounded-2xl p-6"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 rounded-2xl border border-white/10 bg-card/55 p-5 backdrop-blur-xl sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Signals / Day</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">350+</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Avg. Reaction Time</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">120ms</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/40 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Radar className="h-5 w-5 text-primary" />
              NSE + BSE
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
