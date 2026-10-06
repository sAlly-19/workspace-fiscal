import { describe, expect, it } from 'vitest';
import type { HttpExecutionOptions, HttpExecutionResult } from './ICertificateProvider';
import { MockCertificateProvider } from './MockCertificateProvider';

const VALID_THUMBPRINT = 'E22923C34166FC304A236F6EECF2CB0F6F0AE0BF';
const EXPIRED_THUMBPRINT = '6472ACFB067F55B4670C23D562269B3EEE736DC9';

function request(overrides: Partial<HttpExecutionOptions> = {}): HttpExecutionOptions {
  return {
    url: 'https://adn.producaorestrita.nfse.gov.br/contribuintes/DFe/0',
    method: 'GET',
    thumbprint: VALID_THUMBPRINT,
    timeoutSec: 30,
    headers: { Accept: 'application/json' },
    ...overrides,
  };
}

describe('certificate-backed HTTP transport', () => {
  it('validates and forwards an official HTTPS GET without network access', async () => {
    const provider = new MockCertificateProvider(async (options): Promise<HttpExecutionResult> => ({
      statusCode: 200,
      responseBody: JSON.stringify({ url: options.url, method: options.method }),
      responseHeaders: { 'content-type': 'application/json' },
    }));

    const result = await provider.executeHttpRequest(request());

    expect(JSON.parse(result.responseBody)).toEqual({
      url: 'https://adn.producaorestrita.nfse.gov.br/contribuintes/DFe/0',
      method: 'GET',
    });
    expect(result.responseHeaders).toEqual({ 'content-type': 'application/json' });
  });

  it.each([
    ['non-HTTPS URL', { url: 'http://adn.nfse.gov.br/contribuintes/DFe/0' }],
    ['unapproved host', { url: 'https://example.com/contribuintes/DFe/0' }],
    ['non-GET method', { method: 'POST' as 'GET' }],
    ['zero timeout', { timeoutSec: 0 }],
    ['excessive timeout', { timeoutSec: 121 }],
  ])('rejects %s before invoking the transport', async (_case, overrides) => {
    let invoked = false;
    const provider = new MockCertificateProvider(async () => {
      invoked = true;
      return { statusCode: 200, responseBody: '', responseHeaders: {} };
    });

    await expect(provider.executeHttpRequest(request(overrides))).rejects.toThrow();
    expect(invoked).toBe(false);
  });

  it('rejects a missing or expired certificate before invoking the transport', async () => {
    let invoked = false;
    const provider = new MockCertificateProvider(async () => {
      invoked = true;
      return { statusCode: 200, responseBody: '', responseHeaders: {} };
    });

    await expect(provider.executeHttpRequest(request({ thumbprint: 'A'.repeat(40) }))).rejects.toThrow('não foi localizado');
    await expect(provider.executeHttpRequest(request({ thumbprint: EXPIRED_THUMBPRINT }))).rejects.toThrow('expirado');
    expect(invoked).toBe(false);
  });

  it('honors a signal that was cancelled before execution', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new MockCertificateProvider(async () => ({
      statusCode: 200,
      responseBody: '',
      responseHeaders: {},
    }));

    await expect(provider.executeHttpRequest(request({ signal: controller.signal }))).rejects.toThrow('cancelada');
  });

  it('removes authorization values and XML bodies from transport errors', async () => {
    const provider = new MockCertificateProvider(async () => {
      throw new Error('Authorization: Bearer segredo <NFSe>conteudo fiscal</NFSe>');
    });

    const operation = provider.executeHttpRequest(request());

    await expect(operation).rejects.not.toThrow(/segredo|conteudo fiscal/);
    await expect(operation).rejects.toThrow('Falha no transporte HTTPS autenticado');
  });
});
