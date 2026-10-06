import { describe, expect, it } from 'vitest';
import { NfseTlsError } from '../domain/errors';
import { NfseRetryPolicy } from './NfseRetryPolicy';

describe('NfseRetryPolicy', () => {
  it.each([429, 502, 503, 504])('retries HTTP %s only once', async (statusCode) => {
    let attempts = 0;
    const delays: number[] = [];
    const policy = new NfseRetryPolicy(async (milliseconds) => { delays.push(milliseconds); });

    const result = await policy.execute(async () => {
      attempts += 1;
      const responseHeaders: Record<string, string> = statusCode === 429 ? { 'retry-after': '2' } : {};
      return {
        statusCode: attempts === 1 ? statusCode : 200,
        responseBody: '',
        responseHeaders,
      };
    });

    expect(result.statusCode).toBe(200);
    expect(attempts).toBe(2);
    expect(delays).toEqual([statusCode === 429 ? 2000 : 250]);
  });

  it.each([400, 401, 403, 404, 409])('does not retry HTTP %s', async (statusCode) => {
    let attempts = 0;
    const policy = new NfseRetryPolicy(async () => undefined);

    const result = await policy.execute(async () => {
      attempts += 1;
      return { statusCode, responseBody: '', responseHeaders: {} };
    });

    expect(result.statusCode).toBe(statusCode);
    expect(attempts).toBe(1);
  });

  it('retries one transient TLS/network failure', async () => {
    let attempts = 0;
    const policy = new NfseRetryPolicy(async () => undefined);

    const result = await policy.execute(async () => {
      attempts += 1;
      if (attempts === 1) throw new NfseTlsError('falha transitória');
      return { statusCode: 200, responseBody: 'ok', responseHeaders: {} };
    });

    expect(result.responseBody).toBe('ok');
    expect(attempts).toBe(2);
  });
});
