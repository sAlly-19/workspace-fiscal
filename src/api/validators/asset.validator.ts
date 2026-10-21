import { parseBRLToCents } from '../../core/depreciation/calculate';
import { ValidationResult } from './types';

export interface CreateAssetInput {
  companyId: string;
  supplier: string;
  acquisitionDate: Date;
  documentNumber: string;
  description: string;
  acquisitionValue: number; // centavos
  annualRate: number; // porcentagem (0 < rate <= 100)
  ncm?: string | null;
  categoryId?: string | null;
}

export interface UpdateAssetInput {
  supplier?: string;
  acquisitionDate?: Date;
  documentNumber?: string;
  description?: string;
  acquisitionValue?: number; // centavos
  annualRate?: number;
  ncm?: string | null;
  categoryId?: string | null;
}

export interface DisposeAssetInput {
  disposedAt?: Date;
  reason?: string | null;
  generateResidual?: boolean;
}

export function parseDateInput(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, y, m, d] = match;
      const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0));
      return isNaN(date.getTime()) ? null : date;
    }
  }
  const d = new Date(val as any);
  return isNaN(d.getTime()) ? null : d;
}

export function validateCreateAsset(body: unknown): ValidationResult<CreateAssetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;

  // Empresa
  if (!b.companyId || typeof b.companyId !== 'string' || !b.companyId.trim()) {
    errors.push('Empresa (companyId) é obrigatória');
  }

  // Fornecedor
  if (!b.supplier || typeof b.supplier !== 'string' || !b.supplier.trim()) {
    errors.push('Fornecedor é obrigatório');
  } else if (b.supplier.trim().length > 255) {
    errors.push('Fornecedor deve ter no máximo 255 caracteres');
  }

  // Data de aquisição
  let acquisitionDate: Date | null = null;
  if (!b.acquisitionDate) {
    errors.push('Data de aquisição é obrigatória');
  } else {
    const d = parseDateInput(b.acquisitionDate);
    if (!d) {
      errors.push('Data de aquisição inválida');
    } else {
      acquisitionDate = d;
    }
  }

  // Número da nota
  if (!b.documentNumber || typeof b.documentNumber !== 'string' || !b.documentNumber.trim()) {
    errors.push('Nº da Nota / Documento é obrigatório');
  } else if (b.documentNumber.trim().length > 255) {
    errors.push('Nº do documento deve ter no máximo 255 caracteres');
  }

  // Descrição
  if (!b.description || typeof b.description !== 'string' || !b.description.trim()) {
    errors.push('Descrição do bem é obrigatória');
  } else if (b.description.trim().length > 255) {
    errors.push('Descrição deve ter no máximo 255 caracteres');
  }

  // Valor de aquisição
  let finalCents = 0;
  if (b.acquisitionValue === undefined || b.acquisitionValue === null || String(b.acquisitionValue).trim() === '') {
    errors.push('Valor de aquisição é obrigatório');
  } else {
    const rawVal = b.acquisitionValue;
    if (typeof rawVal === 'number') {
      if (rawVal < 1000000 && String(rawVal).includes('.')) {
        finalCents = Math.round(rawVal * 100);
      } else {
        finalCents = Number(rawVal);
      }
    } else {
      finalCents = parseBRLToCents(String(rawVal));
    }

    if (isNaN(finalCents) || finalCents <= 0) {
      errors.push('Valor de aquisição inválido: deve ser maior que zero');
    }
  }

  // Taxa anual
  let annualRate = 0;
  if (b.annualRate === undefined || b.annualRate === null || String(b.annualRate).trim() === '') {
    errors.push('Taxa anual é obrigatória');
  } else {
    annualRate = Number(b.annualRate);
    if (isNaN(annualRate) || annualRate <= 0 || annualRate > 100) {
      errors.push('Taxa anual inválida: deve ser maior que 0 e menor ou igual a 100%');
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      companyId: b.companyId.trim(),
      supplier: b.supplier.trim(),
      acquisitionDate: acquisitionDate as Date,
      documentNumber: b.documentNumber.trim(),
      description: b.description.trim(),
      acquisitionValue: finalCents,
      annualRate,
      ncm: b.ncm ? String(b.ncm).trim() : null,
      categoryId: b.categoryId ? String(b.categoryId).trim() : null,
    },
  };
}

export function validateUpdateAsset(body: unknown): ValidationResult<UpdateAssetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Corpo da requisição deve ser um objeto JSON válido'] };
  }

  const b = body as Record<string, any>;
  const data: UpdateAssetInput = {};

  if (b.supplier !== undefined) {
    if (typeof b.supplier !== 'string' || !b.supplier.trim()) {
      errors.push('Fornecedor não pode ser vazio');
    } else {
      data.supplier = b.supplier.trim();
    }
  }

  if (b.acquisitionDate !== undefined) {
    const d = parseDateInput(b.acquisitionDate);
    if (!d) {
      errors.push('Data de aquisição inválida');
    } else {
      data.acquisitionDate = d;
    }
  }

  if (b.documentNumber !== undefined) {
    if (typeof b.documentNumber !== 'string' || !b.documentNumber.trim()) {
      errors.push('Nº do documento não pode ser vazio');
    } else {
      data.documentNumber = b.documentNumber.trim();
    }
  }

  if (b.description !== undefined) {
    if (typeof b.description !== 'string' || !b.description.trim()) {
      errors.push('Descrição não pode ser vazia');
    } else {
      data.description = b.description.trim();
    }
  }

  if (b.acquisitionValue !== undefined) {
    let finalCents = 0;
    const rawVal = b.acquisitionValue;
    if (typeof rawVal === 'number') {
      if (rawVal < 1000000 && String(rawVal).includes('.')) {
        finalCents = Math.round(rawVal * 100);
      } else {
        finalCents = Number(rawVal);
      }
    } else {
      finalCents = parseBRLToCents(String(rawVal));
    }

    if (isNaN(finalCents) || finalCents <= 0) {
      errors.push('Valor de aquisição inválido: deve ser maior que zero');
    } else {
      data.acquisitionValue = finalCents;
    }
  }

  if (b.annualRate !== undefined) {
    const rate = Number(b.annualRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      errors.push('Taxa anual inválida: deve ser maior que 0 e menor ou igual a 100%');
    } else {
      data.annualRate = rate;
    }
  }

  if (b.ncm !== undefined) {
    data.ncm = b.ncm ? String(b.ncm).trim() : null;
  }

  if (b.categoryId !== undefined) {
    data.categoryId = b.categoryId ? String(b.categoryId).trim() : null;
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

export function validateDisposeAsset(body: unknown): ValidationResult<DisposeAssetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: true, data: { disposedAt: new Date(), generateResidual: true } };
  }

  const b = body as Record<string, any>;
  let disposedAt = new Date();

  if (b.disposedAt !== undefined && b.disposedAt !== null && String(b.disposedAt).trim() !== '') {
    const d = parseDateInput(b.disposedAt);
    if (!d) {
      errors.push('Data de baixa inválida');
    } else {
      disposedAt = d;
    }
  }

  if (b.reason !== undefined && b.reason !== null && typeof b.reason === 'string' && b.reason.length > 500) {
    errors.push('Motivo da baixa não pode exceder 500 caracteres');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      disposedAt,
      reason: b.reason ? String(b.reason).trim() : null,
      generateResidual: b.generateResidual !== false,
    },
  };
}
