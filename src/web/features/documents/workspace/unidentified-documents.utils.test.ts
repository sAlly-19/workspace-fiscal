import { describe, it, expect } from 'vitest';
import { isUnidentifiedDocument, countUnidentifiedDocuments } from './unidentified-documents.utils';

describe('unidentified-documents.utils', () => {
  it('retorna true para notas com S/N, Não Informado e valor zerado', () => {
    const doc = {
      number: null,
      issuerName: null,
      totalAmount: 0,
      type: 'NFSE',
    };
    expect(isUnidentifiedDocument(doc)).toBe(true);
  });

  it('retorna true para notas com number="S/N" e issuerName="Não Informado"', () => {
    const doc = {
      number: 'S/N',
      issuerName: 'Não Informado',
      totalAmount: 0,
      type: 'NFE',
    };
    expect(isUnidentifiedDocument(doc)).toBe(true);
  });

  it('retorna true para notas do tipo UNKNOWN sem número', () => {
    const doc = {
      number: '',
      issuerName: 'Qualquer',
      totalAmount: 100,
      type: 'UNKNOWN',
    };
    expect(isUnidentifiedDocument(doc)).toBe(true);
  });

  it('retorna false para nota fiscal regular com número e emitente', () => {
    const doc = {
      number: '1467',
      issuerName: 'EMPRESA EXEMPLO LTDA',
      totalAmount: 5200.5,
      type: 'NFE',
    };
    expect(isUnidentifiedDocument(doc)).toBe(false);
  });

  it('retorna false para nota fiscal com número mas valor zero (ex: bonificação/inutilização identificada)', () => {
    const doc = {
      number: '10',
      issuerName: 'EMPRESA EXEMPLO LTDA',
      totalAmount: 0,
      type: 'NFE',
    };
    expect(isUnidentifiedDocument(doc)).toBe(false);
  });

  it('retorna false para nota com número "1" e emitente "Inutilização NFE (52)"', () => {
    const doc = {
      number: '1',
      issuerName: 'Inutilização NFE (52)',
      totalAmount: 0,
      type: 'NFE',
    };
    expect(isUnidentifiedDocument(doc)).toBe(false);
  });

  it('countUnidentifiedDocuments conta corretamente o número de documentos', () => {
    const docs = [
      { number: '100', issuerName: 'Fornecedor A', totalAmount: 50 },
      { number: null, issuerName: null, totalAmount: 0 },
      { number: 'S/N', issuerName: 'Não Informado', totalAmount: 0 },
      { number: '200', issuerName: 'Fornecedor B', totalAmount: 0 },
    ];
    expect(countUnidentifiedDocuments(docs)).toBe(2);
  });
});
