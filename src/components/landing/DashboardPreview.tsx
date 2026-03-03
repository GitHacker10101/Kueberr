import { TrendingUp, ArrowUpRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useState } from "react";

const mockAssets = [
  { name: "Reliance Industries", symbol: "RELIANCE", price: "₹2,847.50", change: "+2.34%", isUp: true, prediction: "Strong Buy" },
  { name: "Tata Consultancy", symbol: "TCS", price: "₹3,521.25", change: "+1.12%", isUp: true, prediction: "Buy" },
  { name: "Infosys Ltd", symbol: "INFY", price: "₹1,456.80", change: "-0.87%", isUp: false, prediction: "Hold" },
  { name: "HDFC Bank", symbol: "HDFCBANK", price: "₹1,672.30", change: "+1.21%", isUp: true, prediction: "Strong Buy" },
];

const DashboardPreview = () => {
  const { ref: revealRef, isVisible } = useScrollAnimation({ threshold: 0.2 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const centerX = box.width / 2;
    const centerY = box.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <section id="preview" className="py-24 relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 perspective-1000">
        {/* Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} ref={revealRef}>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Your Personal
            <br />
            <span className="gradient-text">Trading Command Center</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Get a glimpse of the powerful dashboard that puts AI predictions
            and real-time data at your fingertips.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="max-w-6xl mx-auto transform-style-3d transition-transform duration-200 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="glass-panel rounded-2xl p-2 border border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Shimmer Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer pointer-events-none z-20" />

            <div className="bg-background/80 rounded-xl p-6 md:p-8 backdrop-blur-sm border border-white/5">
              {/* Dashboard Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Good Morning, Trader! 👋</h3>
                  <p className="text-muted-foreground">Here's your market overview for today</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 rounded-lg bg-success/10 border border-success/20 animate-pulse">
                    <span className="text-sm text-success font-medium">Market Open</span>
                  </div>
                </div>
              </div>

              {/* Portfolio Summary */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card/50 rounded-xl p-4 border border-white/5 hover:border-primary/20 transition-colors">
                  <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
                  <p className="text-2xl font-bold text-foreground">₹12,45,680</p>
                  <div className="flex items-center gap-1 text-success text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+₹24,560 (2.01%) today</span>
                  </div>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-white/5 hover:border-primary/20 transition-colors">
                  <p className="text-sm text-muted-foreground mb-1">AI Accuracy (7d)</p>
                  <p className="text-2xl font-bold gradient-text">91.2%</p>
                  <p className="text-sm text-muted-foreground">Based on 156 predictions</p>
                </div>
                <div className="bg-card/50 rounded-xl p-4 border border-white/5 hover:border-primary/20 transition-colors">
                  <p className="text-sm text-muted-foreground mb-1">Active Alerts</p>
                  <p className="text-2xl font-bold text-foreground">8</p>
                  <p className="text-sm text-muted-foreground">3 triggered today</p>
                </div>
              </div>

              {/* Watchlist Preview */}
              <div className="bg-card/30 rounded-xl overflow-hidden border border-white/5">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <h4 className="font-semibold text-foreground">Your Watchlist</h4>
                  <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                    View All <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-border/50">
                  {mockAssets.map((asset, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors cursor-pointer group/item">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover/item:scale-110 transition-transform">
                          <span className="font-mono text-xs font-bold text-primary">
                            {asset.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover/item:text-primary transition-colors">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium text-foreground">{asset.price}</p>
                        <p className={`text-sm font-medium ${asset.isUp ? 'text-success' : 'text-destructive'}`}>
                          {asset.change}
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${asset.prediction === 'Strong Buy'
                            ? 'bg-success/20 text-success border border-success/20'
                            : asset.prediction === 'Buy'
                              ? 'bg-primary/20 text-primary border border-primary/20'
                              : 'bg-warning/20 text-warning border border-warning/20'
                          }`}>
                          {asset.prediction}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
