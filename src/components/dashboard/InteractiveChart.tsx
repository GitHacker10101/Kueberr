
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

export const InteractiveChart = ({ symbol = 'RELIANCE' }: { symbol?: string }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [priceChange, setPriceChange] = useState<number>(0);
    const [currentPrice, setCurrentPrice] = useState<number>(2500);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: 'rgba(14, 165, 233, 0.5)',
                    width: 1,
                    style: 2,
                },
                horzLine: {
                    color: 'rgba(14, 165, 233, 0.5)',
                    width: 1,
                    style: 2,
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        // Mock Data Generation with more realistic movement
        const data = [];
        let time = Math.floor(new Date(2024, 0, 1).getTime() / 1000);
        let value = 2500;
        for (let i = 0; i < 100; i++) {
            const volatility = 0.015;
            const trend = 0.001; // Slight upward bias
            const change = value * (volatility * (Math.random() - 0.5) + trend);
            const open = value;
            const close = value + change;
            const high = Math.max(open, close) + Math.random() * 15;
            const low = Math.min(open, close) - Math.random() * 15;

            data.push({ time: time as any, open, high, low, close });
            time += 86400;
            value = close;
        }

        candlestickSeries.setData(data);
        setCurrentPrice(value);
        setPriceChange(((value - 2500) / 2500) * 100);

        // AI Prediction Band (Enhanced with gradient)
        const areaSeries = chart.addAreaSeries({
            topColor: 'rgba(14, 165, 233, 0.3)',
            bottomColor: 'rgba(14, 165, 233, 0.0)',
            lineColor: 'rgba(14, 165, 233, 0.8)',
            lineWidth: 2,
            priceLineVisible: false,
        });

        // Project into future (mock AI prediction)
        const lastTime = data[data.length - 1].time as number;
        const futureData = [];
        let futureValue = data[data.length - 1].close;

        for (let i = 1; i <= 10; i++) {
            futureValue += (Math.random() - 0.35) * 25; // Slight upward bias
            futureData.push({ time: (lastTime + i * 86400) as any, value: futureValue });
        }

        // Connect to last point
        areaSeries.setData([
            { time: lastTime as any, value: data[data.length - 1].close },
            ...futureData
        ]);

        // Add support/resistance lines
        const supportLevel = Math.min(...data.map(d => d.low)) * 1.01;
        const resistanceLevel = Math.max(...data.map(d => d.high)) * 0.99;

        const supportLine = chart.addLineSeries({
            color: 'rgba(34, 197, 94, 0.5)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
        });
        supportLine.setData([
            { time: data[0].time, value: supportLevel },
            { time: (lastTime + 10 * 86400) as any, value: supportLevel }
        ]);

        const resistanceLine = chart.addLineSeries({
            color: 'rgba(239, 68, 68, 0.5)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
        });
        resistanceLine.setData([
            { time: data[0].time, value: resistanceLevel },
            { time: (lastTime + 10 * 86400) as any, value: resistanceLevel }
        ]);

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [symbol]);

    return (
        <div className="glass-panel p-4 rounded-xl w-full relative group hover-glow transition-smooth">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-white border border-primary/20 shadow-lg">
                        {symbol.substring(0, 2)}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{symbol}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>NSE</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span>Candles 1D</span>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className={`font-medium ${priceChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Current Price</p>
                        <p className="text-lg font-bold text-white font-mono">₹{currentPrice.toFixed(2)}</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center gap-1.5 pulse-glow">
                        <Sparkles className="h-3 w-3" />
                        AI: 78% Bullish
                    </div>
                </div>
            </div>

            <div ref={chartContainerRef} className="w-full h-[400px] rounded-lg overflow-hidden" />

            {/* Hover Info Card */}
            <div className="absolute top-20 right-8 glass-card p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none animate-slide-up">
                <p className="text-xs text-muted-foreground mb-1">Predicted Range (7D)</p>
                <p className="text-sm font-bold text-white">₹2,950 - ₹3,120</p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-xs text-success">+5.2% potential</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-primary"></div>
                    <span className="text-muted-foreground">AI Prediction</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-success" style={{ borderTop: '1px dashed' }}></div>
                    <span className="text-muted-foreground">Support</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-destructive" style={{ borderTop: '1px dashed' }}></div>
                    <span className="text-muted-foreground">Resistance</span>
                </div>
            </div>
        </div>
    );
};
