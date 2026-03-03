import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Coming Soon",
    price: "",
    period: "",
    description: "Perfect for beginners exploring market predictions",
    features: [
      "5 stocks in watchlist",
      "Basic AI predictions",
      "Daily market summary",
      "Email notifications",
      "7-day prediction history",
      "Community access",
    ],
    cta: "Start Basic",
    popular: false,
  },
  {
    name: "Coming Soon",
    price: "",
    period: "",
    description: "For serious traders who want an edge",
    features: [
      "25 stocks in watchlist",
      "Advanced AI predictions",
      "Real-time alerts",
      "Portfolio tracking",
      "30-day prediction history",
      "Priority support",
      "Custom alerts",
    ],
    cta: "Start Pro",
    popular: true,
  },
  {
    name: "Coming Soon",
    price: "",
    period: "",
    description: "Maximum power for professional traders",
    features: [
      "Unlimited watchlist",
      "Premium AI predictions",
      "SMS + Push notifications",
      "Advanced portfolio analytics",
      "Unlimited history",
      "Dedicated support",
      "API access",
      "Early feature access",
      "Trading signals",
      "Risk analysis",
    ],
    cta: "Start Pro+",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Simple Pricing</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Choose Your
            <br />
            <span className="gradient-text">Trading Power</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and upgrade as you grow. All plans include a 7-day money-back guarantee.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-6 ${
                plan.popular 
                  ? 'price-card-popular scale-105 z-10' 
                  : 'glass-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.popular ? "hero" : "outline"} 
                className="w-full"
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="text-sm">7-day money back</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="text-sm">Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="text-sm">Secure payment</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
