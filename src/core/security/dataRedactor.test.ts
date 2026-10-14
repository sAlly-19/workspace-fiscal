import { describe, it, expect } from 'vitest';
import { redactSensitiveData, redactSensitiveString, isAllowlistedKey } from './dataRedactor';

describe('dataRedactor (IMP-018)', () => {
  describe('redactSensitiveString', () => {
    it('redacts private key PEM blocks', () => {
      const input = `Here is my key:
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3...
-----END RSA PRIVATE KEY-----
Have a nice day!`;

      const redacted = redactSensitiveString(input);
      expect(redacted).not.toContain('MIIEowIBAAKCAQEA0Y3');
      expect(redacted).toContain('[REDACTED PRIVATE KEY]');
      expect(redacted).toContain('Have a nice day!');
    });

    it('redacts Bearer tokens and JWTs', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
      const input = `Authorization: Bearer ${jwt}`;
      const redacted = redactSensitiveString(input);

      expect(redacted).not.toContain('doNotLeakThisSignature');
      expect(redacted).toContain('[REDACTED');
    });

    it('preserves normal non-sensitive messages', () => {
      const msg = 'Documento NFe 35240100000000000000550010000000011000000010 processado com sucesso.';
      expect(redactSensitiveString(msg)).toBe(msg);
    });
  });

  describe('redactSensitiveData', () => {
    it('redacts sensitive keys in plain objects', () => {
      const data = {
        username: 'admin',
        password: 'SuperSecretPassword123!',
        token: 'workspace-local-token-value',
        certPassword: 'cert-pass-phrase',
        pfx: 'binary-pfx-buffer-base64',
        clientSecret: 'secret_456',
        description: 'Empresa Ativa',
      };

      const result = redactSensitiveData(data) as Record<string, any>;

      expect(result.username).toBe('admin');
      expect(result.description).toBe('Empresa Ativa');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.certPassword).toBe('[REDACTED]');
      expect(result.pfx).toBe('[REDACTED]');
      expect(result.clientSecret).toBe('[REDACTED]');
    });

    it('recursively redacts nested objects and arrays', () => {
      const data = {
        company: {
          name: 'Tech Corp',
          auth: {
            apiKey: 'secret-key-999',
            roles: ['ADMIN'],
          },
        },
        users: [
          { email: 'u1@test.com', senha: '123' },
          { email: 'u2@test.com', senha: '456' },
        ],
      };

      const result = redactSensitiveData(data) as any;

      expect(result.company.name).toBe('Tech Corp');
      expect(result.company.auth.apiKey).toBe('[REDACTED]');
      expect(result.company.auth.roles).toEqual(['ADMIN']);
      expect(result.users[0].senha).toBe('[REDACTED]');
      expect(result.users[1].senha).toBe('[REDACTED]');
    });

    it('preserves allowlisted integrity and fiscal keys (safeguard 1)', () => {
      const sha256Hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const thumbprint = '1234567890abcdef1234567890abcdef12345678';
      const accessKey = '35240100000000000000550010000000011000000010';

      const data = {
        sha256: sha256Hash,
        checksum: sha256Hash,
        fileHash: sha256Hash,
        hash: sha256Hash,
        thumbprint: thumbprint,
        accessKey: accessKey,
        chaveAcesso: accessKey,
        nsu: '000000000000123',
        lastNsu: '000000000000123',
        maxNsu: '000000000000124',
      };

      const result = redactSensitiveData(data) as any;

      expect(result.sha256).toBe(sha256Hash);
      expect(result.checksum).toBe(sha256Hash);
      expect(result.fileHash).toBe(sha256Hash);
      expect(result.hash).toBe(sha256Hash);
      expect(result.thumbprint).toBe(thumbprint);
      expect(result.accessKey).toBe(accessKey);
      expect(result.chaveAcesso).toBe(accessKey);
      expect(result.nsu).toBe('000000000000123');
      expect(result.lastNsu).toBe('000000000000123');
      expect(result.maxNsu).toBe('000000000000124');
    });

    it('handles circular references safely without infinite recursion', () => {
      const obj: any = { name: 'Parent', password: 'secret' };
      obj.self = obj;

      const result = redactSensitiveData(obj) as any;
      expect(result.name).toBe('Parent');
      expect(result.password).toBe('[REDACTED]');
      expect(result.self).toBe('[CIRCULAR]');
    });

    it('safely handles null, undefined and primitive values', () => {
      expect(redactSensitiveData(null)).toBe(null);
      expect(redactSensitiveData(undefined)).toBe(undefined);
      expect(redactSensitiveData(123)).toBe(123);
      expect(redactSensitiveData(true)).toBe(true);
    });

    it('correctly identifies allowlisted keys', () => {
      expect(isAllowlistedKey('sha256')).toBe(true);
      expect(isAllowlistedKey('accessKey')).toBe(true);
      expect(isAllowlistedKey('password')).toBe(false);
    });
  });
});

