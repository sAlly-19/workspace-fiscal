import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { rawClient } from '../../db';

describe('Enriched Health Endpoint (/api/health)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
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
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('returns full diagnostic payload including database connected, journalMode and memory usage', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('nf-view-api');
    expect(typeof body.uptime).toBe('number');
    expect(body.database).toBeDefined();
    expect(body.database.connected).toBe(true);
    expect(typeof body.database.journalMode).toBe('string');
    expect(body.memory).toBeDefined();
    expect(typeof body.memory.rssMb).toBe('number');
    expect(typeof body.memory.heapUsedMb).toBe('number');
  });

  it('allows unauthenticated access to /api/health even without X-Workspace-Token', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
    });
    expect(res.status).toBe(200);
  });

  it('returns 503 degraded status when database query fails', async () => {
    const spy = vi.spyOn(rawClient, 'execute').mockRejectedValueOnce(new Error('SQLite disk I/O error'));
    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('degraded');
    expect(body.database.connected).toBe(false);
    expect(body.database.error).toContain('SQLite disk I/O error');

    spy.mockRestore();
  });
});

