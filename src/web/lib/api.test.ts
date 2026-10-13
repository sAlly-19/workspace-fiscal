import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiFetch, getApiToken, clearApiTokenCache } from './api';

describe('Web API client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearApiTokenCache();
    (globalThis as any).window = (globalThis as any).window || {};
    delete (globalThis as any).window.api;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('obtem e armazena token em cache a partir de window.api.getApiToken', async () => {
    const mockGetToken = vi.fn().mockResolvedValue('test-token-12345');
    (globalThis as any).window.api = {
      getApiBaseUrl: vi.fn().mockResolvedValue('http://127.0.0.1:3000'),
      getApiToken: mockGetToken,
    };

    const token1 = await getApiToken();
    const token2 = await getApiToken();

    expect(token1).toBe('test-token-12345');
    expect(token2).toBe('test-token-12345');
    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  it('injeta automaticamente X-Workspace-Token em requisicoes apiFetch', async () => {
    let capturedHeaders: Headers | undefined;
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    });

    (globalThis as any).window.api = {
      getApiBaseUrl: vi.fn().mockResolvedValue('http://127.0.0.1:3000'),
      getApiToken: vi.fn().mockResolvedValue('secret-token-xyz'),
    };

    await apiFetch('/api/documents');

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders!.get('X-Workspace-Token')).toBe('secret-token-xyz');
  });

  it('opera normalmente sem erro na ausencia de window.api', async () => {
    delete (globalThis as any).window.api;
    let capturedUrl = '';
    global.fetch = vi.fn().mockImplementation((url) => {
      capturedUrl = String(url);
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    await apiFetch('/api/health');
    expect(capturedUrl).toContain('/api/health');
  });
});
