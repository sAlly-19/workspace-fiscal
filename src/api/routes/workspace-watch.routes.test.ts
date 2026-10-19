import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { setApiToken } from '../middleware/localAuth';
import { initDatabase } from '../../db';
import { folderWatcherService } from '../services/folder-watcher.service';

describe('Workspace Watch Routes & SSE Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  const token = 'test-token-watch-1234567890';

  beforeAll(async () => {
    await initDatabase();
    setApiToken(token);
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
    folderWatcherService.stopAll();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const headers = () => ({
    'Content-Type': 'application/json',
    'x-workspace-token': token,
  });

  it('creates a watched folder and returns watch configuration in hierarchy', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/folders`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: 'Pasta Monitorada Teste',
        watchPath: 'C:\\test\\watch-dir',
        watchRecursive: true,
        watchMode: 'prompt',
      }),
    });

    expect(res.status).toBe(201);
    const folder = await res.json();
    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('Pasta Monitorada Teste');
    expect(folder.watchPath).toBe('C:\\test\\watch-dir');
    expect(folder.watchMode).toBe('prompt');
    expect(folder.watchRecursive).toBe(true);

    // Verify GET /api/workspace hierarchy
    const hierRes = await fetch(`${baseUrl}/api/workspace`, {
      headers: headers(),
    });
    expect(hierRes.status).toBe(200);
    const hierarchy = await hierRes.json();
    const createdInTree = hierarchy.find((f: any) => f.id === folder.id);
    expect(createdInTree).toBeDefined();
    expect(createdInTree.watchMode).toBe('prompt');
    expect(createdInTree.watchPath).toBe('C:\\test\\watch-dir');
    expect(createdInTree.watchRecursive).toBe(true);
  });

  it('updates watch configuration of a folder', async () => {
    // 1. Create initial folder
    const createRes = await fetch(`${baseUrl}/api/workspace/folders`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: 'Pasta Para Atualizar' }),
    });
    const folder = await createRes.json();

    // 2. Patch watch configuration
    const patchRes = await fetch(`${baseUrl}/api/workspace/folders/${folder.id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({
        watchPath: 'C:\\test\\novo-caminho',
        watchMode: 'auto',
        watchRecursive: false,
      }),
    });

    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.watchPath).toBe('C:\\test\\novo-caminho');
    expect(updated.watchMode).toBe('auto');
  });

  it('handles watch confirm and dismiss endpoints without errors', async () => {
    const createRes = await fetch(`${baseUrl}/api/workspace/folders`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: 'Pasta Ações Watch' }),
    });
    const folder = await createRes.json();

    // Check pending
    const pendingRes = await fetch(`${baseUrl}/api/workspace/folders/${folder.id}/watch/pending`, {
      headers: headers(),
    });
    expect(pendingRes.status).toBe(200);
    const pendingJson = await pendingRes.json();
    expect(pendingJson.pendingCount).toBe(0);

    // Confirm (empty)
    const confirmRes = await fetch(`${baseUrl}/api/workspace/folders/${folder.id}/watch/confirm`, {
      method: 'POST',
      headers: headers(),
    });
    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.success).toBe(true);

    // Dismiss
    const dismissRes = await fetch(`${baseUrl}/api/workspace/folders/${folder.id}/watch/dismiss`, {
      method: 'POST',
      headers: headers(),
    });
    expect(dismissRes.status).toBe(200);
    const dismissJson = await dismissRes.json();
    expect(dismissJson.success).toBe(true);
  });

  it('connects to /api/events and receives SSE handshake', async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      headers: {
        'x-workspace-token': token,
        Accept: 'text/event-stream',
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      expect(text).toContain(':connected');
      reader.cancel();
    }
  });
});
