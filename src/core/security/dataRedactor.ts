/**
 * Módulo de Redação de Dados Sensíveis LGPD (IMP-018)
 * Sanitiza recursivamente objetos, arrays e strings contendo segredos, senhas,
 * tokens e chaves privadas antes de persistência ou emissão de logs.
 */

export const ALLOWLISTED_KEYS = new Set([
  'sha256',
  'checksum',
  'hash',
  'filehash',
  'thumbprint',
  'accesskey',
  'chaveacesso',
  'chave',
  'nfeid',
  'cteid',
  'nfseid',
  'nsu',
  'lastnsu',
  'maxnsu',
  'id',
  'numericid',
  'companyid',
  'documentid',
  'xml',
  'xmlcontent',
]);

export const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /senha/i,
  /^pass$/i,
  /token/i,
  /x-workspace-token/i,
  /authorization/i,
  /secret/i,
  /private[-_]?key/i,
  /pfx/i,
  /cert[-_]?password/i,
  /client[-_]?secret/i,
  /apikey/i,
];

const PEM_PRIVATE_KEY_REGEX = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const JWT_REGEX = /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9-_.]+/gi;

/**
 * Verifica se a chave pertence à allowlist de integridade técnica ou dados fiscais
 */
export function isAllowlistedKey(key: string): boolean {
  return ALLOWLISTED_KEYS.has(key.toLowerCase());
}

/**
 * Verifica se o nome da chave indica um dado sensível
 */
export function isSensitiveKey(key: string): boolean {
  if (isAllowlistedKey(key)) {
    return false;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Sanitiza strings mascarando blocos de chave privada PEM, tokens Bearer e JWTs
 */
export function redactSensitiveString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  let redacted = str.replace(PEM_PRIVATE_KEY_REGEX, '[REDACTED PRIVATE KEY]');
  redacted = redacted.replace(BEARER_REGEX, 'Bearer [REDACTED]');
  redacted = redacted.replace(JWT_REGEX, '[REDACTED JWT]');

  return redacted;
}

/**
 * Redige recursivamente dados sensíveis em objetos, arrays e primitivos,
 * mantendo proteção estrita contra referências circulares via WeakSet.
 */
export function redactSensitiveData(target: unknown, seen = new WeakSet()): unknown {
  if (target === null || target === undefined) {
    return target;
  }

  if (typeof target === 'string') {
    return redactSensitiveString(target);
  }

  if (typeof target !== 'object') {
    return target;
  }

  if (seen.has(target)) {
    return '[CIRCULAR]';
  }
  seen.add(target);

  if (Array.isArray(target)) {
    return target.map((item) => redactSensitiveData(item, seen));
  }

  // Handle Date, RegExp, Buffer, Error etc.
  if (target instanceof Date || target instanceof RegExp) {
    return target;
  }

  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(target)) {
    if (isAllowlistedKey(key)) {
      result[key] = val;
    } else if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = redactSensitiveData(val, seen);
    } else if (typeof val === 'string') {
      result[key] = redactSensitiveString(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}
