import { ValidationResult } from './types';

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderInput {
  name: string;
}

export function validateCreateFolder(body: unknown): ValidationResult<CreateFolderInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['O nome da pasta é obrigatório.'] };
  }

  const b = body as Record<string, any>;

  if (typeof b.name !== 'string' || !b.name.trim()) {
    errors.push('O nome da pasta é obrigatório.');
  } else if (b.name.trim().length > 255) {
    errors.push('O nome da pasta deve ter no máximo 255 caracteres.');
  }

  if (b.parentId !== undefined && b.parentId !== null && typeof b.parentId !== 'string') {
    errors.push('parentId deve ser uma string válida ou nulo.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: b.name.trim(),
      parentId: b.parentId || null,
    },
  };
}

export function validateUpdateFolder(body: unknown): ValidationResult<UpdateFolderInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['O novo nome da pasta é obrigatório.'] };
  }

  const b = body as Record<string, any>;

  if (typeof b.name !== 'string' || !b.name.trim()) {
    errors.push('O novo nome da pasta é obrigatório.');
  } else if (b.name.trim().length > 255) {
    errors.push('O nome da pasta deve ter no máximo 255 caracteres.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: b.name.trim(),
    },
  };
}
