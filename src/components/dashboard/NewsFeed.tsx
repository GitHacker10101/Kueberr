import { Newspaper, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const NewsFeed = () => {
  const newsItems = [
    {
      id: 1,
      title: "Reliance Industries Q4 Results Beat Expectations",
      summary: "Reliance Industries reported strong Q4 earnings with 15% YoY growth in net profit.",
      source: "Economic Times",
      time: "2 hours ago",
      sentiment: "positive",
      url: "#"
    },
    {
      id: 2,
      title: "Bitcoin Surges Past $90,000 as Institutional Adoption Grows",
      summary: "Major financial institutions continue to add Bitcoin to their balance sheets.",
      source: "CoinDesk",
      time: "4 hours ago",
      sentiment: "positive",
      url: "#"
    },
    {
      id: 3,
      title: "TCS Wins $2B Contract from Global Tech Giant",
      summary: "Tata Consultancy Services secures major deal with leading technology company.",
      source: "Business Standard",
      time: "6 hours ago",
      sentiment: "positive",
      url: "#"
    },
    {
      id: 4,
      title: "Market Volatility Expected as Fed Meeting Approaches",
      summary: "Traders brace for potential interest rate decisions that could impact global markets.",
      source: "Bloomberg",
      time: "8 hours ago",
      sentiment: "neutral",
      url: "#"
    },
    {
      id: 5,
      title: "Infosys Faces Regulatory Scrutiny Over Data Practices",
      summary: "IT major under investigation for potential data privacy violations.",
      source: "Financial Express",
      time: "12 hours ago",
      sentiment: "negative",
      url: "#"
    }
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-success';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Market News</h3>
        </div>
        <Button variant="ghost" size="sm">
          View All
        </Button>
      </div>

      <div className="space-y-4">
        {newsItems.map((item) => (
          <div key={item.id} className="border-b border-border/50 last:border-b-0 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                item.sentiment === 'positive' ? 'bg-success' :
                item.sentiment === 'negative' ? 'bg-destructive' : 'bg-muted-foreground'
              }`} />
              <div className="flex-1">
                <h4 className="font-medium text-foreground text-sm leading-tight mb-1">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {item.summary}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
