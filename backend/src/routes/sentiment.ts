import { Router } from 'express';

const router = Router();

// GET /api/sentiment - Get market sentiment
router.get('/', (req, res) => {
  res.json({
    overall: 'Bullish',
    score: 75,
    sectorSentiment: {
      technology: 'Bullish',
      finance: 'Neutral',
      energy: 'Bearish',
      healthcare: 'Bullish'
    },
    news: [
      { title: 'Market hits all-time high', sentiment: 'Positive', source: 'Financial Times' },
      { title: 'Inflation concerns persist', sentiment: 'Negative', source: 'Bloomberg' }
    ]
  });
});

export default router;
