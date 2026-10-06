export class NfseDocumentError extends Error {
  readonly code = 'NFSE_DOCUMENT_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'NfseDocumentError';
  }
}

export class NfseCertificateError extends Error {
  readonly code = 'NFSE_CERTIFICATE_ERROR';
  constructor(message: string) { super(message); this.name = 'NfseCertificateError'; }
}

export class NfseTlsError extends Error {
  readonly code = 'NFSE_TLS_ERROR';
  constructor(message: string) { super(message); this.name = 'NfseTlsError'; }
}

export class NfseHttpError extends Error {
  readonly code = 'NFSE_HTTP_ERROR';
  constructor(
    public readonly statusCode: number,
    public readonly retryAfter?: string
  ) {
    super(`A API NFS-e respondeu com HTTP ${statusCode}.`);
    this.name = 'NfseHttpError';
  }
}

export class NfseContractError extends Error {
  readonly code = 'NFSE_CONTRACT_ERROR';
  constructor(message: string) { super(message); this.name = 'NfseContractError'; }
}

export class NfsePersistenceError extends Error {
  readonly code = 'NFSE_PERSISTENCE_ERROR';
  constructor(message: string) { super(message); this.name = 'NfsePersistenceError'; }
}
