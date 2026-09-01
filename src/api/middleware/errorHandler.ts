import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ApiError extends Error {
  status?: number;
  code?: string;
  expose?: boolean;
}

const PROD = process.env.NODE_ENV === 'production';

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isApi = req.path.startsWith('/api') || req.originalUrl.startsWith('/api');

  if (err.code === 'LIMIT_FILE_SIZE') {
    if (isApi) {
      res.status(413).json({ error: 'Arquivo excede limite de 10MB.' });
      return;
    }
  }

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;

  // Log interno sempre com detalhes; resposta ao cliente SEMPRE genérica em 500.
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        code: err.code,
        status,
      },
      req: {
        method: req.method,
        path: req.path,
        ip: req.ip,
      },
    },
    'request_failed'
  );

  if (status >= 500 && PROD) {
    if (isApi) res.status(500).json({ error: 'Erro interno no servidor' });
    else res.status(500).json({ error: 'Erro interno' });
    return;
  }

  const message = err.expose || status < 500 ? err.message : 'Erro interno';
  if (isApi) res.status(status).json({ error: message });
  else res.status(status).json({ error: message });
}