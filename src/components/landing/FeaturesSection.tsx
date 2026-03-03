import {
  TrendingUp,
  Bell,
  PieChart,
  Zap,
  Shield,
  LineChart,
  Smartphone,
  Bot
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Predictions",
    description: "Advanced machine learning models analyze market patterns to predict stock movements with high accuracy.",
  },
  {
    icon: LineChart,
    title: "Real-Time Analytics",
    description: "Live market data with interactive charts powered by Plotly. Track every price movement as it happens.",
  },
  {
    icon: PieChart,
    title: "Portfolio Tracking",
    description: "Monitor your investments across stocks in one unified dashboard with profit/loss analytics.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get instant alerts for price changes, prediction updates, and market opportunities via push, email, or SMS.",
  },
  {
    icon: TrendingUp,
    title: "Watchlist Management",
    description: "Create custom watchlists for your favorite assets and track them all in one place with quick insights.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Bank-grade encryption protects your data. Your trading strategies and portfolio remain completely private.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built on modern infrastructure with Redis caching for instant data retrieval and zero lag experience.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Access Kueberr anywhere with our responsive web app. Trade and track on the go with full functionality.",
  },
];

const FeatureCard = ({ feature, index }: { feature: any, index: number }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`group glass-card-glow rounded-xl p-6 transition-all duration-700 hover:-translate-y-2
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}
      `}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors group-hover:scale-110 duration-300">
        <feature.icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
    </div>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Powerful Features</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Everything You Need to
            <br />
            <span className="gradient-text">Trade Smarter</span>
          </h2>
          <p className="text-lg text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
            Kueberr brings together cutting-edge AI, real-time data, and intuitive design
            to give you an unfair advantage in the market.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-1000">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
