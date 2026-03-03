import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import StockTicker from "./StockTicker";
import { useParallax, useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useEffect, useRef, useState } from "react";

const HeroSection = () => {
  const parallaxRef = useParallax(0.2);
  const { ref: revealRef, isVisible } = useScrollAnimation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 perspective-1000">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-background overflow-hidden">
        <div ref={parallaxRef} className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 opacity-40 animate-pulse-glow" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 opacity-30" />
        </div>

        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10" ref={revealRef}>
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md hover:bg-white/10 transition-smooth animate-fade-in delay-100">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span className="text-sm font-medium text-foreground/80 tracking-wide">Live Market Intelligence</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight">
            <span className="block animate-slide-up delay-200 opacity-0 fill-mode-forwards">
              Predict the Market
            </span>
            <span className="block gradient-text animate-slide-up delay-300 opacity-0 fill-mode-forwards pb-2">
              With Intelligence
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up delay-500 opacity-0 fill-mode-forwards">
            Kueberr combines comprehensive AI algorithms with institutional-grade data to deliver
            precision stock predictions and actionable insights.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20 animate-slide-up delay-700 opacity-0 fill-mode-forwards">
            <Button variant="hero" size="xl" className="w-full sm:w-auto hover-glow group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Start Predicting Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-apple" />
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto group border-white/10 hover:bg-white/5">
              <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform text-primary" />
              Watch Demo
            </Button>
          </div>

          {/* Stats Cards with 3D Effect */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-autoperspective-1000">
            {[
              { val: "91.2%", label: "Prediction Accuracy", delay: "delay-700" },
              { val: "50K+", label: "Active Traders", delay: "delay-800" },
              { val: "₹2.5Cr+", label: "Profits Generated", delay: "delay-900" },
              { val: "24/7", label: "Market Monitoring", delay: "delay-1000" }
            ].map((stat, i) => (
              <div
                key={i}
                className={`glass-card rounded-2xl p-6 animate-reveal opacity-0 fill-mode-forwards ${stat.delay} hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500`}
              >
                <div className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-2">{stat.val}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Ticker */}
        <div className="mt-24 -mx-4 md:-mx-8 lg:-mx-16 opacity-0 animate-fade-in delay-1000 fill-mode-forwards">
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
            <StockTicker />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
