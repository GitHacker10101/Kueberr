import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, ExternalLink, Search, TrendingUp, TrendingDown, Newspaper, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  publishedAt: string;
  category: 'market' | 'company' | 'economy' | 'policy';
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedAssets: string[];
  url: string;
}

const INDIAN_ASSETS = new Set([
  'reliance',
  'tcs',
  'infy',
  'hdfcbank',
  'icicibank',
  'sbin',
  'wipro',
  'axisbank',
  'kotakbank',
  'itc',
  'lt',
  'tatasteel',
  'jswsteel',
  'ongc',
  'coalindia',
  'gail',
  'hindunilvr',
  'bajfinance',
  'maruti',
  'bhartiartl',
  'powergrid',
  'ntpc',
  'sunpharma',
  'drreddy',
  'cipla',
  'divislab',
  'ultracemco',
  'grasim',
  'ambujacem',
  'shreecem',
  'asianpaint'
]);

const News = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filteredNews, setFilteredNews] = useState<NewsItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");

  useEffect(() => {
    // Mock news data
    const mockNews: NewsItem[] = [
      {
        id: '1',
        title: 'NVIDIA Surges 15% on Strong Q4 Earnings, AI Demand Remains Robust',
        summary: 'NVIDIA reported record quarterly revenue driven by AI chip demand, with data center revenue up 265%.',
        content: 'NVIDIA Corporation reported fiscal Q4 earnings that exceeded analyst expectations, with revenue reaching $22.1 billion, up 265% year-over-year. The company\'s data center segment, which includes AI chips, saw explosive growth due to increased demand from cloud computing and AI applications.',
        source: 'Bloomberg',
        publishedAt: '2024-02-22T10:30:00Z',
        category: 'company',
        sentiment: 'positive',
        relatedAssets: ['nvidia'],
        url: '#'
      },
      {
        id: '3',
        title: 'Federal Reserve Signals Potential Rate Cuts in 2024',
        summary: 'Fed Chair Jerome Powell hints at possible interest rate reductions if inflation continues to cool.',
        content: 'In his latest press conference, Federal Reserve Chair Jerome Powell indicated that the central bank may consider rate cuts later this year if inflation continues its downward trajectory. This news has boosted market sentiment across global equity markets.',
        source: 'Reuters',
        publishedAt: '2024-02-22T08:45:00Z',
        category: 'economy',
        sentiment: 'positive',
        relatedAssets: [],
        url: '#'
      },
      {
        id: '4',
        title: 'Reliance Industries Reports 12% YoY Revenue Growth',
        summary: 'India\'s largest conglomerate shows strong performance across all business segments.',
        content: 'Reliance Industries Limited reported a 12% year-over-year increase in consolidated revenue for Q3 FY24, driven by strong performance in its retail, telecom, and energy segments. The company\'s digital services arm Jio Platforms continues to show robust subscriber growth.',
        source: 'Economic Times',
        publishedAt: '2024-02-21T16:20:00Z',
        category: 'company',
        sentiment: 'positive',
        relatedAssets: ['reliance'],
        url: '#'
      },
      {
        id: '5',
        title: 'Tech Sector Faces Headwinds as Interest Rates Remain Elevated',
        summary: 'Growth stocks under pressure as borrowing costs impact valuations.',
        content: 'Technology stocks faced selling pressure today as investors reassessed growth valuations in light of persistently high interest rates. Companies with high P/E ratios and significant debt loads were particularly affected.',
        source: 'Wall Street Journal',
        publishedAt: '2024-02-21T14:30:00Z',
        category: 'market',
        sentiment: 'negative',
        relatedAssets: ['apple', 'microsoft', 'meta'],
        url: '#'
      },
      {
        id: '7',
        title: 'Oil Prices Surge on Middle East Tensions',
        summary: 'Crude oil futures climb 3% following geopolitical developments.',
        content: 'Brent crude oil prices surged over 3% today amid escalating tensions in the Middle East. Market participants are closely monitoring developments that could impact global oil supply chains.',
        source: 'Financial Times',
        publishedAt: '2024-02-21T11:00:00Z',
        category: 'economy',
        sentiment: 'negative',
        relatedAssets: ['ongc'],
        url: '#'
      }
    ];

    setNews(mockNews);
    setFilteredNews(mockNews);
  }, []);

  useEffect(() => {
    let filtered = news;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by sentiment
    if (selectedSentiment !== 'all') {
      filtered = filtered.filter(item => item.sentiment === selectedSentiment);
    }

    filtered.sort((a, b) => {
      const aIndian = a.relatedAssets.some((x) => INDIAN_ASSETS.has(x.toLowerCase())) ? 1 : 0;
      const bIndian = b.relatedAssets.some((x) => INDIAN_ASSETS.has(x.toLowerCase())) ? 1 : 0;
      if (aIndian !== bIndian) return bIndian - aIndian;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    setFilteredNews(filtered);
  }, [news, searchTerm, selectedCategory, selectedSentiment]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'market': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'company': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'economy': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'policy': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'negative': return <TrendingDown className="w-4 h-4 text-destructive" />;
      case 'neutral': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Market News</h1>
            <p className="text-muted-foreground">Stay updated with the latest financial news and market insights</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search news..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Categories</option>
                  <option value="market">Market</option>
                  <option value="company">Company</option>
                  <option value="economy">Economy</option>
                  <option value="policy">Policy</option>
                </select>
                <select
                  value={selectedSentiment}
                  onChange={(e) => setSelectedSentiment(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Sentiment</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* News Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Badge className={getCategoryColor(item.category)}>
                    {item.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {getSentimentIcon(item.sentiment)}
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-2">
                  {item.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {item.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Newspaper className="w-4 h-4" />
                      {item.source}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(item.publishedAt)}
                    </div>
                  </div>

                  {item.relatedAssets.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.relatedAssets.map((asset) => (
                        <Badge key={asset} variant="outline" className="text-xs">
                          {asset.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Read More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredNews.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No news found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters to find relevant news.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default News;
