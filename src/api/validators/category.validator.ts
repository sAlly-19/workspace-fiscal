import { ValidationResult } from './types';

export interface CreateCategoryInput {
  name: string;
  defaultRate: number;
  companyId?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  defaultRate?: number;
}

export function validateCreateCategory(body: unknown): ValidationResult<CreateCategoryInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;

  if (typeof b.name !== 'string' || !b.name.trim()) {
    errors.push('Nome da categoria é obrigatório');
  } else if (b.name.trim().length > 100) {
    errors.push('Nome da categoria deve ter no máximo 100 caracteres');
  }

  if (b.defaultRate === undefined || b.defaultRate === null || String(b.defaultRate).trim() === '') {
    errors.push('Taxa padrão é obrigatória');
  } else {
    const rate = Number(b.defaultRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      errors.push('Taxa padrão inválida: deve ser maior que 0 e menor ou igual a 100%');
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: b.name.trim(),
      defaultRate: Number(b.defaultRate),
      companyId: b.companyId ? String(b.companyId).trim() : null,
    },
  };
}

export function validateUpdateCategory(body: unknown): ValidationResult<UpdateCategoryInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;
  const data: UpdateCategoryInput = {};

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) {
      errors.push('Nome da categoria não pode ser vazio');
    } else if (b.name.trim().length > 100) {
      errors.push('Nome da categoria deve ter no máximo 100 caracteres');
    } else {
      data.name = b.name.trim();
    }
  }

  if (b.defaultRate !== undefined && b.defaultRate !== null) {
    const rate = Number(b.defaultRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      errors.push('Taxa padrão inválida: deve ser maior que 0 e menor ou igual a 100%');
    } else {
      data.defaultRate = rate;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}
