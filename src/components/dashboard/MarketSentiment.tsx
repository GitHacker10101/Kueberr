import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

const MarketSentiment = () => {
  const sentimentData = {
    overall: "Bullish",
    confidence: 68,
    fearGreedIndex: 72,
    putCallRatio: 0.85,
    vix: 18.5,
    sectors: [
      { name: "Technology", sentiment: "Bullish", change: "+2.4%" },
      { name: "Energy", sentiment: "Neutral", change: "+0.8%" },
      { name: "Healthcare", sentiment: "Bullish", change: "+1.2%" },
      { name: "Finance", sentiment: "Neutral", change: "-0.3%" },
      { name: "Consumer", sentiment: "Bearish", change: "-1.1%" },
    ]
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Market Sentiment</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Market</span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="font-medium text-success">{sentimentData.overall}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-secondary/20 rounded-lg">
            <p className="text-2xl font-bold text-primary">{sentimentData.confidence}%</p>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </div>
          <div className="text-center p-3 bg-secondary/20 rounded-lg">
            <p className="text-2xl font-bold text-warning">{sentimentData.fearGreedIndex}</p>
            <p className="text-xs text-muted-foreground">Fear & Greed</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Sector Sentiment</h4>
          {sentimentData.sectors.map((sector, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{sector.name}</span>
              <div className="flex items-center gap-2">
                {sector.sentiment === 'Bullish' ? (
                  <TrendingUp className="w-3 h-3 text-success" />
                ) : sector.sentiment === 'Bearish' ? (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                ) : (
                  <BarChart3 className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={`text-xs font-medium ${
                  sector.sentiment === 'Bullish' ? 'text-success' :
                  sector.sentiment === 'Bearish' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {sector.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketSentiment;
