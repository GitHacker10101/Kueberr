import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RealTimeTicker from "@/components/dashboard/RealTimeTicker";
import IndicesTicker from "@/components/dashboard/IndicesTicker";
import TradingSignals from "@/components/dashboard/TradingSignals";
import MarketSentiment from "@/components/dashboard/MarketSentiment";
import NewsFeed from "@/components/dashboard/NewsFeed";
import TechnicalIndicators from "@/components/dashboard/TechnicalIndicators";
import { TrendingUp, TrendingDown, ArrowUpRight, Bell, Plus, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api";

interface PortfolioData {
  totalValue: string;
  dayChange: string;
  dayChangePercent: string;
  isUp: boolean;
  accuracy: string;
  activeAlerts: number;
  alertsTriggeredToday: number;
}

interface Asset {
  name: string;
  symbol: string;
  price: string;
  change: string;
  isUp: boolean;
  prediction: string;
  holdings: string;
}

interface Alert {
  asset: string;
  message: string;
  time: string;
  type: string;
}

const INDIAN_SYMBOLS = new Set([
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'WIPRO',
  'AXISBANK',
  'KOTAKBANK',
  'ITC',
  'LT',
  'TATASTEEL',
  'JSWSTEEL',
  'ONGC',
  'COALINDIA',
  'GAIL',
  'HINDUNILVR',
  'BAJFINANCE',
  'MARUTI',
  'BHARTIARTL',
  'POWERGRID',
  'NTPC',
  'SUNPHARMA',
  'DRREDDY',
  'CIPLA',
  'DIVISLAB',
  'ULTRACEMCO',
  'GRASIM',
  'AMBUJACEM',
  'SHREECEM',
  'ASIANPAINT'
]);

const Dashboard = () => {
  const navigate = useNavigate();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"1D" | "1W" | "1M" | "1Y">("1D");

  const handleSignOut = () => {
    // Clear any stored authentication data
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userSession');
    // Navigate to login page (assuming we have one)
    navigate('/login');
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const portfolioResponse = await fetch(`${API_BASE}/api/portfolio`);
        if (!portfolioResponse.ok) throw new Error('Failed to fetch portfolio data');
        const portfolioResult = await portfolioResponse.json();
        const portfolioPayload = portfolioResult.portfolio ?? {};
        const holdingsPayload = Array.isArray(portfolioResult.holdings) ? portfolioResult.holdings : [];

        const alertsResponse = await fetch(`${API_BASE}/api/alerts`);
        if (!alertsResponse.ok) throw new Error('Failed to fetch alerts data');
        const alertsResult = await alertsResponse.json();
        const alertsPayload = Array.isArray(alertsResult.alerts) ? alertsResult.alerts : [];

        setPortfolioData({
          totalValue: String(portfolioPayload.totalValue ?? "Rs 0"),
          dayChange: String(portfolioPayload.dayChange ?? "Rs 0"),
          dayChangePercent: String(portfolioPayload.dayChangePercent ?? "0.00%"),
          isUp: Boolean(portfolioPayload.isUp),
          accuracy: String(portfolioPayload.accuracy ?? "N/A"),
          activeAlerts: Number(portfolioPayload.activeAlerts ?? 0),
          alertsTriggeredToday: Number(portfolioPayload.alertsTriggeredToday ?? 0),
        });

        const dashboardAssets: Asset[] = (holdingsPayload as {
          name: string;
          symbol: string;
          currentPrice: string;
          pnlPercent: string;
          isUp: boolean;
          prediction?: string;
          value: string;
        }[]).map((holding) => ({
          name: holding.name,
          symbol: holding.symbol,
          price: holding.currentPrice,
          change: holding.pnlPercent,
          isUp: holding.isUp,
          prediction: holding.prediction || 'Hold',
          holdings: holding.value,
        }));

        setAssets(dashboardAssets);
        setAlerts(
          alertsPayload.map((row: { symbol?: string; message?: string; created_at?: string; type?: string }) => ({
            asset: row.symbol ?? "N/A",
            message: row.message ?? "Alert event",
            time: row.created_at ? new Date(row.created_at).toLocaleString() : "N/A",
            type: row.type ?? "info",
          }))
        );
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data from backend.');
        setPortfolioData(null);
        setAssets([]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {error && (
          <div className="glass-card rounded-xl p-4 border border-destructive/40 bg-destructive/5">
            <p className="text-sm text-destructive font-medium">Error loading live dashboard data</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error}
            </p>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Good Morning, John! 👋</h1>
            <p className="text-muted-foreground">Here's your market overview for today</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/alerts')} className="hover-glow transition-smooth">
              <Bell className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Notifications</span>
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate('/portfolio')} className="hover-glow transition-smooth">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-2 glass-card-glow rounded-xl p-6 card-interactive animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
            <p className="text-3xl md:text-4xl font-bold gradient-text mb-2 count-up">{portfolioData?.totalValue}</p>
            <div className={`flex items-center gap-1 text-sm font-medium ${portfolioData?.isUp ? 'text-success' : 'text-destructive'}`}>
              {portfolioData?.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{portfolioData?.dayChange} ({portfolioData?.dayChangePercent}) today</span>
            </div>
          </div>

          <div className="glass-card-glow rounded-xl p-6 card-interactive animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-sm text-muted-foreground mb-1">AI Accuracy (7d)</p>
            <p className="text-3xl font-bold gradient-text count-up">{portfolioData?.accuracy}</p>
            <p className="text-sm text-muted-foreground mt-1">Based on 156 predictions</p>
          </div>

          <div className="glass-card-glow rounded-xl p-6 card-interactive animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <p className="text-sm text-muted-foreground mb-1">Active Alerts</p>
            <p className="text-3xl font-bold text-foreground count-up">{portfolioData?.activeAlerts}</p>
            <p className="text-sm text-success mt-1 pulse-glow">{portfolioData?.alertsTriggeredToday} triggered today</p>
          </div>

          <div className="glass-card-glow rounded-xl p-6 card-interactive animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <p className="text-sm text-muted-foreground mb-1">Market Sentiment</p>
            <p className="text-3xl font-bold text-success">Bullish</p>
            <p className="text-sm text-muted-foreground mt-1">+68% confidence</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="glass-card-glow rounded-xl p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Portfolio Performance</h2>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${interval === '1D' ? 'bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-secondary hover-glow'}`}
                onClick={() => setInterval('1D')}
              >1D</button>
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${interval === '1W' ? 'bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-secondary hover-glow'}`}
                onClick={() => setInterval('1W')}
              >1W</button>
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${interval === '1M' ? 'bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-secondary hover-glow'}`}
                onClick={() => setInterval('1M')}
              >1M</button>
              <button
                className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${interval === '1Y' ? 'bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/30' : 'text-muted-foreground hover:bg-secondary hover-glow'}`}
                onClick={() => setInterval('1Y')}
              >1Y</button>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center border border-border/50 rounded-lg bg-gradient-to-br from-secondary/20 to-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <div className="text-center relative z-10">
              <TrendingUp className="w-12 h-12 text-primary/50 mx-auto mb-2 animate-float" />
              <p className="text-muted-foreground">Interactive chart will be displayed here</p>
              <p className="text-sm text-muted-foreground">(Integrate Plotly for live charts)</p>
            </div>
          </div>
        </div>

        {/* Enhanced Dashboard Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Real-time data */}
          <div className="lg:col-span-3 space-y-6">
            <IndicesTicker />
            <RealTimeTicker />
            <TradingSignals />
            <MarketSentiment />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-6 space-y-6">
            {/* Holdings */}
            <div className="glass-card-glow rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                <h2 className="font-semibold text-foreground">Your Holdings</h2>
                <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-smooth hover-glow">
                  View All <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                {[...assets]
                  .sort((a, b) => {
                    const aIndian = INDIAN_SYMBOLS.has(a.symbol.toUpperCase()) ? 1 : 0;
                    const bIndian = INDIAN_SYMBOLS.has(b.symbol.toUpperCase()) ? 1 : 0;
                    if (aIndian !== bIndian) return bIndian - aIndian;
                    return a.name.localeCompare(b.name);
                  })
                  .map((asset, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent transition-all duration-300 cursor-pointer group card-interactive"
                      onClick={() => navigate(`/stock/${asset.symbol}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300">
                          <span className="font-mono text-xs font-bold text-primary">
                            {asset.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="font-mono text-sm text-foreground">{asset.price}</p>
                        <p className={`text-sm font-medium ${asset.isUp ? 'text-success' : 'text-destructive'}`}>
                          {asset.change}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="font-mono text-sm text-foreground">{asset.holdings}</p>
                        <p className="text-xs text-muted-foreground">Holdings</p>
                      </div>
                      <div className="hidden lg:block">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${asset.prediction === 'Strong Buy'
                          ? 'bg-success/20 text-success border border-success/30 group-hover:shadow-lg group-hover:shadow-success/20'
                          : asset.prediction === 'Buy'
                            ? 'bg-primary/20 text-primary border border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/20'
                            : 'bg-warning/20 text-warning border border-warning/30 group-hover:shadow-lg group-hover:shadow-warning/20'
                          }`}>
                          {asset.prediction}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Technical Indicators */}
            <TechnicalIndicators />
          </div>

          {/* Right Sidebar - News & Alerts */}
          <div className="lg:col-span-3 space-y-6">
            {/* Recent Alerts */}
            <div className="glass-card-glow rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                <h2 className="font-semibold text-foreground">Recent Alerts</h2>
                <Bell className="w-5 h-5 text-muted-foreground pulse-glow" />
              </div>
              <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                {alerts.map((alert, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300 group">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 transition-all duration-300 ${alert.type === 'success' ? 'bg-success group-hover:shadow-lg group-hover:shadow-success/50' :
                        alert.type === 'warning' ? 'bg-warning group-hover:shadow-lg group-hover:shadow-warning/50' : 'bg-primary group-hover:shadow-lg group-hover:shadow-primary/50'
                        }`} />
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-mono font-bold text-primary">{alert.asset}</span>: {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border/50">
                <Button variant="ghost" size="sm" className="w-full hover-glow transition-smooth" onClick={() => navigate('/alerts')}>
                  View All Alerts
                </Button>
              </div>
            </div>

            {/* News Feed */}
            <NewsFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

