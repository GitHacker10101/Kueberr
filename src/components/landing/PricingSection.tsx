import { Button } from "@/components/ui/button";
import { Check, Crown, ShieldCheck, Zap } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "INR 0",
    period: "/month",
    description: "For new traders validating ideas with AI context.",
    cta: "Start Free",
    featured: false,
    features: ["20 tracked symbols", "Core prediction feed", "Daily recap", "Basic alerts"],
  },
  {
    name: "Pro",
    price: "INR 1,499",
    period: "/month",
    description: "For active traders who need full workflow coverage.",
    cta: "Upgrade to Pro",
    featured: true,
    features: [
      "Unlimited watchlists",
      "Advanced confidence filters",
      "Realtime execution alerts",
      "Portfolio risk monitor",
      "Strategy journaling",
    ],
  },
  {
    name: "Desk",
    price: "INR 4,999",
    period: "/month",
    description: "For teams running discretionary or semi-systematic books.",
    cta: "Contact Sales",
    featured: false,
    features: [
      "Multi-user workspace",
      "Desk-level risk controls",
      "API and webhook access",
      "Dedicated onboarding",
      "Priority support",
    ],
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="relative py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-[70%] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
            <Crown className="h-4 w-4 text-accent" />
            Clear pricing, no hidden fees
          </div>
          <h2 className="mt-5 text-balance text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">
            Pick the plan that matches your <span className="gradient-text">trading intensity.</span>
          </h2>
          <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
            Start free, upgrade when your workflow needs more velocity and control.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-2xl p-6 ${plan.featured ? "price-card-popular scale-[1.01]" : "glass-card"}`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Zap className="h-3.5 w-3.5" />
                  Most popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-semibold text-foreground">{plan.price}</span>
                <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant={plan.featured ? "default" : "outline"} className="mt-7 w-full" size="lg">
                {plan.cta}
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground sm:text-sm">
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            7-day money-back policy
          </p>
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            Cancel any time
          </p>
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            Secure payment rails
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
