import { parseFiscalNumber } from '../utils/xml-number.utils';

export function parseCteNumber(val: any): number {
  return parseFiscalNumber(val);
}
