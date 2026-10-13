import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';

describe('Import Routes', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('handles POST /api/import/upload and returns 400 when no files are provided (not 404)', async () => {
    const res = await fetch(`${baseUrl}/api/import/upload`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Nenhum arquivo enviado.');
  });

  it('handles POST /api/import/ and returns 400 when no files are provided', async () => {
    const res = await fetch(`${baseUrl}/api/import`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Nenhum arquivo enviado.');
  });

  it('returns 404 for unknown routes under /api/import/*', async () => {
    const res = await fetch(`${baseUrl}/api/import/unknown-path`, {
      method: 'POST',
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Rota API não encontrada');
  });
});
