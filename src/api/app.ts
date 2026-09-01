import express from 'express';
import importRoutes from './routes/import.routes';
import workspaceRoutes from './routes/workspace.routes';
import documentsRoutes from './routes/documents.routes';
import analyticsRoutes from './routes/analytics.routes';
import companiesRoutes from './routes/companies.routes';
import categoriesRoutes from './routes/categories.routes';
import assetsRoutes from './routes/assets.routes';
import depreciationRoutes from './routes/depreciation.routes';
import exportsRoutes from './routes/exports.routes';
import { securityHeaders } from './middleware/securityHeaders';

/**
 * Cria e configura a aplicação Express base compartilhada entre
 * `server.ts` (web/dev) e `electron/main.ts` (desktop).
 * Evita duplicação de rotas, headers e error handler.
 */
export function createApp(): express.Express {
  const app = express();

  app.use(securityHeaders);
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: false, limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nf-view-api' });
  });

  app.use('/api/import', importRoutes);
  app.use('/api/workspace', workspaceRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/companies', companiesRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/assets', assetsRoutes);
  app.use('/api/depreciation', depreciationRoutes);
  app.use('/api/exports', exportsRoutes);

  // 404 JSON para rotas /api não encontradas
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.path}` });
  });

  // Error handler global para API
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
      console.error('[API Internal Error]:', err);
      if (err?.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Arquivo excede limite de 10MB.' });
        return;
      }
      res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor' });
      return;
    }
    // Para rotas não-API, deixa o próximo handler (Vite/static) lidar
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  });

  return app;
}
