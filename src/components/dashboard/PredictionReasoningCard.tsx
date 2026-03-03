import { Info, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from 'framer-motion';

interface PredictionReasoningCardProps {
    reasoning: string[];
    signalStrength: {
        trend: number;
        momentum: number;
        meanReversion: number;
    };
    direction: 'Bullish' | 'Neutral' | 'Bearish';
    regime: string;
}

export const PredictionReasoningCard = ({
    reasoning,
    signalStrength,
    direction,
    regime
}: PredictionReasoningCardProps) => {
    const getDirectionIcon = () => {
        if (direction === 'Bullish') return <TrendingUp className="h-5 w-5 text-success" />;
        if (direction === 'Bearish') return <TrendingDown className="h-5 w-5 text-destructive" />;
        return <Activity className="h-5 w-5 text-warning" />;
    };

    const getDirectionColor = () => {
        if (direction === 'Bullish') return 'border-success/20 bg-success/5';
        if (direction === 'Bearish') return 'border-destructive/20 bg-destructive/5';
        return 'border-warning/20 bg-warning/5';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-5 rounded-xl space-y-4 border ${getDirectionColor()}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getDirectionIcon()}
                    <h3 className="font-semibold text-white">AI Analysis</h3>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-white transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border-white/10 text-white max-w-xs">
                            <p>Multi-factor technical analysis using advanced indicators and ensemble learning</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Signal Strength Bars */}
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Trend Strength</span>
                        <span className="text-white font-medium">{signalStrength.trend}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${signalStrength.trend}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Momentum</span>
                        <span className="text-white font-medium">{signalStrength.momentum}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${signalStrength.momentum}%` }}
                            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-success to-emerald-400 rounded-full"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Mean Reversion</span>
                        <span className="text-white font-medium">{signalStrength.meanReversion}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${signalStrength.meanReversion}%` }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-warning to-amber-400 rounded-full"
                        />
                    </div>
                </div>
            </div>

            {/* Reasoning Points */}
            <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Key Insights</p>
                <div className="space-y-2">
                    {reasoning.slice(0, 4).map((reason, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-2"
                        >
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <p className="text-sm text-muted-foreground leading-relaxed">{reason}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Regime Badge */}
            <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                        Market Regime: <span className="text-white font-medium">{regime}</span>
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
