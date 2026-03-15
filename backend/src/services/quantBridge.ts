import http from 'http';
import https from 'https';

export type QuantHorizon = 'daily' | 'weekly' | 'monthly';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface QuantRequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined>;
}

export interface QuantHealthResponse {
  status: string;
  service: string;
  time: string;
  disclaimer?: string;
}

export interface QuantPredictionResponse {
  symbol: string;
  horizon: QuantHorizon;
  timestamp: string;
  direction: 'Bullish' | 'Bearish' | 'Neutral';
  probability_up: number;
  confidence: number;
  expected_return_pct: number;
  confidence_interval_pct: [number, number];
  regime: 'Bull' | 'Bear' | 'Sideways';
  model_votes: Record<string, number>;
  model_weights: Record<string, number>;
  agreement_score: number;
  reason: string[];
}

export interface QuantExplainResponse {
  symbol: string;
  horizon: QuantHorizon;
  generated_at: string;
  feature_importance: Array<{ feature: string; importance: number; value: number }>;
  shap_values: Array<{ feature: string; shap: number; value: number }>;
  model_agreement: {
    agreement_score: number;
    weights: Record<string, number>;
    metrics: Record<string, Record<string, number>>;
  };
  why_prediction: string[];
}

export interface QuantBacktestResponse {
  sample_size: number;
  directional_sample_size: number;
  directional_accuracy: number;
  naive_accuracy: number;
  beat_naive_baseline: boolean;
  rolling_accuracy_30d: number[];
  rolling_accuracy_90d: number[];
  rolling_accuracy_365d: number[];
  mae: number;
  rmse: number;
  mape: number;
  portfolio_metrics: {
    cagr: number;
    sharpe: number;
    sortino: number;
    max_drawdown: number;
    win_rate: number;
    profit_factor: number;
  };
  strategy_optimizer: {
    best_params: {
      stop_loss_pct: number;
      take_profit_pct: number;
    };
    best_sharpe: number;
  };
  trade_count: number;
  horizon: QuantHorizon;
  generated_at: string;
  symbols: string[];
  disclaimer: string;
}

export interface QuantTrainingRun {
  id: number;
  horizon: QuantHorizon;
  symbols: string[];
  sample_size: number;
  directional_accuracy: number;
  created_at: string;
}

export interface QuantTrainResponse {
  horizon: QuantHorizon;
  trained_at: string;
  symbols: string[];
  sample_size: number;
  directional_accuracy_weighted: number;
  model_metrics: Record<string, Record<string, number>>;
  model_weights: Record<string, number>;
  calibration_curve: Array<{ probability_bin: number; observed_frequency: number; count: number }>;
  directional_metrics_by_model: Record<string, number>;
  regime_adjustment: Record<string, number>;
}

export interface QuantPortfolioTransactionRequest {
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp?: string;
  fees?: number;
}

export interface QuantPaperOrderRequest {
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  limit_price?: number;
  stop_price?: number;
  time_in_force?: 'DAY' | 'GTC' | 'IOC';
  timestamp?: string;
  idempotency_key?: string;
}

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');
const safeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);
const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
};

const quantEnabled = toBool(process.env.QUANT_SERVICE_ENABLED, true);
const quantBaseUrl = normalizeBaseUrl(process.env.QUANT_SERVICE_URL ?? 'http://127.0.0.1:8100/api/v1');
const quantTimeoutMs = Math.max(1000, Number.parseInt(process.env.QUANT_SERVICE_TIMEOUT_MS ?? '18000', 10) || 18000);
const quantPredictTimeoutMs = Math.max(
  quantTimeoutMs,
  Number.parseInt(process.env.QUANT_PREDICT_TIMEOUT_MS ?? '60000', 10) || 60000
);
const quantBacktestTimeoutMs = Math.max(
  quantTimeoutMs,
  Number.parseInt(process.env.QUANT_BACKTEST_TIMEOUT_MS ?? '180000', 10) || 180000
);
const quantTrainTimeoutMs = Math.max(
  quantTimeoutMs,
  Number.parseInt(process.env.QUANT_TRAIN_TIMEOUT_MS ?? '180000', 10) || 180000
);
const healthCacheTtlMs = 20_000;

let lastHealthCheckAt = 0;
let lastHealthState: QuantHealthResponse | null = null;

const requestJson = async <T>(options: QuantRequestOptions): Promise<T> => {
  if (!quantEnabled) {
    throw new Error('Quant service is disabled by QUANT_SERVICE_ENABLED');
  }

  const base = new URL(quantBaseUrl.endsWith('/') ? quantBaseUrl : `${quantBaseUrl}/`);
  const finalUrl = new URL(options.path.replace(/^\//, ''), base);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value === undefined) return;
      finalUrl.searchParams.set(key, String(value));
    });
  }

  const payload = options.body ? JSON.stringify(options.body) : undefined;
  const isHttps = finalUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise<T>((resolve, reject) => {
    const req = client.request(
      finalUrl,
      {
        method: options.method,
        headers: payload
          ? {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(payload),
            }
          : undefined,
        timeout: options.timeoutMs ?? quantTimeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const statusCode = res.statusCode ?? 500;
          if (statusCode >= 400) {
            reject(new Error(`Quant service ${statusCode}: ${raw || 'request failed'}`));
            return;
          }

          if (!raw) {
            resolve({} as T);
            return;
          }

          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(new Error('Quant service returned non-JSON payload'));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Quant service request timeout'));
    });

    req.on('error', (error) => reject(error));

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
};

export const isQuantServiceEnabled = (): boolean => quantEnabled;

export const getQuantServiceConfig = (): { enabled: boolean; baseUrl: string; timeoutMs: number } => ({
  enabled: quantEnabled,
  baseUrl: quantBaseUrl,
  timeoutMs: quantTimeoutMs,
});

export const getQuantServiceBaseUrl = (): string => quantBaseUrl;

export const getQuantHealth = async (forceRefresh: boolean = false): Promise<QuantHealthResponse> => {
  const now = Date.now();
  if (!forceRefresh && lastHealthState && now - lastHealthCheckAt <= healthCacheTtlMs) {
    return lastHealthState;
  }

  const response = await requestJson<QuantHealthResponse>({
    method: 'GET',
    path: '/health',
    timeoutMs: Math.min(quantTimeoutMs, 7000),
  });

  lastHealthState = response;
  lastHealthCheckAt = now;
  return response;
};

export const getQuantPrediction = async (symbol: string, horizon: QuantHorizon): Promise<QuantPredictionResponse> =>
  requestJson<QuantPredictionResponse>({
    method: 'POST',
    path: '/predict',
    timeoutMs: quantPredictTimeoutMs,
    body: {
      symbol: symbol.trim().toUpperCase(),
      horizon,
    },
  });

export const getQuantExplainability = async (symbol: string, horizon: QuantHorizon): Promise<QuantExplainResponse> =>
  requestJson<QuantExplainResponse>({
    method: 'POST',
    path: '/explain',
    timeoutMs: quantPredictTimeoutMs,
    body: {
      symbol: symbol.trim().toUpperCase(),
      horizon,
    },
  });

export const getQuantBacktest = async (
  symbols: string[],
  horizon: QuantHorizon,
  options?: Partial<{
    lookback_days: number;
    walk_forward_windows: number;
    transaction_cost_bps: number;
    slippage_bps: number;
    stop_loss_pct: number;
    take_profit_pct: number;
    timeout_ms: number;
  }>
): Promise<QuantBacktestResponse> =>
  requestJson<QuantBacktestResponse>({
    method: 'POST',
    path: '/backtest',
    timeoutMs: safeNumber(options?.timeout_ms ?? quantBacktestTimeoutMs),
    body: {
      symbols,
      horizon,
      lookback_days: safeNumber(options?.lookback_days ?? 1200),
      walk_forward_windows: safeNumber(options?.walk_forward_windows ?? 8),
      transaction_cost_bps: safeNumber(options?.transaction_cost_bps ?? 8),
      slippage_bps: safeNumber(options?.slippage_bps ?? 6),
      stop_loss_pct: safeNumber(options?.stop_loss_pct ?? 0.03),
      take_profit_pct: safeNumber(options?.take_profit_pct ?? 0.08),
    },
  });

export const triggerQuantTrain = async (symbols: string[], horizon: QuantHorizon): Promise<QuantTrainResponse> =>
  requestJson<QuantTrainResponse>({
    method: 'POST',
    path: '/train',
    timeoutMs: quantTrainTimeoutMs,
    body: {
      symbols,
      horizon,
      lookback_days: 900,
      sequence_length: 30,
    },
  });

export const getQuantTrainingRuns = async (limit: number = 20): Promise<QuantTrainingRun[]> => {
  const response = await requestJson<{ items: QuantTrainingRun[] }>({
    method: 'GET',
    path: '/training/runs',
    query: { limit },
  });
  return response.items ?? [];
};

export const getQuantCorrelation = async (symbols: string[]): Promise<{
  symbols: string[];
  matrix: Array<{ symbol: string; values: Record<string, number> }>;
  generated_at: string;
}> =>
  requestJson<{
    symbols: string[];
    matrix: Array<{ symbol: string; values: Record<string, number> }>;
    generated_at: string;
  }>({
    method: 'GET',
    path: '/correlation',
    query: {
      symbols: symbols.join(','),
      lookback_days: 365,
    },
  });

export const createQuantPortfolioTransaction = async (payload: QuantPortfolioTransactionRequest): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'POST',
    path: '/portfolio/transactions',
    body: payload,
  });

export const getQuantPortfolioPositions = async (userId: string): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'GET',
    path: '/portfolio/positions',
    query: { user_id: userId },
  });

export const getQuantRiskSnapshot = async (userId: string, lookbackDays: number = 365): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'GET',
    path: '/risk/snapshot',
    query: { user_id: userId, lookback_days: lookbackDays },
  });

export const runQuantStress = async (
  userId: string,
  scenarios: Array<Record<string, unknown>>
): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'POST',
    path: '/stress/run',
    body: { user_id: userId, scenarios },
  });

export const runQuantRebalance = async (
  userId: string,
  constraints: Record<string, unknown>
): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'POST',
    path: '/optimizer/rebalance',
    body: { user_id: userId, constraints },
  });

export const createQuantPaperOrder = async (payload: QuantPaperOrderRequest): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'POST',
    path: '/paper/orders',
    body: payload,
  });

export const getQuantPaperOrders = async (
  userId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'GET',
    path: '/paper/orders',
    query: { user_id: userId, status, limit, offset },
  });

export const cancelQuantPaperOrder = async (userId: string, orderId: string): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'POST',
    path: `/paper/orders/${encodeURIComponent(orderId)}/cancel`,
    query: { user_id: userId },
  });

export const getQuantPaperFills = async (
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Record<string, unknown>> =>
  requestJson<Record<string, unknown>>({
    method: 'GET',
    path: '/paper/fills',
    query: { user_id: userId, limit, offset },
  });
