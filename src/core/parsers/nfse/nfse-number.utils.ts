import { parseFiscalNumber } from '../utils/xml-number.utils';

export function parseNfseNumber(val: any): number {
  return parseFiscalNumber(val);
}
