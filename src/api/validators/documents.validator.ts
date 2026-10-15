import { ValidationResult } from './types';

export interface BulkDeleteDocumentsInput {
  ids: string[];
}

export interface BulkMoveDocumentsInput {
  ids: string[];
  folderId?: string | null;
}

export function validateBulkDeleteDocuments(body: unknown): ValidationResult<BulkDeleteDocumentsInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Lista de IDs inválida para exclusão.'] };
  }

  const b = body as Record<string, any>;

  if (!Array.isArray(b.ids) || b.ids.length === 0) {
    errors.push('Lista de IDs inválida para exclusão.');
  } else if (!b.ids.every((id: any) => typeof id === 'string' && id.trim().length > 0)) {
    errors.push('Todos os IDs devem ser strings não-vazias.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      ids: b.ids,
    },
  };
}

export function validateBulkMoveDocuments(body: unknown): ValidationResult<BulkMoveDocumentsInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Lista de IDs inválida para mover.'] };
  }

  const b = body as Record<string, any>;

  if (!Array.isArray(b.ids) || b.ids.length === 0) {
    errors.push('Lista de IDs inválida para mover.');
  } else if (!b.ids.every((id: any) => typeof id === 'string' && id.trim().length > 0)) {
    errors.push('Todos os IDs devem ser strings não-vazias.');
  }

  if (b.folderId !== undefined && b.folderId !== null && typeof b.folderId !== 'string') {
    errors.push('folderId inválido.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      ids: b.ids,
      folderId: b.folderId || null,
    },
  };
}
