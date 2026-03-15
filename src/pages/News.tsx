import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, ExternalLink, Loader2, Newspaper, Search, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { API_BASE } from "@/lib/api";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  publishedAt: string;
  category: "market" | "company" | "economy" | "policy";
  sentiment: "positive" | "negative" | "neutral";
  relatedAssets: string[];
  url: string;
}

interface NewsResponse {
  items?: NewsItem[];
}

const News = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/api/market/news?limit=60`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Failed to fetch live news");
        }
        const payload = (await response.json()) as NewsResponse;
        if (cancelled) return;
        setNews(Array.isArray(payload.items) ? payload.items : []);
      } catch (err) {
        if (cancelled) return;
        setNews([]);
        setError(err instanceof Error ? err.message : "Failed to fetch live news");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchNews();
    const timer = window.setInterval(() => {
      void fetchNews();
    }, 90000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const filteredNews = useMemo(() => {
    let filtered = [...news];

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    if (selectedSentiment !== "all") {
      filtered = filtered.filter((item) => item.sentiment === selectedSentiment);
    }

    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return filtered;
  }, [news, searchTerm, selectedCategory, selectedSentiment]);

  const getCategoryColor = (category: string) => {
    if (category === "market") return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (category === "company") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (category === "economy") return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    if (category === "policy") return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === "positive") return <TrendingUp className="w-4 h-4 text-success" />;
    if (sentiment === "negative") return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <TriangleAlert className="w-4 h-4 text-warning" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Market News</h1>
            <p className="text-muted-foreground">Live headlines aggregated from market providers</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search news..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
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
                  onChange={(event) => setSelectedSentiment(event.target.value)}
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

        {loading ? (
          <Card>
            <CardContent className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading live news...</span>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive text-sm flex items-start gap-2">
                <TriangleAlert className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
                    <div className="flex items-center gap-1">{getSentimentIcon(item.sentiment)}</div>
                  </div>
                  <CardTitle className="text-lg leading-tight line-clamp-2">{item.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{item.summary}</CardDescription>
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
                          <Badge key={`${item.id}-${asset}`} variant="outline" className="text-xs">
                            {asset.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Read More
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && filteredNews.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No news found</h3>
                <p className="text-muted-foreground">Try adjusting search or sentiment filters.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default News;
