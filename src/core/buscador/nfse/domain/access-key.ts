import { NfseDocumentError } from './errors';

const PRESENTATION_CHARACTERS = /[\s./-]/g;
const NFSE_ACCESS_KEY_LENGTH = 50;

export function normalizeNfseAccessKey(value: string): string {
  const normalized = value.replace(PRESENTATION_CHARACTERS, '');

  if (!/^\d+$/.test(normalized) || normalized.length !== NFSE_ACCESS_KEY_LENGTH) {
    throw new NfseDocumentError('A chave de acesso da NFS-e deve conter exatamente 50 dígitos.');
  }

  return normalized;
}
