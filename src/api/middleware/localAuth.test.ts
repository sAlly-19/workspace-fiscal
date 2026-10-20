import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';
import { localAuthMiddleware, setApiToken } from './localAuth';

describe('localAuthMiddleware', () => {
  const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const originalEnv = { ...process.env };
  let server: http.Server | null = null;
  let baseUrl = '';

  const startTestServer = (app: express.Express): Promise<string> => {
    return new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server!.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve(baseUrl);
      });
    });
  };

  beforeEach(() => {
    process.env.TEST_ENFORCE_LOCAL_AUTH = 'true';
    delete process.env.BYPASS_LOCAL_AUTH;
    setApiToken(SECRET);
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    setApiToken(null);
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = null;
    }
  });

  it('permite acesso livre a /api/health sem token', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('permite preflight OPTIONS sem token para suportar CORS', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.options('/api/documents', (_req, res) => res.sendStatus(204));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });

  it('rejeita com 401 requisições sem X-Workspace-Token', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized local session');
  });

  it('rejeita com 401 token invalido com comprimento diferente sem disparar RangeError', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents`, {
      headers: { 'X-Workspace-Token': 'token_curto' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized local session');
  });

  it('rejeita com 401 token invalido com mesmo comprimento via timingSafeEqual', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));
    await startTestServer(app);

    const wrongTokenSameLength = 'b'.repeat(SECRET.length);
    const res = await fetch(`${baseUrl}/api/documents`, {
      headers: { 'X-Workspace-Token': wrongTokenSameLength },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized local session');
  });

  it('permite requisicao com X-Workspace-Token valido', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents`, {
      headers: { 'X-Workspace-Token': SECRET },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.docs).toEqual([]);
  });

  it('permite requisicao com query parameter token valido para aberturas no navegador', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents/batch-print', (_req, res) => res.send('<html>danfe</html>'));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents/batch-print?ids=123&autoprint=true&token=${SECRET}`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('<html>danfe</html>');
  });

  it('rejeita com 401 requisicao com query parameter token invalido', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents/batch-print', (_req, res) => res.send('<html>danfe</html>'));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents/batch-print?ids=123&autoprint=true&token=invalid-token`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized local session');
  });

  it('permite bypass se BYPASS_LOCAL_AUTH=true e NODE_ENV!==production', async () => {
    process.env.BYPASS_LOCAL_AUTH = 'true';
    process.env.NODE_ENV = 'development';

    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents`);
    expect(res.status).toBe(200);
  });

  it('ignora estritamente BYPASS_LOCAL_AUTH=true quando NODE_ENV=production', async () => {
    process.env.BYPASS_LOCAL_AUTH = 'true';
    process.env.NODE_ENV = 'production';

    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));
    await startTestServer(app);

    const res = await fetch(`${baseUrl}/api/documents`);
    expect(res.status).toBe(401);
  });
});

