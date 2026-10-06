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

export interface NfseEvent {
  id: number;
  company_id: number;
  document_id?: number;
  environment: NfseEnvironment;
  access_key: string;
  nsu?: string;
  event_identifier?: string;
  event_type: string;
  event_sequence?: number;
  event_date?: string;
  schema_type: string;
  xml_path: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}
