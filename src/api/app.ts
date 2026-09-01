import express from 'express';
import helmet from 'helmet';
import importRoutes from './routes/import.routes';
import workspaceRoutes from './routes/workspace.routes';
import documentsRoutes from './routes/documents.routes';
import analyticsRoutes from './routes/analytics.routes';
import companiesRoutes from './routes/companies.routes';
import categoriesRoutes from './routes/categories.routes';
import assetsRoutes from './routes/assets.routes';
import depreciationRoutes from './routes/depreciation.routes';
import exportsRoutes from './routes/exports.routes';
import backupRoutes from './routes/backup.routes';
import settingsRoutes from './routes/settings.routes';
import eventsRoutes from './routes/events.routes';
import assetImportRoutes from './routes/asset-import.routes';
import { mutationRateLimiter, readRateLimiter, requestLogger } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

/**
 * Cria e configura a aplicação Express base compartilhada entre
 * `server.ts` (web/dev) e `electron/main.ts` (desktop).
 * Helmet + rate limit + error handler seguro são aplicados aqui.
 */
export function createApp(): express.Express {
  const app = express();

  // Helmet: substitui o middleware manual e adiciona defaults sensatos.
  // Em Electron desktop, CSP rígida quebraria o Vite HMR; usamos defaults
  // permissivos para assets locais e desabilitamos cross-origin policies
  // que bloqueiam carregamento de imagens locais via blob:.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: false, limit: '15mb' }));

  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nf-view-api' });
  });

  // Rotas de leitura com limite alto; mutações com limite conservador.
  app.use('/api', readRateLimiter);
  app.use('/api/import', mutationRateLimiter, importRoutes);
  app.use('/api/workspace', mutationRateLimiter, workspaceRoutes);
  app.use('/api/documents', documentsRoutes); // mix read/write — middleware interno
  app.use('/api/documents', eventsRoutes);
  app.use('/api/analytics', readRateLimiter, analyticsRoutes);
  app.use('/api/companies', mutationRateLimiter, companiesRoutes);
  app.use('/api/categories', mutationRateLimiter, categoriesRoutes);
  app.use('/api/assets', mutationRateLimiter, assetsRoutes);
  app.use('/api/assets/import', mutationRateLimiter, assetImportRoutes);
  app.use('/api/depreciation', mutationRateLimiter, depreciationRoutes);
  app.use('/api/exports', mutationRateLimiter, exportsRoutes);
  app.use('/api/backup', mutationRateLimiter, backupRoutes);
  app.use('/api/settings', mutationRateLimiter, settingsRoutes);

  // 404 JSON para rotas /api não encontradas
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.path}` });
  });

  // Error handler global — DEVE ser o último middleware.
  app.use(errorHandler);

  logger.info('Express app initialized');
  return app;
}