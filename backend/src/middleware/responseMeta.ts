import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export type DataQualityStatus = 'ok' | 'degraded' | 'stale' | 'unavailable';

export interface ResponseMeta {
  data_source: string;
  as_of: string;
  latency_ms: number;
  quality_status: DataQualityStatus;
  request_id: string;
}

type ResponseMetaOverride = Partial<Omit<ResponseMeta, 'latency_ms' | 'request_id'>>;

declare global {
  namespace Express {
    interface Locals {
      responseMeta?: ResponseMetaOverride;
      responseMetaStartNs?: bigint;
      responseMetaRequestId?: string;
    }
  }
}

const routeDefaultSource = (path: string): string => {
  if (path.startsWith('/api/predictions')) return 'engine:prediction';
  if (path.startsWith('/api/command')) return 'engine:quant-gateway';
  if (path.startsWith('/api/portfolio')) return 'portfolio:ledger';
  if (path.startsWith('/api/watchlist')) return 'watchlist:db';
  if (path.startsWith('/api/alerts')) return 'alerts:db';
  if (path.startsWith('/api/market')) return 'market:yahoo';
  if (path.startsWith('/api/sentiment')) return 'sentiment:derived';
  if (path.startsWith('/api/auth')) return 'auth:db';
  if (path.startsWith('/api/payments')) return 'payments:provider';
  return 'backend:unknown';
};

const normalizeAsOf = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim().length > 0) {
    const dt = new Date(value);
    if (Number.isFinite(dt.getTime())) return dt.toISOString();
  }
  return new Date().toISOString();
};

const buildMeta = (req: Request, res: Response): ResponseMeta => {
  const start = res.locals.responseMetaStartNs ?? process.hrtime.bigint();
  const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  const override = res.locals.responseMeta ?? {};
  return {
    data_source: override.data_source ?? routeDefaultSource(req.path),
    as_of: normalizeAsOf(override.as_of),
    latency_ms: Number.isFinite(latencyMs) ? Number(latencyMs.toFixed(2)) : 0,
    quality_status: override.quality_status ?? 'ok',
    request_id: res.locals.responseMetaRequestId ?? randomUUID(),
  };
};

export const setResponseMeta = (res: Response, meta: ResponseMetaOverride): void => {
  res.locals.responseMeta = {
    ...(res.locals.responseMeta ?? {}),
    ...meta,
  };
};

const attachMetaToPayload = (payload: unknown, meta: ResponseMeta): unknown => {
  if (payload === null || payload === undefined) {
    return { data: null, _meta: meta };
  }

  if (Array.isArray(payload)) {
    return { items: payload, _meta: meta };
  }

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const existing = record._meta;
    if (existing && typeof existing === 'object' && existing !== null) {
      return {
        ...record,
        _meta: {
          ...meta,
          ...(existing as Record<string, unknown>),
        },
      };
    }
    return { ...record, _meta: meta };
  }

  return { data: payload, _meta: meta };
};

export const responseMetaMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.locals.responseMetaStartNs = process.hrtime.bigint();
  res.locals.responseMetaRequestId = randomUUID();
  res.locals.responseMeta = {
    data_source: routeDefaultSource(req.path),
    as_of: new Date().toISOString(),
    quality_status: 'ok',
  };

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const payload = attachMetaToPayload(body, buildMeta(req, res));
    return originalJson(payload as Record<string, unknown>);
  }) as Response['json'];

  next();
};
