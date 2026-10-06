import type { ICertificateProvider } from '../../certificates/ICertificateProvider';
import { getNfseEndpoints } from '../config/endpoints';
import { NfseDocumentError } from '../domain/errors';
import type { NfseDistributionBatch, NfseDistributedPayload } from '../domain/types';
import { normalizeNfseAccessKey } from '../domain/access-key';
import { normalizeNfseNsu } from '../domain/nsu';
import { executeNfseRequest } from './client-utils';
import { NfseRetryPolicy } from './NfseRetryPolicy';
import type { NfseDistributionInput, NfseKeyQueryInput, NfseWireContract } from './NfseWireContract';

export class NfseAdnClient {
  constructor(
    private readonly provider: ICertificateProvider,
    private readonly contract: NfseWireContract,
    private readonly retryPolicy = new NfseRetryPolicy()
  ) {}

  public async distribute(input: NfseDistributionInput): Promise<NfseDistributionBatch> {
    const normalized: NfseDistributionInput = {
      ...input,
      cnpj: normalizeCnpj(input.cnpj),
      lastNsu: normalizeNfseNsu(input.lastNsu),
    };
    const wireRequest = this.contract.buildDistributionRequest(normalized);
    const response = await executeNfseRequest(
      this.provider,
      this.retryPolicy,
      getNfseEndpoints(input.environment).adnBaseUrl,
      wireRequest,
      normalized
    );
    return this.contract.decodeDistribution(response.responseBody, response.responseHeaders);
  }

  public async consultEvents(input: NfseKeyQueryInput): Promise<NfseDistributedPayload[]> {
    const normalized = { ...input, accessKey: normalizeNfseAccessKey(input.accessKey) };
    const wireRequest = this.contract.buildEventsRequest(normalized);
    const response = await executeNfseRequest(
      this.provider,
      this.retryPolicy,
      getNfseEndpoints(input.environment).adnBaseUrl,
      wireRequest,
      normalized
    );
    return this.contract.decodeEvents(response.responseBody, response.responseHeaders);
  }
}

function normalizeCnpj(value: string): string {
  const digits = value.replace(/[.\/-]/g, '');
  if (!/^\d{14}$/.test(digits)) throw new NfseDocumentError('O CNPJ da consulta NFS-e deve conter 14 dígitos.');
  return digits;
}
