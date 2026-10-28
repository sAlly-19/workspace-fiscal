import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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

  it('exports BATCH_YIELD_INTERVAL=25 and yields via setImmediate (IMP-T06)', async () => {
    const { BATCH_YIELD_INTERVAL, yieldEventLoop } = await import('./import.routes');
    expect(BATCH_YIELD_INTERVAL).toBe(25);
    const setImmediateSpy = vi.spyOn(global, 'setImmediate');
    await yieldEventLoop();
    expect(setImmediateSpy).toHaveBeenCalled();
    setImmediateSpy.mockRestore();
  });

  it('handles POST /api/import/:jobId/cancel and returns 404 for non-existent job', async () => {
    const res = await fetch(`${baseUrl}/api/import/non-existent-id/cancel`, {
      method: 'POST',
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Job não encontrado.');
  });

  it('cancels an active import job via POST /api/import/:jobId/cancel and updates status', async () => {
    const { importService } = await import('../services/import.service');
    const job = await importService.createImportJob(10);
    expect(importService.isJobCancelled(job.id)).toBe(false);

    const cancelRes = await fetch(`${baseUrl}/api/import/${job.id}/cancel`, {
      method: 'POST',
    });
    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.message).toContain('cancelada');
    expect(importService.isJobCancelled(job.id)).toBe(true);

    const statusRes = await fetch(`${baseUrl}/api/import/${job.id}`);
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.status).toBe('cancelled');
    expect(statusBody.statusRaw).toBe('CANCELLED');
  });
});
