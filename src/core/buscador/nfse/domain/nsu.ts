import { NfseDocumentError } from './errors';

export type NfseNsuInput = string | number | bigint;

export function normalizeNfseNsu(value: NfseNsuInput): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new NfseDocumentError('O NSU da NFS-e deve ser um inteiro decimal não negativo.');
    }
  }

  const rawValue = String(value).trim();
  if (!/^\d+$/.test(rawValue)) {
    throw new NfseDocumentError('O NSU da NFS-e deve ser um inteiro decimal não negativo.');
  }

  return BigInt(rawValue).toString();
}

export function compareNfseNsu(left: NfseNsuInput, right: NfseNsuInput): number {
  const normalizedLeft = BigInt(normalizeNfseNsu(left));
  const normalizedRight = BigInt(normalizeNfseNsu(right));

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}
