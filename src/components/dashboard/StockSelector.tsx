
import React, { useState } from 'react';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const MOCK_STOCKS = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: '2,987.50', change: '+1.2%', type: 'bull' },
    { symbol: 'TCS', name: 'Tata Consultancy Svcs', price: '3,890.10', change: '-0.5%', type: 'bear' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', price: '1,450.30', change: '+0.1%', type: 'bull' },
    { symbol: 'INFY', name: 'Infosys Limited', price: '1,670.00', change: '-1.2%', type: 'bear' },
    { symbol: 'AAPL', name: 'Apple Inc.', price: '$182.50', change: '+0.8%', type: 'bull' },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: '$240.10', change: '+2.5%', type: 'bull' },
];

export const StockSelector = ({ onSelect = () => { } }: { onSelect?: (stock: any) => void }) => {
    const [query, setQuery] = useState('');

    const filtered = MOCK_STOCKS.filter(s =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="w-full max-w-sm glass-panel rounded-xl p-4 flex flex-col h-[600px]">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-white mb-2">Market Watch</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search symbol..."
                        className="pl-9 bg-card/50 border-white/10 text-white placeholder:text-muted-foreground/70"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-2">
                    {filtered.map((stock) => (
                        <div
                            key={stock.symbol}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                            onClick={() => onSelect(stock)}
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-white group-hover:text-primary transition-colors">{stock.symbol}</span>
                                <span className="text-xs text-muted-foreground">{stock.name}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-mono text-white">{stock.price}</span>
                                <div className={`text-xs flex items-center gap-1 ${stock.type === 'bull' ? 'text-success' : 'text-destructive'}`}>
                                    {stock.type === 'bull' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {stock.change}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
