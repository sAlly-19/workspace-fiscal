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
import sseEventsRoutes from './routes/sse-events.routes';
import assetImportRoutes from './routes/asset-import.routes';
import updatesRoutes from './routes/updates.routes';
import { folderWatcherService } from './services/folder-watcher.service';
import { mutationRateLimiter, readRateLimiter, requestLogger } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { localAuthMiddleware } from './middleware/localAuth';
import { logger } from './utils/logger';
import { rawClient } from '../db';

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

  // CORS para permitir requisições locais do frontend Electron
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-Token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      const journalRes = await rawClient.execute('PRAGMA journal_mode;');
      const journalMode = (journalRes.rows?.[0]?.[0] as string) || 'unknown';
      await rawClient.execute('SELECT 1;');

      const mem = process.memoryUsage();
      res.json({
        status: 'ok',
        service: 'nf-view-api',
        version: '3.5.4',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          journalMode,
        },
        memory: {
          rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        },
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'degraded',
        service: 'nf-view-api',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: err?.message || String(err),
        },
      });
    }
  });

  // Autenticação local e controle de tráfego
  app.use('/api', localAuthMiddleware);
  app.use('/api', readRateLimiter);
  app.use('/api/import', importRoutes);
  app.use('/api/workspace', workspaceRoutes);
  app.use('/api/documents', documentsRoutes); // mix read/write — middleware interno
  app.use('/api/documents', eventsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/companies', mutationRateLimiter, companiesRoutes);
  app.use('/api/categories', mutationRateLimiter, categoriesRoutes);
  app.use('/api/assets', mutationRateLimiter, assetsRoutes);
  app.use('/api/assets/import', mutationRateLimiter, assetImportRoutes);
  app.use('/api/depreciation', mutationRateLimiter, depreciationRoutes);
  app.use('/api/exports', mutationRateLimiter, exportsRoutes);
  app.use('/api/backup', mutationRateLimiter, backupRoutes);
  app.use('/api/settings', mutationRateLimiter, settingsRoutes);
  app.use('/api/updates', updatesRoutes);
  app.use('/api/events', sseEventsRoutes);

  // Inicializa monitoramento contínuo de pastas locais em background
  // Com delay no scan inicial para liberar total prioridade ao boot da janela e render da UI
  folderWatcherService.init({ delayScanMs: 3500 }).catch((err) => {
    logger.warn({ err: err?.message }, 'folder_watcher_init_background_note');
  });

  // 404 JSON para rotas /api não encontradas
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.path}` });
  });

  // Error handler global — DEVE ser o último middleware.
  app.use(errorHandler);

  logger.info('Express app initialized');
  return app;
}