import { TrendingUp, TrendingDown } from "lucide-react";

const IndicesTicker = () => {
  const indices = [
    { name: "NIFTY 50", value: "22,450.30", change: "+125.40", percent: "+0.56%", isUp: true },
    { name: "SENSEX", value: "73,980.15", change: "+350.20", percent: "+0.48%", isUp: true },
    { name: "BANK NIFTY", value: "47,850.60", change: "-120.30", percent: "-0.25%", isUp: false },
    { name: "NIFTY IT", value: "37,240.10", change: "+450.80", percent: "+1.23%", isUp: true },
  ];

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-4">Market Indices</h3>
      <div className="space-y-4">
        {indices.map((index) => (
          <div key={index.name} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{index.name}</p>
              <p className="text-xs text-muted-foreground">{index.value}</p>
            </div>
            <div className={`text-right ${index.isUp ? 'text-success' : 'text-destructive'}`}>
              <div className="flex items-center justify-end gap-1">
                {index.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <p className="font-medium text-sm">{index.percent}</p>
              </div>
              <p className="text-xs">{index.change}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IndicesTicker;
