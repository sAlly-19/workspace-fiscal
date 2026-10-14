import { isValidCNPJ, sanitizeCNPJ } from '../../core/buscador/domain/cnpj';
import { BRAZILIAN_UFS, ValidationResult } from './types';

export interface CreateCompanyInput {
  name: string;
  tradeName?: string;
  document?: string;
  cnpj?: string;
  state?: string;
  city?: string;
  depreciationRule?: 'MONTH_OF_ACQUISITION' | 'NEXT_MONTH' | 'PROPORTIONAL';
}

export interface UpdateCompanyInput {
  name?: string;
  tradeName?: string;
  document?: string;
  cnpj?: string;
  state?: string;
  city?: string;
  depreciationRule?: 'MONTH_OF_ACQUISITION' | 'NEXT_MONTH' | 'PROPORTIONAL';
}

export interface CompanyValidationOptions {
  allowSynthetic?: boolean;
}

export function validateCreateCompany(
  body: unknown,
  options?: CompanyValidationOptions
): ValidationResult<CreateCompanyInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;

  // Razão social obrigatória
  if (typeof b.name !== 'string' || !b.name.trim()) {
    errors.push('Razão social é obrigatória');
  } else if (b.name.trim().length > 255) {
    errors.push('Razão social deve ter no máximo 255 caracteres');
  }

  // Nome fantasia opcional
  if (b.tradeName !== undefined && b.tradeName !== null && typeof b.tradeName === 'string' && b.tradeName.length > 255) {
    errors.push('Nome fantasia deve ter no máximo 255 caracteres');
  }

  // Documento / CNPJ
  const rawDoc = b.document || b.cnpj;
  let cleanCnpj: string | undefined;

  if (rawDoc !== undefined && rawDoc !== null && String(rawDoc).trim() !== '') {
    const clean = sanitizeCNPJ(String(rawDoc));
    if (clean.length !== 14) {
      errors.push('CNPJ deve conter exatamente 14 dígitos numéricos');
    } else {
      const allowSynthetic = options?.allowSynthetic || process.env.ALLOW_SYNTHETIC_CNPJ === 'true';
      if (!allowSynthetic && !isValidCNPJ(clean)) {
        errors.push('CNPJ inválido: dígitos verificadores incorretos segundo as regras da Receita Federal');
      } else {
        cleanCnpj = clean;
      }
    }
  }

  // UF / Estado
  const rawState = b.state || b.uf;
  let stateUf: string | null = null;
  if (rawState !== undefined && rawState !== null && String(rawState).trim() !== '') {
    const ufUpper = String(rawState).trim().toUpperCase();
    if (!BRAZILIAN_UFS.has(ufUpper)) {
      errors.push(`Estado/UF inválido ('${rawState}'). Deve ser uma das 27 UFs brasileiras`);
    } else {
      stateUf = ufUpper;
    }
  }

  // Regra de depreciação
  const validRules = ['MONTH_OF_ACQUISITION', 'NEXT_MONTH', 'PROPORTIONAL'];
  if (b.depreciationRule !== undefined && b.depreciationRule !== null && !validRules.includes(b.depreciationRule)) {
    errors.push(`Regra de depreciação inválida. Valores aceitos: ${validRules.join(', ')}`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: b.name.trim(),
      tradeName: b.tradeName ? String(b.tradeName).trim() : undefined,
      document: cleanCnpj,
      cnpj: cleanCnpj,
      state: stateUf || undefined,
      city: b.city ? String(b.city).trim() : undefined,
      depreciationRule: b.depreciationRule,
    },
  };
}

export function validateUpdateCompany(
  body: unknown,
  options?: CompanyValidationOptions
): ValidationResult<UpdateCompanyInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;
  const data: UpdateCompanyInput = {};

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) {
      errors.push('Razão social não pode ser vazia');
    } else if (b.name.trim().length > 255) {
      errors.push('Razão social deve ter no máximo 255 caracteres');
    } else {
      data.name = b.name.trim();
    }
  }

  if (b.tradeName !== undefined) {
    data.tradeName = b.tradeName ? String(b.tradeName).trim() : undefined;
  }

  const rawDoc = b.document !== undefined ? b.document : b.cnpj;
  if (rawDoc !== undefined && rawDoc !== null && String(rawDoc).trim() !== '') {
    const clean = sanitizeCNPJ(String(rawDoc));
    if (clean.length !== 14) {
      errors.push('CNPJ deve conter exatamente 14 dígitos numéricos');
    } else {
      const allowSynthetic = options?.allowSynthetic || process.env.ALLOW_SYNTHETIC_CNPJ === 'true';
      if (!allowSynthetic && !isValidCNPJ(clean)) {
        errors.push('CNPJ inválido: dígitos verificadores incorretos segundo as regras da Receita Federal');
      } else {
        data.cnpj = clean;
        data.document = clean;
      }
    }
  }

  const rawState = b.state !== undefined ? b.state : b.uf;
  if (rawState !== undefined && rawState !== null && String(rawState).trim() !== '') {
    const ufUpper = String(rawState).trim().toUpperCase();
    if (!BRAZILIAN_UFS.has(ufUpper)) {
      errors.push(`Estado/UF inválido ('${rawState}'). Deve ser uma das 27 UFs brasileiras`);
    } else {
      data.state = ufUpper;
    }
  }

  const validRules = ['MONTH_OF_ACQUISITION', 'NEXT_MONTH', 'PROPORTIONAL'];
  if (b.depreciationRule !== undefined && b.depreciationRule !== null) {
    if (!validRules.includes(b.depreciationRule)) {
      errors.push(`Regra de depreciação inválida. Valores aceitos: ${validRules.join(', ')}`);
    } else {
      data.depreciationRule = b.depreciationRule;
    }
  }

  if (b.city !== undefined) {
    data.city = b.city ? String(b.city).trim() : undefined;
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}
