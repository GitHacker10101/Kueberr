import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMarketSentiment } from '@/data/mockDataService';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart2, PieChart } from 'lucide-react';

const Sentiment = () => {
  const [sentiment, setSentiment] = useState(getMarketSentiment());

  // In a real app, you might fetch this from an API
  // useEffect(() => { fetchSentiment().then(setSentiment); }, []);

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSentimentIcon = (overall: string) => {
    if (overall === 'Bullish') return <TrendingUp className="w-12 h-12 text-green-500" />;
    if (overall === 'Bearish') return <TrendingDown className="w-12 h-12 text-red-500" />;
    return <Minus className="w-12 h-12 text-yellow-500" />;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">Market Sentiment</h1>
          <p className="text-muted-foreground">Real-time analysis of market mood and trends</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full border-primary/20 bg-gradient-to-br from-background to-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Fear & Greed Index
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="relative flex items-center justify-center">
                   {/* Simple Gauge Visualization */}
                   <div className="w-48 h-48 rounded-full border-8 border-secondary flex items-center justify-center relative">
                      <div 
                        className={`absolute inset-0 rounded-full border-8 border-transparent border-t-primary border-r-primary transition-all duration-1000`}
                        style={{ transform: `rotate(${(sentiment.score / 100) * 360 - 45}deg)` }} 
                      />
                      <div className="text-center">
                        <span className={`text-5xl font-bold ${getSentimentColor(sentiment.score)}`}>
                          {sentiment.score}
                        </span>
                        <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">{sentiment.overall}</p>
                      </div>
                   </div>
                </div>
                <div className="mt-8 flex items-center gap-4 text-sm">
                  <span className="text-red-500">Extreme Fear</span>
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" />
                    <div 
                        className="w-1 h-full bg-white absolute top-0"
                        style={{ left: `${sentiment.score}%` }} 
                    />
                  </div>
                  <span className="text-green-500">Extreme Greed</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Key Market Drivers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentiment.factors.map((factor, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium">{factor}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-border/50">
                   <h4 className="text-sm font-semibold mb-3">Sector Performance</h4>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span>Technology</span>
                        <span className="text-green-500 font-mono">+2.4%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '75%' }} />
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <span>Finance</span>
                        <span className="text-red-500 font-mono">-0.8%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '30%' }} />
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span>Energy</span>
                        <span className="text-green-500 font-mono">+1.2%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Sentiment;
