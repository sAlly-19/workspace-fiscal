/**
 * Determina se um documento é considerado "não identificado / sem número (S/N)".
 * Exemplos típicos:
 * - Eventos de NFS-e (cancelamentos/substituições sem cabeçalho completo de nota)
 * - Inutilizações sem metadados fiscais de emissão
 * - Arquivos corrompidos ou com campos vazios (Nº S/N, Não Informado, R$ 0,00)
 */
export function isUnidentifiedDocument(doc: {
  number?: string | null;
  issuerName?: string | null;
  totalAmount?: number | null | string;
  type?: string | null;
}): boolean {
  if (!doc) return false;

  const num = (doc.number || '').trim().toUpperCase();
  const hasNoNumber = !num || num === 'S/N' || num === 'SEM NUMERO' || num === 'SN';

  const issuer = (doc.issuerName || '').trim().toLowerCase();
  const hasNoIssuer = !issuer || issuer.includes('não informado') || issuer.includes('nao informado');

  const amount = Number(doc.totalAmount || 0);
  const hasZeroAmount = isNaN(amount) || amount === 0;

  const isUnknownType = (doc.type || '').toUpperCase() === 'UNKNOWN';

  // É considerado não identificado se não possuir número de nota válido E
  // (não possuir emitente informado OU possuir valor zerado/inválido OU for do tipo UNKNOWN)
  return hasNoNumber && (hasNoIssuer || hasZeroAmount || isUnknownType);
}

/**
 * Retorna o número de documentos não identificados em uma coleção.
 */
export function countUnidentifiedDocuments(docs: any[]): number {
  if (!Array.isArray(docs)) return 0;
  let count = 0;
  for (let i = 0; i < docs.length; i++) {
    if (isUnidentifiedDocument(docs[i])) {
      count++;
    }
  }
  return count;
}
