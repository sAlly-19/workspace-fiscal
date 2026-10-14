/**
 * Converte valores fiscais em números com suporte a formatos internacionais (XML padrão)
 * e formatos brasileiros com vírgula decimal.
 * 
 * Regra: Só remove pontos (.) como separador de milhar quando houver vírgula (,) na string,
 * garantindo que "1234.56" seja convertido para 1234.56 e "1.234,56" para 1234.56.
 */
export function parseFiscalNumber(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;

  const original = String(val).trim();
  if (!original) return 0;

  // Se contiver vírgula, trata como formato brasileiro (onde ponto é milhar e vírgula é decimal)
  if (original.includes(',')) {
    const normalized = original.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // Padrão XML internacional (ponto é decimal, não há vírgula)
  const parsed = parseFloat(original);
  return Number.isNaN(parsed) ? 0 : parsed;
}
