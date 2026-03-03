import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import './database'; // Initialize database
import authRoutes from './routes/auth';
import portfolioRoutes from './routes/portfolio';
import watchlistRoutes from './routes/watchlist';
import alertsRoutes from './routes/alerts';
import predictionsRoutes from './routes/predictions';
import paymentsRoutes from './routes/payments';
import sentimentRoutes from './routes/sentiment';
import marketRoutes from './routes/market';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
// Stripe webhook requires raw body; apply raw parser for that path before json
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
// Basic request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.json({ limit: '1mb' }));
const allowedDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedDevOrigin.test(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/market', marketRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Kueberr backend running on http://localhost:${PORT}`);
});
