export class NfseDocumentError extends Error {
  readonly code = 'NFSE_DOCUMENT_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'NfseDocumentError';
  }
}
