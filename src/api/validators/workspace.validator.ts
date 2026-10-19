import { ValidationResult } from './types';

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  watchPath?: string | null;
  watchRecursive?: boolean;
  watchMode?: 'off' | 'auto' | 'prompt';
}

export interface UpdateFolderInput {
  name?: string;
  watchPath?: string | null;
  watchRecursive?: boolean;
  watchMode?: 'off' | 'auto' | 'prompt';
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

  if (b.watchPath !== undefined && b.watchPath !== null && typeof b.watchPath !== 'string') {
    errors.push('watchPath deve ser uma string com o caminho do diretório ou nulo.');
  }

  if (b.watchRecursive !== undefined && typeof b.watchRecursive !== 'boolean') {
    errors.push('watchRecursive deve ser um booleano.');
  }

  if (b.watchMode !== undefined && !['off', 'auto', 'prompt'].includes(b.watchMode)) {
    errors.push('watchMode deve ser "off", "auto" ou "prompt".');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: b.name.trim(),
      parentId: b.parentId || null,
      watchPath: typeof b.watchPath === 'string' ? b.watchPath.trim() : (b.watchPath === null ? null : undefined),
      watchRecursive: typeof b.watchRecursive === 'boolean' ? b.watchRecursive : false,
      watchMode: (b.watchMode as 'off' | 'auto' | 'prompt') || 'off',
    },
  };
}

export function validateUpdateFolder(body: unknown): ValidationResult<UpdateFolderInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['O novo nome da pasta é obrigatório.'] };
  }

  const b = body as Record<string, any>;

  const hasName = b.name !== undefined;
  const hasWatchPath = b.watchPath !== undefined;
  const hasWatchRecursive = b.watchRecursive !== undefined;
  const hasWatchMode = b.watchMode !== undefined;

  if (!hasName && !hasWatchPath && !hasWatchRecursive && !hasWatchMode) {
    return { success: false, errors: ['O novo nome da pasta é obrigatório.'] };
  }

  if (hasName) {
    if (typeof b.name !== 'string' || !b.name.trim()) {
      errors.push('O novo nome da pasta é obrigatório.');
    } else if (b.name.trim().length > 255) {
      errors.push('O nome da pasta deve ter no máximo 255 caracteres.');
    }
  }

  if (hasWatchPath && b.watchPath !== null && typeof b.watchPath !== 'string') {
    errors.push('watchPath deve ser uma string com o caminho do diretório ou nulo.');
  }

  if (hasWatchRecursive && typeof b.watchRecursive !== 'boolean') {
    errors.push('watchRecursive deve ser um booleano.');
  }

  if (hasWatchMode && !['off', 'auto', 'prompt'].includes(b.watchMode)) {
    errors.push('watchMode deve ser "off", "auto" ou "prompt".');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const resultData: UpdateFolderInput = {};
  if (hasName && typeof b.name === 'string') resultData.name = b.name.trim();
  if (hasWatchPath) resultData.watchPath = typeof b.watchPath === 'string' ? b.watchPath.trim() : null;
  if (hasWatchRecursive) resultData.watchRecursive = Boolean(b.watchRecursive);
  if (hasWatchMode) resultData.watchMode = b.watchMode as 'off' | 'auto' | 'prompt';

  return {
    success: true,
    data: resultData,
  };
}
