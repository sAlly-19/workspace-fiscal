import type { NfseDistributionBatch, NfseDistributedPayload, NfseEnvironment } from '../domain/types';

export interface NfseRequestContext {
  environment: NfseEnvironment;
  thumbprint: string;
  signal?: AbortSignal;
}

export interface NfseDistributionInput extends NfseRequestContext {
  cnpj: string;
  lastNsu: string;
}

export interface NfseKeyQueryInput extends NfseRequestContext {
  accessKey: string;
}

export interface NfseWireRequest {
  path: string;
  headers: Record<string, string>;
}

/**
 * Isolates every wire detail not confirmed by the public manuals.
 * See design spec section 4.3. Do not implement a production contract from guesses:
 * it requires the official OpenAPI or an anonymized real response.
 */
export interface NfseWireContract {
  buildDistributionRequest(input: NfseDistributionInput): NfseWireRequest;
  buildDocumentRequest(input: NfseKeyQueryInput): NfseWireRequest;
  buildEventsRequest(input: NfseKeyQueryInput): NfseWireRequest;
  decodeDistribution(body: string, headers: Readonly<Record<string, string>>): NfseDistributionBatch;
  decodeDocument(body: string, headers: Readonly<Record<string, string>>): NfseDistributedPayload;
  decodeEvents(body: string, headers: Readonly<Record<string, string>>): NfseDistributedPayload[];
}
