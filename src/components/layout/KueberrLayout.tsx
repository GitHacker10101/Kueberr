import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Newspaper,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const workspaceNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/markets", label: "Markets", icon: BarChart3 },
  { to: "/trading", label: "Trading", icon: TrendingUp },
  { to: "/predictions", label: "Predictions", icon: LineChart },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/sentiment", label: "Sentiment", icon: Activity },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/learning", label: "Learning", icon: GraduationCap },
  { to: "/economic-calendar", label: "Calendar", icon: Calendar },
  { to: "/settings", label: "Settings", icon: Settings },
];

const workspaceRouteMatchers = [
  /^\/dashboard$/,
  /^\/markets$/,
  /^\/trading$/,
  /^\/predictions$/,
  /^\/portfolio$/,
  /^\/watchlist$/,
  /^\/sentiment$/,
  /^\/news$/,
  /^\/learning$/,
  /^\/economic-calendar$/,
  /^\/settings$/,
  /^\/stock\/.+/,
];

const pageTitles = new Map<string, string>([
  ["/dashboard", "Trading Dashboard"],
  ["/markets", "Market Explorer"],
  ["/trading", "Trading Center"],
  ["/predictions", "AI Predictions"],
  ["/portfolio", "Portfolio"],
  ["/watchlist", "Watchlist"],
  ["/sentiment", "Market Sentiment"],
  ["/news", "Market News"],
  ["/learning", "Learning Hub"],
  ["/economic-calendar", "Economic Calendar"],
  ["/settings", "Settings"],
]);

const isWorkspaceRoute = (pathname: string): boolean =>
  workspaceRouteMatchers.some((matcher) => matcher.test(pathname));

const isNavItemActive = (pathname: string, targetPath: string): boolean => {
  if (targetPath === "/markets" && pathname.startsWith("/stock/")) {
    return true;
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

const WorkspaceNavLink = ({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
        active
          ? "border border-primary/45 bg-primary/15 text-foreground shadow-[0_0_18px_hsl(var(--primary)/0.22)]"
          : "border border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
        <span className="font-medium">{item.label}</span>
      </span>
      <ChevronRight className={`h-4 w-4 transition-transform ${active ? "text-primary" : "text-transparent group-hover:text-muted-foreground"} ${active ? "translate-x-0.5" : ""}`} />
    </Link>
  );
};

export const KueberrLayout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const workspaceMode = isWorkspaceRoute(location.pathname);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith("/stock/")) {
      return "Asset Details";
    }

    return pageTitles.get(location.pathname) ?? "Workspace";
  }, [location.pathname]);

  if (!workspaceMode) {
    return <div className="relative min-h-screen">{children}</div>;
  }

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-20" />
        <div className="absolute -top-28 left-12 h-80 w-80 rounded-full bg-primary/18 blur-[110px]" />
        <div className="absolute top-1/3 right-[-120px] h-96 w-96 rounded-full bg-accent/12 blur-[130px]" />
      </div>

      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-card/80 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_12px_30px_-16px_hsl(var(--primary)/0.85)]">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-base font-semibold leading-none gradient-text">Kueberr</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Market OS</p>
              </div>
            </Link>
            <button
              aria-label="Close navigation"
              className="rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Workspace
            </p>
            <nav className="space-y-1.5">
              {workspaceNavItems.map((item) => (
                <WorkspaceNavLink
                  key={item.to}
                  item={item}
                  active={isNavItemActive(location.pathname, item.to)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Market regime</span>
                <span className="badge-success">Live</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">Risk-On Momentum</p>
              <p className="mt-1 text-xs text-muted-foreground">Volatility easing with broad participation.</p>
            </div>
            <Button asChild variant="ghost" className="mt-3 w-full justify-start text-muted-foreground hover:text-foreground">
              <Link to="/login">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                className="rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
                <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/">Landing</Link>
              </Button>
              <Button asChild size="sm" className="gap-2">
                <Link to="/trading">
                  <Sparkles className="h-4 w-4" />
                  New Trade
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-20 pt-6 sm:px-6 lg:px-10">{children}</main>

        <footer className="border-t border-white/10 bg-background/60 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="mx-auto flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>AI-generated market analysis for educational purposes only and not investment advice.</p>
            <Link to="/terms" className="text-primary/90 hover:text-primary">
              Terms and Risk Disclosure
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
