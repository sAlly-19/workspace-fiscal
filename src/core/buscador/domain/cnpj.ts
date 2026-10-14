/**
 * Utilitários de Validação e Formatação de CNPJ de acordo com a Receita Federal do Brasil
 * Suporta o formato tradicional numérico e o novo formato alfanumérico (IN RFB nº 2.229/2024)
 */

/**
 * Remove caracteres de pontuação do CNPJ, mantendo alfanuméricos em caixa alta
 */
export function sanitizeCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  return cnpj.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Formata CNPJ de 14 caracteres para visualização: XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string): string {
  const digits = sanitizeCNPJ(cnpj);
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([0-9]{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Validação dos dígitos verificadores do CNPJ (algoritmo Módulo 11 unificado)
 * Para dígitos '0'..'9', (ascii - 48) resulta exatamente no valor numérico 0..9.
 * Para letras 'A'..'Z', (ascii - 48) resulta em 17..42 (conforme IN RFB nº 2.229/2024).
 * Os 2 dígitos verificadores finais DEVEM ser estritamente numéricos (/^[A-Z0-9]{12}[0-9]{2}$/).
 */
export function isValidCNPJ(cnpj: string, options?: { allowSynthetic?: boolean }): boolean {
  const digits = sanitizeCNPJ(cnpj);

  if (digits.length !== 14) {
    return false;
  }

  // Validação posicional estrita da IN RFB 2.229/2024:
  // Primeiros 12 caracteres alfanuméricos, últimos 2 estritamente numéricos
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(digits)) {
    return false;
  }

  if (options?.allowSynthetic) {
    return true;
  }

  // Elimina sequências de caracteres repetidos (ex: 14 '1's ou 14 'A's)
  if (/^([A-Z0-9])\1{13}$/.test(digits)) {
    return false;
  }

  // Validação do 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    const val = digits.charCodeAt(i) - 48;
    sum1 += val * weights1[i];
  }

  const remainder1 = sum1 % 11;
  const dv1 = remainder1 < 2 ? 0 : 11 - remainder1;
  if (dv1 !== Number(digits.charAt(12))) {
    return false;
  }

  // Validação do 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    const val = digits.charCodeAt(i) - 48;
    sum2 += val * weights2[i];
  }

  const remainder2 = sum2 % 11;
  const dv2 = remainder2 < 2 ? 0 : 11 - remainder2;
  if (dv2 !== Number(digits.charAt(13))) {
    return false;
  }

  return true;
}
