import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiter genérico para rotas de mutação. Read-only routes usam limite maior.
// Defaults são seguros para desktop local; em produção web, ajustar via env.
export const mutationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MUTATIONS_PER_MIN) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});

export const readRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_READS_PER_MIN) || 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
});

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  // Apenas em dev, para não poluir produção. Logger pino cuida do resto.
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
}