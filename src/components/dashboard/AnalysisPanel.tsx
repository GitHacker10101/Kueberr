
import React from 'react';
import { Info, Check, Divide, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const AnalysisPanel = () => {
    return (
        <div className="glass-panel p-5 rounded-xl space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    AI Analysis
                </h3>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-white transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border-white/10 text-white">
                            <p>Derived from multi-factor technical analysis.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="text-sm text-primary mb-2 font-medium flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Why this prediction?
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Momentum indicators (RSI, MACD) show strong bullish divergence while price holds above the 50-day EMA. Volatility is contracting, suggesting a potential breakout.
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Trend Strength</span>
                        <span className="text-white font-medium">High</span>
                    </div>
                    <Progress value={75} className="h-1.5 bg-white/5" indicatorClassName="bg-primary" />
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Sentiment Score</span>
                        <span className="text-success font-medium">Positive</span>
                    </div>
                    <Progress value={60} className="h-1.5 bg-white/5" indicatorClassName="bg-success" />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Support</p>
                        <p className="font-mono text-sm text-white">2,850.00</p>
                    </div>
                    <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Resistance</p>
                        <p className="font-mono text-sm text-white">3,100.00</p>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest">
                    Model Confidence: 82%
                </p>
            </div>
        </div>
    );
};
