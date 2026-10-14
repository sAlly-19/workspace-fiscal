import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { setApiToken } from '../middleware/localAuth';

describe('Validation Routes Integration (IMP-011)', () => {
  let server: http.Server;
  let baseUrl: string;
  const token = 'test-token-valid-1234567890';

  beforeAll(async () => {
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
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const headers = () => ({
    'Content-Type': 'application/json',
    'x-workspace-token': token,
  });

  describe('Companies Validation', () => {
    it('returns 400 with standardized error and details on invalid company creation', async () => {
      const res = await fetch(`${baseUrl}/api/companies`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: '',
          document: '123',
          state: 'INVALID_UF',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Dados de entrada inválidos');
      expect(Array.isArray(json.details)).toBe(true);
      expect(json.details.length).toBeGreaterThan(0);
    });

    it('returns 400 on invalid company update', async () => {
      const res = await fetch(`${baseUrl}/api/companies/some-id`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          name: '   ',
          state: 'XX',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Dados de entrada inválidos');
      expect(json.details).toBeDefined();
    });
  });

  describe('Assets Validation', () => {
    it('returns 400 with details on invalid asset creation', async () => {
      const res = await fetch(`${baseUrl}/api/assets`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          companyId: '',
          supplier: '',
          acquisitionValue: -50,
          annualRate: 150,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Dados de entrada inválidos');
      expect(Array.isArray(json.details)).toBe(true);
      expect(json.details.length).toBeGreaterThanOrEqual(3);
    });

    it('returns 400 on invalid asset update', async () => {
      const res = await fetch(`${baseUrl}/api/assets/some-id`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          annualRate: -10,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Dados de entrada inválidos');
      expect(json.details).toBeDefined();
    });
  });

  describe('Categories Validation', () => {
    it('returns 400 on invalid category creation', async () => {
      const res = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: '',
          defaultRate: 0,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Dados de entrada inválidos');
      expect(json.details).toBeDefined();
    });
  });

  describe('Depreciation Validation', () => {
    it('returns 400 on invalid competence query', async () => {
      const res = await fetch(`${baseUrl}/api/depreciation/monthly?companyId=c1&competence=2026-99`, {
        headers: headers(),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Dados de entrada inválidos');
      expect(json.details).toBeDefined();
    });
  });
});
