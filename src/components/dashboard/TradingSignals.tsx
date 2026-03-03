import { useState, useEffect } from "react";
import { Target, ArrowUp, ArrowDown, Minus, Zap } from "lucide-react";

interface Signal {
  id: string;
  symbol: string;
  name: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: 'Strong' | 'Moderate' | 'Weak';
  price: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number;
  timeframe: string;
  reason: string;
  timestamp: string;
}

const TradingSignals = () => {
  const [signals, setSignals] = useState<Signal[]>([
    {
      id: '1',
      symbol: 'RELIANCE',
      name: 'Reliance Industries',
      signal: 'BUY',
      strength: 'Strong',
      price: 2847.50,
      targetPrice: 3100.00,
      stopLoss: 2700.00,
      confidence: 92,
      timeframe: '1-2 weeks',
      reason: 'Strong Q4 results, institutional buying detected',
      timestamp: '5 min ago'
    },
    {
      id: '2',
      symbol: 'HDFC',
      name: 'HDFC Bank',
      signal: 'BUY',
      strength: 'Strong',
      price: 1650.00,
      targetPrice: 1800.00,
      stopLoss: 1550.00,
      confidence: 94,
      timeframe: '3-5 days',
      reason: 'Strong quarterly results, institutional buying',
      timestamp: '12 min ago'
    },
    {
      id: '3',
      symbol: 'INFY',
      name: 'Infosys Ltd',
      signal: 'HOLD',
      strength: 'Moderate',
      price: 1456.80,
      targetPrice: 1520.00,
      stopLoss: 1400.00,
      confidence: 78,
      timeframe: '1 week',
      reason: 'Regulatory concerns, waiting for clarity',
      timestamp: '1 hour ago'
    },
    {
      id: '4',
      symbol: 'TCS',
      name: 'Tata Consultancy',
      signal: 'BUY',
      strength: 'Moderate',
      price: 3521.25,
      targetPrice: 3800.00,
      stopLoss: 3400.00,
      confidence: 85,
      timeframe: '1-3 weeks',
      reason: 'New contract wins, positive analyst upgrades',
      timestamp: '2 hours ago'
    }
  ]);

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <ArrowUp className="w-4 h-4 text-success" />;
      case 'SELL':
        return <ArrowDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-warning" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return 'bg-success/20 text-success border-success/30';
      case 'SELL':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-warning/20 text-warning border-warning/30';
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'Strong':
        return 'text-success';
      case 'Moderate':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">AI Trading Signals</h3>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border/50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="font-mono text-xs font-bold text-primary">
                    {signal.symbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{signal.symbol}</p>
                  <p className="text-xs text-muted-foreground">{signal.name}</p>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getSignalColor(signal.signal)}`}>
                {getSignalIcon(signal.signal)}
                <span>{signal.signal}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Current Price</p>
                <p className="font-mono font-medium text-foreground text-sm">
                  ₹{signal.price.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Price</p>
                <p className="font-mono font-medium text-success text-sm">
                  ₹{signal.targetPrice.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className={`font-medium ${getStrengthColor(signal.strength)}`}>
                  {signal.strength}
                </span>
                <span className="text-muted-foreground">
                  {signal.confidence}% confidence
                </span>
              </div>
              <span className="text-muted-foreground">{signal.timestamp}</span>
            </div>

            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground line-clamp-1">
                {signal.reason}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Signals updated every 15 minutes</span>
          <span>Success Rate: 87.3%</span>
        </div>
      </div>
    </div>
  );
};

export default TradingSignals;
