import { ValidationResult } from './types';

export interface MonthlyDepreciationQueryParams {
  companyId: string;
  competence: string;
}

export interface ExportDepreciationInput {
  companyId: string;
  competence: string;
  separator?: ';' | ',';
  numericFormat?: 'BRL' | 'RAW';
  dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  columns?: any;
  force?: boolean;
}

const COMPETENCE_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function validateMonthlyDepreciationQuery(query: unknown): ValidationResult<MonthlyDepreciationQueryParams> {
  const errors: string[] = [];

  if (!query || typeof query !== 'object') {
    return { success: false, errors: ['Query parameters devem ser informados'] };
  }

  const q = query as Record<string, any>;

  if (!q.companyId || typeof q.companyId !== 'string' || !q.companyId.trim()) {
    errors.push('companyId é obrigatório');
  }

  if (!q.competence || typeof q.competence !== 'string' || !q.competence.trim()) {
    errors.push('competence é obrigatória (formato YYYY-MM)');
  } else if (!COMPETENCE_REGEX.test(q.competence.trim())) {
    errors.push(`Competência '${q.competence}' inválida. Use o formato YYYY-MM com mês válido (01 a 12)`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      companyId: String(q.companyId).trim(),
      competence: String(q.competence).trim(),
    },
  };
}

export function validateExportDepreciationInput(body: unknown): ValidationResult<ExportDepreciationInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;

  if (!b.companyId || typeof b.companyId !== 'string' || !b.companyId.trim()) {
    errors.push('companyId é obrigatório');
  }

  if (!b.competence || typeof b.competence !== 'string' || !b.competence.trim()) {
    errors.push('competence é obrigatória');
  } else if (!COMPETENCE_REGEX.test(b.competence.trim())) {
    errors.push(`Competência '${b.competence}' inválida. Use o formato YYYY-MM com mês válido (01 a 12)`);
  }

  if (b.separator !== undefined && b.separator !== null && ![';', ','].includes(b.separator)) {
    errors.push("Separador de CSV inválido. Valores aceitos: ';' ou ','");
  }

  if (b.numericFormat !== undefined && b.numericFormat !== null && !['BRL', 'RAW'].includes(b.numericFormat)) {
    errors.push("Formato numérico inválido. Valores aceitos: 'BRL' ou 'RAW'");
  }

  if (b.dateFormat !== undefined && b.dateFormat !== null && !['DD/MM/YYYY', 'YYYY-MM-DD'].includes(b.dateFormat)) {
    errors.push("Formato de data inválido. Valores aceitos: 'DD/MM/YYYY' ou 'YYYY-MM-DD'");
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      companyId: String(b.companyId).trim(),
      competence: String(b.competence).trim(),
      separator: b.separator,
      numericFormat: b.numericFormat,
      dateFormat: b.dateFormat,
      columns: b.columns,
      force: Boolean(b.force),
    },
  };
}
