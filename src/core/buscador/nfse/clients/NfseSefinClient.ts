import type { ICertificateProvider } from '../../certificates/ICertificateProvider';
import { getNfseEndpoints } from '../config/endpoints';
import { normalizeNfseAccessKey } from '../domain/access-key';
import type { NfseDistributedPayload } from '../domain/types';
import { executeNfseRequest } from './client-utils';
import { NfseRetryPolicy } from './NfseRetryPolicy';
import type { NfseKeyQueryInput, NfseWireContract } from './NfseWireContract';

export class NfseSefinClient {
  constructor(
    private readonly provider: ICertificateProvider,
    private readonly contract: NfseWireContract,
    private readonly retryPolicy = new NfseRetryPolicy()
  ) {}

  public async consultByKey(input: NfseKeyQueryInput): Promise<NfseDistributedPayload> {
    const normalized = { ...input, accessKey: normalizeNfseAccessKey(input.accessKey) };
    const wireRequest = this.contract.buildDocumentRequest(normalized);
    const response = await executeNfseRequest(
      this.provider,
      this.retryPolicy,
      getNfseEndpoints(input.environment).sefinBaseUrl,
      wireRequest,
      normalized
    );
    return this.contract.decodeDocument(response.responseBody, response.responseHeaders);
  }
}
