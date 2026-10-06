import { describe, expect, it } from 'vitest';
import { getNfseEndpoints } from '../config/endpoints';
import { NfseDocumentError } from './errors';
import { normalizeNfseAccessKey } from './access-key';
import { compareNfseNsu, normalizeNfseNsu } from './nsu';

const VALID_KEY = '12345678901234567890123456789012345678901234567890';

describe('normalizeNfseAccessKey', () => {
  it('accepts exactly 50 digits', () => {
    expect(normalizeNfseAccessKey(VALID_KEY)).toBe(VALID_KEY);
  });

  it('removes only presentation punctuation and whitespace', () => {
    const formatted = '12345.67890 12345/67890-12345.67890 12345/67890-12345.67890';

    expect(normalizeNfseAccessKey(formatted)).toBe(VALID_KEY);
  });

  it.each([
    ['44 digits', '1'.repeat(44)],
    ['51 digits', '1'.repeat(51)],
    ['XML NFS prefix', `NFS${VALID_KEY}`],
    ['internal letter', `${VALID_KEY.slice(0, 25)}A${VALID_KEY.slice(26)}`],
    ['empty value', ''],
  ])('rejects %s', (_case, value) => {
    expect(() => normalizeNfseAccessKey(value)).toThrow(NfseDocumentError);
  });
});

describe('NFS-e NSU', () => {
  it.each([
    ['000000', '0'],
    ['000123', '123'],
    ['987654321098765432109876543210', '987654321098765432109876543210'],
    [42n, '42'],
  ])('normalizes %s without a fixed width', (value, expected) => {
    expect(normalizeNfseNsu(value)).toBe(expected);
  });

  it('compares values larger than Number.MAX_SAFE_INTEGER', () => {
    expect(compareNfseNsu('900719925474099312345', '900719925474099312346')).toBe(-1);
    expect(compareNfseNsu('900719925474099312346', '900719925474099312345')).toBe(1);
    expect(compareNfseNsu('00042', '42')).toBe(0);
  });

  it.each(['', '-1', '1.5', '12A'])('rejects an invalid decimal NSU: %s', (value) => {
    expect(() => normalizeNfseNsu(value)).toThrow(NfseDocumentError);
  });
});

describe('getNfseEndpoints', () => {
  it('returns the official production bases', () => {
    expect(getNfseEndpoints('production')).toEqual({
      adnBaseUrl: 'https://adn.nfse.gov.br/contribuintes',
      sefinBaseUrl: 'https://sefin.nfse.gov.br/SefinNacional',
    });
  });

  it('returns the official restricted-production bases for homologation', () => {
    expect(getNfseEndpoints('homologation')).toEqual({
      adnBaseUrl: 'https://adn.producaorestrita.nfse.gov.br/contribuintes',
      sefinBaseUrl: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
    });
  });
});
