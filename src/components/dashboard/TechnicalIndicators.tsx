import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react";

const TechnicalIndicators = () => {
  const indicators = [
    {
      name: "RSI (14)",
      value: 68.5,
      signal: "Neutral",
      status: "neutral"
    },
    {
      name: "MACD",
      value: 12.34,
      signal: "Bullish",
      status: "positive"
    },
    {
      name: "Moving Average (50)",
      value: 2847.50,
      signal: "Above MA",
      status: "positive"
    },
    {
      name: "Bollinger Bands",
      value: 0.85,
      signal: "Upper Band",
      status: "warning"
    },
    {
      name: "Stochastic %K",
      value: 72.3,
      signal: "Overbought",
      status: "warning"
    },
    {
      name: "Williams %R",
      value: -27.7,
      signal: "Neutral",
      status: "neutral"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'positive': return 'text-success';
      case 'warning': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'warning': return <Activity className="w-4 h-4 text-warning" />;
      default: return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Technical Indicators</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {indicators.map((indicator, index) => (
          <div key={index} className="p-4 bg-secondary/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{indicator.name}</span>
              {getStatusIcon(indicator.status)}
            </div>
            <p className="text-lg font-bold text-foreground mb-1">{indicator.value}</p>
            <p className={`text-xs font-medium ${getStatusColor(indicator.status)}`}>
              {indicator.signal}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          Indicators based on NIFTY 50 data • Updated 2 min ago
        </p>
      </div>
    </div>
  );
};

export default TechnicalIndicators;
