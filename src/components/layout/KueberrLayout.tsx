
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CandlestickChart,
    Newspaper,
    Wallet,
    Settings,
    Menu,
    X,
    Info,
    ShieldAlert,
    BarChart3,
    LineChart
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active
            ? 'bg-primary/10 text-primary border-l-2 border-primary'
            : 'text-muted-foreground hover:text-white hover:bg-white/5'
            }`}
    >
        <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-white'}`} />
        <span className="font-medium text-sm">{label}</span>
    </Link>
);

export const KueberrLayout = ({ children }: LayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/markets", icon: BarChart3, label: "Markets" },
        { to: "/predictions", icon: LineChart, label: "AI Predictions" },
        { to: "/news", icon: Newspaper, label: "News" },
        { to: "/portfolio", icon: Wallet, label: "Watchlist" },
        { to: "/settings", icon: Settings, label: "Settings" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden selection:bg-primary/30">

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-border/40 bg-card/30 backdrop-blur-xl transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Logo Area */}
                    <div className="h-16 flex items-center px-6 border-b border-border/40">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-glow">
                                <span className="text-white font-bold text-lg">K</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                Kueberr
                            </span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                        <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                            Platform
                        </div>
                        {navItems.map((item) => (
                            <NavItem
                                key={item.to}
                                to={item.to}
                                icon={item.icon}
                                label={item.label}
                                active={location.pathname === item.to}
                            />
                        ))}
                    </div>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-border/40 bg-card/20">
                        <div className="glass-card p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-primary mb-1">
                                <Info className="h-3 w-3" />
                                <span className="font-semibold">Market Status</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Regime: <span className="text-white font-medium">Volatile</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {/* Mobile Header */}
                <header className="h-16 border-b border-border/40 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 lg:hidden z-30">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">K</span>
                            </div>
                        </Link>
                    </div>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-muted-foreground hover:text-white">
                        <Menu className="h-6 w-6" />
                    </button>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 w-full max-w-[1920px] mx-auto pb-20">
                    {children}
                </div>

                {/* Persistent Footer Disclaimer */}
                <footer className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border/40 py-2 px-4 z-20">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-3 w-3 text-warning" />
                            <p>
                                <strong>DISCLAIMER:</strong> AI-generated market analysis for educational purposes only. Not financial advice.
                                Trading involves risk.
                            </p>
                        </div>
                        <div>
                            &copy; {new Date().getFullYear()} Kueberr Inc. All rights reserved.
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
};
