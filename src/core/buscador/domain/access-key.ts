/**
 * Utilitários para validação e decomposição da Chave de Acesso DFe (44 caracteres)
 * Padrão Nacional: [cUF: 2][AAMM: 4][CNPJ: 14][mod: 2][serie: 3][nNF: 9][tpEmis: 1][cNF: 8][cDV: 1]
 * Suporta o formato tradicional numérico e CNPJ alfanumérico da IN RFB 2.229/2024 / RTC 2026.
 * Salvaguarda estrita: Caracteres alfanuméricos são permitidos unicamente nas posições do CNPJ (índices 6 a 17).
 */

export interface ParsedAccessKey {
  cUF: string;
  anoMes: string;
  cnpj: string;
  modelo: string;
  serie: string;
  numero: string;
  tipoEmissao: string;
  codigoNumerico: string;
  dv: string;
}

/**
 * Remove espaços e pontuação, convertendo caracteres para maiúsculas
 */
export function sanitizeAccessKey(key: string): string {
  if (!key) return '';
  return key.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Validação posicional estrita da Chave de Acesso:
 * - Total de 44 caracteres
 * - Índices 0..5 (cUF e AAMM): estritamente numéricos (\d{6})
 * - Índices 6..17 (Raiz e Ordem do CNPJ): alfanuméricos ([A-Z0-9]{12})
 * - Índices 18..43 (DVs CNPJ, mod, serie, nNF, tpEmis, cNF, cDV): estritamente numéricos (\d{26})
 * - Módulo 11 com pesos de 2 a 9 da direita para a esquerda sobre os primeiros 43 caracteres.
 */
export function isValidAccessKey(key: string): boolean {
  const clean = sanitizeAccessKey(key);
  if (clean.length !== 44) return false;

  // Validação posicional estrita: letras apenas nas posições do CNPJ raiz/ordem (índices 6 a 17)
  if (!/^(\d{6})([A-Z0-9]{12})(\d{26})$/.test(clean)) {
    return false;
  }

  // Validação do dígito verificador (módulo 11 ponderado de 2 a 9 da direita para a esquerda)
  const base = clean.substring(0, 43);
  let weight = 2;
  let sum = 0;

  for (let i = base.length - 1; i >= 0; i--) {
    const val = base.charCodeAt(i) - 48;
    sum += val * weight;
    weight++;
    if (weight > 9) weight = 2;
  }

  const remainder = sum % 11;
  const calculatedDV = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;

  return calculatedDV === Number(clean[43]);
}

export function parseAccessKey(key: string): ParsedAccessKey | null {
  const clean = sanitizeAccessKey(key);
  if (clean.length !== 44) return null;

  if (!/^(\d{6})([A-Z0-9]{12})(\d{26})$/.test(clean)) {
    return null;
  }

  return {
    cUF: clean.substring(0, 2),
    anoMes: clean.substring(2, 6),
    cnpj: clean.substring(6, 20),
    modelo: clean.substring(20, 22),
    serie: clean.substring(22, 25),
    numero: clean.substring(25, 34),
    tipoEmissao: clean.substring(34, 35),
    codigoNumerico: clean.substring(35, 43),
    dv: clean.substring(43, 44),
  };
}

export function formatAccessKey(key: string): string {
  const clean = sanitizeAccessKey(key);
  if (clean.length !== 44) return key;
  return clean.replace(/([A-Z0-9]{4})/g, '$1 ').trim();
}
