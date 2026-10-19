export interface CompanyParticipant {
  name: string;
  document: string;
  cleanDocument: string;
  state?: string;
  city?: string;
}

export interface MatchedCompanyResult {
  company: {
    id: string;
    name: string;
    cnpj?: string | null;
    document?: string | null;
  };
  source: 'DESTINATARIO' | 'EMITENTE';
  badgeText: string;
}

export interface ExtractedItem {
  itemIndex: number;
  code: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  totalPriceCents?: number;
  ncm: string | null;
}

/**
 * Normaliza CNPJ ou CPF mantendo apenas dígitos numéricos.
 */
export function sanitizeDocDigits(doc: string | null | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

/**
 * Compara CNPJs de Destinatário (Prioridade 1) e Emitente (Prioridade 2)
 * com a lista de empresas cadastradas no módulo de Depreciação.
 */
export function matchCompanyByPriority(
  registeredCompanies: Array<{ id: string; name: string; cnpj?: string | null; document?: string | null }>,
  destinatario?: CompanyParticipant | null,
  emitente?: CompanyParticipant | null
): MatchedCompanyResult | null {
  if (!registeredCompanies || registeredCompanies.length === 0) return null;

  const destClean = sanitizeDocDigits(destinatario?.cleanDocument || destinatario?.document);
  const emitClean = sanitizeDocDigits(emitente?.cleanDocument || emitente?.document);

  // Prioridade 1: Destinatário / Tomador
  if (destClean) {
    const foundDest = registeredCompanies.find((c) => {
      const cCnpj = sanitizeDocDigits(c.cnpj || c.document);
      return cCnpj && cCnpj === destClean;
    });

    if (foundDest) {
      return {
        company: foundDest,
        source: 'DESTINATARIO',
        badgeText: '✨ Sugerida automaticamente pelo CNPJ do Destinatário',
      };
    }
  }

  // Prioridade 2: Emitente / Remetente
  if (emitClean) {
    const foundEmit = registeredCompanies.find((c) => {
      const cCnpj = sanitizeDocDigits(c.cnpj || c.document);
      return cCnpj && cCnpj === emitClean;
    });

    if (foundEmit) {
      return {
        company: foundEmit,
        source: 'EMITENTE',
        badgeText: '✨ Sugerida automaticamente pelo CNPJ do Emitente',
      };
    }
  }

  return null;
}

/**
 * Gera código/plaqueta sugerida: IMOB-{numeroNota}-{nItem}
 */
export function getSuggestedPlaque(invoiceNumber: string | null | undefined, itemIndex: number): string {
  const num = (invoiceNumber || '').trim() || '0';
  return `IMOB-${num}-${itemIndex}`;
}

/**
 * Formata valor numérico para string no padrão brasileiro: 4500.5 -> "4500,50"
 */
export function formatBrlValue(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return val.toFixed(2).replace('.', ',');
}

/**
 * Faz parse de string de valor monetário (R$ 1.250,50 ou 1250,50) para centavos.
 */
export function parseBrlInputToCents(val: string): number {
  if (!val) return 0;
  // Remove "R$", espaços, pontos de milhar e substitui vírgula por ponto
  const clean = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Extrai dados pré-preenchidos a partir de um item específico da nota.
 */
export function extractItemPreFill(item: ExtractedItem, invoiceNumber: string | null | undefined) {
  return {
    description: item.description || '',
    acquisitionValueFormatted: formatBrlValue(item.totalPrice),
    ncm: item.ncm || '',
    code: getSuggestedPlaque(invoiceNumber, item.itemIndex),
  };
}
