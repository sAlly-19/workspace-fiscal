import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware mínimo de headers de segurança (sem depender de `helmet`).
 * Evita adicionar dependência nova e mantém compatibilidade Electron/web.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Evita MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // XSS filter legado + referrer
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Não cacheia respostas de API sensíveis por padrão
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  // HSTS apenas se HTTPS (em produção web)
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // CSP mínima para API (não afeta frontend Vite que serve HTML separado)
  // Para rotas de API, bloqueia tudo exceto self
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  next();
}
