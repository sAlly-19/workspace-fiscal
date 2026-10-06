import { describe, expect, it } from 'vitest';
import { MockCertificateProvider } from '../../certificates/MockCertificateProvider';
import type { HttpExecutionResult } from '../../certificates/ICertificateProvider';
import type { NfseDistributionBatch, NfseDistributedPayload } from '../domain/types';
import { NfseContractError, NfseHttpError } from '../domain/errors';
import { NfseAdnClient } from './NfseAdnClient';
import { NfseSefinClient } from './NfseSefinClient';
import type {
  NfseDistributionInput,
  NfseKeyQueryInput,
  NfseWireContract,
  NfseWireRequest,
} from './NfseWireContract';
import { UnavailableNfseWireContract } from './UnavailableNfseWireContract';

const THUMBPRINT = 'E22923C34166FC304A236F6EECF2CB0F6F0AE0BF';
const KEY = '12345678901234567890123456789012345678901234567890';

class ConfirmedFixtureContract implements NfseWireContract {
  buildDistributionRequest(input: NfseDistributionInput): NfseWireRequest {
    return { path: `/DFe/${input.lastNsu}`, headers: { Accept: 'application/json' } };
  }

  buildDocumentRequest(input: NfseKeyQueryInput): NfseWireRequest {
    return { path: `/nfse/${input.accessKey}`, headers: { Accept: 'application/json' } };
  }

  buildEventsRequest(input: NfseKeyQueryInput): NfseWireRequest {
    return { path: `/NFSe/${input.accessKey}/Eventos`, headers: { Accept: 'application/json' } };
  }

  decodeDistribution(body: string): NfseDistributionBatch {
    return {
      status: 'NO_DOCUMENTS',
      lastNsu: '0',
      maxNsu: '0',
      documents: [],
      message: JSON.parse(body).url,
    };
  }

  decodeDocument(body: string): NfseDistributedPayload {
    return { kind: 'NFSE', schemaType: 'NFSe_v1.01', xml: JSON.parse(body).url, accessKey: KEY };
  }

  decodeEvents(body: string): NfseDistributedPayload[] {
    return [{ kind: 'EVENT', schemaType: 'evento_v1.01', xml: JSON.parse(body).url, accessKey: KEY }];
  }
}

function echoProvider(onCall?: () => void): MockCertificateProvider {
  return new MockCertificateProvider(async (request): Promise<HttpExecutionResult> => {
    onCall?.();
    return {
      statusCode: 200,
      responseBody: JSON.stringify({ url: request.url }),
      responseHeaders: { 'content-type': 'application/json' },
    };
  });
}

describe('NFS-e official clients', () => {
  it('uses the confirmed ADN production distribution path', async () => {
    const client = new NfseAdnClient(echoProvider(), new ConfirmedFixtureContract());

    const result = await client.distribute({
      cnpj: '12345678000190',
      lastNsu: '15',
      environment: 'production',
      thumbprint: THUMBPRINT,
    });

    expect(result.message).toBe('https://adn.nfse.gov.br/contribuintes/DFe/15');
  });

  it('uses the confirmed ADN restricted-production events path', async () => {
    const client = new NfseAdnClient(echoProvider(), new ConfirmedFixtureContract());

    const result = await client.consultEvents({
      accessKey: KEY,
      environment: 'homologation',
      thumbprint: THUMBPRINT,
    });

    expect(result[0].xml).toBe(
      `https://adn.producaorestrita.nfse.gov.br/contribuintes/NFSe/${KEY}/Eventos`
    );
  });

  it('uses the confirmed SEFIN production direct-query path', async () => {
    const client = new NfseSefinClient(echoProvider(), new ConfirmedFixtureContract());

    const result = await client.consultByKey({
      accessKey: KEY,
      environment: 'production',
      thumbprint: THUMBPRINT,
    });

    expect(result.xml).toBe(`https://sefin.nfse.gov.br/SefinNacional/nfse/${KEY}`);
  });

  it('fails at the unavailable contract gate before any network call', async () => {
    let calls = 0;
    const provider = echoProvider(() => { calls += 1; });
    const contract = new UnavailableNfseWireContract();
    const adn = new NfseAdnClient(provider, contract);
    const sefin = new NfseSefinClient(provider, contract);

    await expect(adn.distribute({
      cnpj: '12345678000190', lastNsu: '0', environment: 'homologation', thumbprint: THUMBPRINT,
    })).rejects.toThrow(NfseContractError);
    await expect(adn.consultEvents({
      accessKey: KEY, environment: 'homologation', thumbprint: THUMBPRINT,
    })).rejects.toThrow('OpenAPI oficial ou uma resposta real anonimizada');
    await expect(sefin.consultByKey({
      accessKey: KEY, environment: 'homologation', thumbprint: THUMBPRINT,
    })).rejects.toThrow(NfseContractError);
    expect(calls).toBe(0);
  });

  it('maps a non-success response without exposing its body', async () => {
    const provider = new MockCertificateProvider(async () => ({
      statusCode: 403,
      responseBody: '<NFSe>conteúdo sensível</NFSe>',
      responseHeaders: {},
    }));
    const client = new NfseSefinClient(provider, new ConfirmedFixtureContract());

    const operation = client.consultByKey({
      accessKey: KEY, environment: 'production', thumbprint: THUMBPRINT,
    });

    await expect(operation).rejects.toBeInstanceOf(NfseHttpError);
    await expect(operation).rejects.not.toThrow('conteúdo sensível');
  });
});
