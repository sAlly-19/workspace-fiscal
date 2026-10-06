export type NfseEnvironment = 'homologation' | 'production';

export type NfsePayloadKind = 'NFSE' | 'EVENT';

export type DocumentOrigin =
  | 'SEFAZ_DISTRIBUTION'
  | 'NFSE_ADN_DISTRIBUTION'
  | 'NFSE_SEFIN_DIRECT';

export interface NfseDistributedPayload {
  nsu?: string;
  kind: NfsePayloadKind;
  schemaType: string;
  xml: string;
  accessKey?: string;
  generatedAt?: string;
}

export interface NfseDistributionBatch {
  status: 'DOCUMENTS_FOUND' | 'NO_DOCUMENTS' | 'REJECTED';
  lastNsu: string;
  maxNsu: string;
  documents: NfseDistributedPayload[];
  retryAfter?: string;
  message?: string;
}
