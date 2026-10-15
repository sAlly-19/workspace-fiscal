import { ValidationResult } from './types';

export const VALID_DEDUPE_POLICIES = ['IGNORE', 'OVERWRITE', 'CREATE_VERSION'] as const;
export type DedupePolicy = typeof VALID_DEDUPE_POLICIES[number];

export interface DedupePolicyInput {
  policy: DedupePolicy;
}

export interface SeenVersionInput {
  version: string;
}

export function validateDedupePolicy(body: unknown): ValidationResult<DedupePolicyInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Política inválida. Use IGNORE, OVERWRITE ou CREATE_VERSION.'] };
  }

  const b = body as Record<string, any>;

  if (!b.policy || !VALID_DEDUPE_POLICIES.includes(b.policy as DedupePolicy)) {
    errors.push('Política inválida. Use IGNORE, OVERWRITE ou CREATE_VERSION.');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      policy: b.policy as DedupePolicy,
    },
  };
}

export function validateSeenVersion(body: unknown): ValidationResult<SeenVersionInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { success: false, errors: ['Versão obrigatória'] };
  }

  const b = body as Record<string, any>;

  if (typeof b.version !== 'string' || !b.version.trim()) {
    errors.push('Versão obrigatória');
  } else if (b.version.trim().length > 50) {
    errors.push('Versão deve ter no máximo 50 caracteres');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      version: b.version.trim(),
    },
  };
}
