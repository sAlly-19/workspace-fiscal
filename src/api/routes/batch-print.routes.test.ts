import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { setApiToken } from '../middleware/localAuth';
import { initDatabase } from '../../db';
import { folderWatcherService } from '../services/folder-watcher.service';

describe('Batch Print Routes & Authentication', () => {
  let server: http.Server;
  let baseUrl: string;
  const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

  beforeAll(async () => {
    process.env.TEST_ENFORCE_LOCAL_AUTH = 'true';
    await initDatabase();
    setApiToken(SECRET);
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    folderWatcherService.stopAll();
    delete process.env.TEST_ENFORCE_LOCAL_AUTH;
    setApiToken(null);
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('rejeita GET /api/documents/batch-print sem token com 401 Unauthorized local session', async () => {
    const res = await fetch(`${baseUrl}/api/documents/batch-print?ids=dummy-id&autoprint=true`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized local session');
  });

  it('permite GET /api/documents/batch-print quando token é fornecido via query param', async () => {
    const res = await fetch(`${baseUrl}/api/documents/batch-print?ids=dummy-id&autoprint=true&token=${SECRET}`);
    // Como dummy-id não existe no banco, esperamos 404 (passou pela autenticação!)
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).toContain('Nenhum documento fiscal encontrado');
  });

  it('permite criar sessão de impressão via POST /api/documents/batch-print-session e acessar via ticket com token', async () => {
    // 1. Cria sessão com cabeçalho de auth
    const createRes = await fetch(`${baseUrl}/api/documents/batch-print-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Token': SECRET,
      },
      body: JSON.stringify({
        ids: ['dummy-1', 'dummy-2'],
      }),
    });
    expect(createRes.status).toBe(200);
    const { ticket } = await createRes.json();
    expect(ticket).toBeDefined();
    expect(typeof ticket).toBe('string');

    // 2. Consulta via ticket e token na query string
    const printRes = await fetch(`${baseUrl}/api/documents/batch-print?ticket=${ticket}&autoprint=true&token=${SECRET}`);
    expect(printRes.status).toBe(404);
    const text = await printRes.text();
    expect(text).toContain('Nenhum documento fiscal encontrado');
  });
});

