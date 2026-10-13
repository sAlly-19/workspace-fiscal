import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

let currentApiToken: string | null = null;

export function setApiToken(token: string | null): void {
  currentApiToken = token;
}

export function getApiToken(): string | null {
  return currentApiToken;
}

export function localAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. Health check é público para probing do Electron e do overlay
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  // 2. Preflight CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // 3. Suporte a testes legados: se em teste e sem enforcement explícito, permite bypass
  if (isTest && process.env.TEST_ENFORCE_LOCAL_AUTH !== 'true' && !currentApiToken) {
    return next();
  }

  // 4. Bypass aceito estritamente fora de produção
  if (!isProduction && process.env.BYPASS_LOCAL_AUTH === 'true') {
    return next();
  }

  // 5. Se nenhum token foi definido
  if (!currentApiToken) {
    if (!isProduction && !isTest) return next();
    res.status(401).json({ error: 'Unauthorized local session: token not initialized' });
    return;
  }

  // 6. Validação do cabeçalho X-Workspace-Token
  const providedToken = req.headers['x-workspace-token'];
  if (!providedToken || typeof providedToken !== 'string') {
    res.status(401).json({ error: 'Unauthorized local session' });
    return;
  }

  const tokenBuffer = Buffer.from(currentApiToken, 'utf-8');
  const providedBuffer = Buffer.from(providedToken, 'utf-8');

  // Proteção contra timing attack e diferença de comprimento de buffer
  if (tokenBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, providedBuffer)) {
    res.status(401).json({ error: 'Unauthorized local session' });
    return;
  }

  next();
}
