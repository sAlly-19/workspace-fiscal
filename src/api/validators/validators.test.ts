import { describe, it, expect } from 'vitest';
import {
  validateCreateCompany,
  validateUpdateCompany,
  validateCreateAsset,
  validateUpdateAsset,
  validateDisposeAsset,
  validateCreateCategory,
  validateUpdateCategory,
  validateMonthlyDepreciationQuery,
  validateExportDepreciationInput,
  validateCreateFolder,
  validateUpdateFolder,
  validateBulkDeleteDocuments,
  validateBulkMoveDocuments,
  validateDedupePolicy,
  validateSeenVersion,
} from './index';

describe('API Input Contract Validators (IMP-011 / IMP-T03)', () => {
  describe('Company Validator', () => {
    it('approves valid company creation data', () => {
      const result = validateCreateCompany({
        name: 'Empresa Alpha Ltda',
        document: '00.000.000/0001-91',
        state: 'SP',
        city: 'São Paulo',
        depreciationRule: 'PROPORTIONAL',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Empresa Alpha Ltda');
        expect(result.data.cnpj).toBe('00000000000191');
      }
    });

    it('rejects empty company name', () => {
      const result = validateCreateCompany({
        name: '   ',
        document: '00.000.000/0001-91',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Razão social é obrigatória');
      }
    });

    it('rejects invalid CNPJ checksum in strict mode', () => {
      const result = validateCreateCompany({
        name: 'Empresa Inválida',
        document: '12.345.678/0001-90',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('CNPJ'))).toBe(true);
      }
    });

    it('allows 14-digit synthetic CNPJ when allowSynthetic option is enabled (safeguard 2)', () => {
      const result = validateCreateCompany(
        {
          name: 'Empresa Teste Sintética',
          document: '12.345.678/0001-90',
        },
        { allowSynthetic: true }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cnpj).toBe('12345678000190');
      }
    });

    it('rejects invalid state UF and invalid depreciation rule', () => {
      const result = validateCreateCompany({
        name: 'Empresa Invalida UF',
        state: 'XX',
        depreciationRule: 'INVALID_RULE',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('UF') || e.includes('Estado'))).toBe(true);
        expect(result.errors.some((e) => e.includes('depreciação'))).toBe(true);
      }
    });
  });

  describe('Asset Validator', () => {
    it('approves valid asset creation data', () => {
      const result = validateCreateAsset({
        companyId: 'uuid-company-1',
        supplier: 'Dell Computadores',
        acquisitionDate: '2026-03-15',
        documentNumber: 'NF-100200',
        description: 'Notebook Latitude 5540',
        acquisitionValue: '5.400,00',
        annualRate: 20,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.acquisitionValue).toBe(540000);
        expect(result.data.annualRate).toBe(20);
      }
    });

    it('rejects non-positive acquisition values and rates <= 0 or > 100', () => {
      const result = validateCreateAsset({
        companyId: 'uuid-company-1',
        supplier: 'Dell',
        acquisitionDate: '2026-03-15',
        documentNumber: 'NF-1',
        description: 'Notebook',
        acquisitionValue: 0,
        annualRate: 150,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('Valor'))).toBe(true);
        expect(result.errors.some((e) => e.includes('Taxa'))).toBe(true);
      }
    });

    it('validates asset disposal input', () => {
      const valid = validateDisposeAsset({
        disposedAt: '2026-09-01',
        reason: 'Venda de imobilizado',
        generateResidual: true,
      });
      expect(valid.success).toBe(true);

      const invalidDate = validateDisposeAsset({
        disposedAt: 'data-invalida-xyz',
      });
      expect(invalidDate.success).toBe(false);
    });
  });

  describe('Category Validator', () => {
    it('validates category creation and update', () => {
      const valid = validateCreateCategory({
        name: 'Máquinas e Equipamentos',
        defaultRate: 10,
      });
      expect(valid.success).toBe(true);

      const invalid = validateCreateCategory({
        name: '',
        defaultRate: -5,
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.errors).toHaveLength(2);
      }
    });
  });

  describe('Depreciation Validator', () => {
    it('validates monthly query competence in YYYY-MM format', () => {
      const valid = validateMonthlyDepreciationQuery({
        companyId: 'comp-1',
        competence: '2026-08',
      });
      expect(valid.success).toBe(true);

      const invalid = validateMonthlyDepreciationQuery({
        companyId: 'comp-1',
        competence: '2026-13', // mês 13 não existe
      });
      expect(invalid.success).toBe(false);
    });

    it('validates export options', () => {
      const valid = validateExportDepreciationInput({
        companyId: 'comp-1',
        competence: '2026-08',
        separator: ';',
        numericFormat: 'BRL',
        dateFormat: 'DD/MM/YYYY',
      });
      expect(valid.success).toBe(true);

      const invalid = validateExportDepreciationInput({
        companyId: 'comp-1',
        competence: '2026-08',
        separator: '|', // inválido
        numericFormat: 'CURRENCY', // inválido
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Workspace Validator', () => {
    it('validates valid folder creation', () => {
      const valid = validateCreateFolder({ name: 'Notas Fiscais 2026', parentId: 'parent-123' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.name).toBe('Notas Fiscais 2026');
        expect(valid.data.parentId).toBe('parent-123');
      }
    });

    it('rejects empty or excessively long folder names for creation', () => {
      const empty = validateCreateFolder({ name: '   ' });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.errors).toContain('O nome da pasta é obrigatório.');
      }

      const tooLong = validateCreateFolder({ name: 'a'.repeat(256) });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.errors).toContain('O nome da pasta deve ter no máximo 255 caracteres.');
      }
    });

    it('validates folder rename and rejects empty or oversized names', () => {
      const valid = validateUpdateFolder({ name: 'Novo Nome' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.name).toBe('Novo Nome');
      }

      const empty = validateUpdateFolder({ name: '' });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.errors).toContain('O novo nome da pasta é obrigatório.');
      }

      const invalidBody = validateUpdateFolder(null);
      expect(invalidBody.success).toBe(false);
      if (!invalidBody.success) {
        expect(invalidBody.errors).toContain('O novo nome da pasta é obrigatório.');
      }
    });
  });

  describe('Documents Validator', () => {
    it('validates bulk delete with valid string array of IDs', () => {
      const valid = validateBulkDeleteDocuments({ ids: ['doc-1', 'doc-2'] });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.ids).toEqual(['doc-1', 'doc-2']);
      }
    });

    it('rejects bulk delete with empty, non-array or non-string items', () => {
      const empty = validateBulkDeleteDocuments({ ids: [] });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.errors).toContain('Lista de IDs inválida para exclusão.');
      }

      const invalidType = validateBulkDeleteDocuments({ ids: ['doc-1', 123] });
      expect(invalidType.success).toBe(false);
      if (!invalidType.success) {
        expect(invalidType.errors).toContain('Todos os IDs devem ser strings não-vazias.');
      }

      const notAnObject = validateBulkDeleteDocuments(undefined);
      expect(notAnObject.success).toBe(false);
    });

    it('validates bulk move with valid ids and folderId', () => {
      const valid = validateBulkMoveDocuments({ ids: ['doc-1'], folderId: 'folder-1' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.ids).toEqual(['doc-1']);
        expect(valid.data.folderId).toBe('folder-1');
      }

      const validNullFolder = validateBulkMoveDocuments({ ids: ['doc-1'], folderId: null });
      expect(validNullFolder.success).toBe(true);
      if (validNullFolder.success) {
        expect(validNullFolder.data.folderId).toBeNull();
      }
    });

    it('rejects bulk move with invalid folderId or empty ids', () => {
      const emptyIds = validateBulkMoveDocuments({ ids: [], folderId: 'folder-1' });
      expect(emptyIds.success).toBe(false);
      if (!emptyIds.success) {
        expect(emptyIds.errors).toContain('Lista de IDs inválida para mover.');
      }

      const invalidFolder = validateBulkMoveDocuments({ ids: ['doc-1'], folderId: 12345 });
      expect(invalidFolder.success).toBe(false);
      if (!invalidFolder.success) {
        expect(invalidFolder.errors).toContain('folderId inválido.');
      }
    });
  });

  describe('Settings Validator', () => {
    it('validates dedupe policy IGNORE, OVERWRITE, and CREATE_VERSION', () => {
      expect(validateDedupePolicy({ policy: 'IGNORE' }).success).toBe(true);
      expect(validateDedupePolicy({ policy: 'OVERWRITE' }).success).toBe(true);
      expect(validateDedupePolicy({ policy: 'CREATE_VERSION' }).success).toBe(true);
    });

    it('rejects invalid or missing dedupe policy', () => {
      const invalid = validateDedupePolicy({ policy: 'RANDOM' });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.errors).toContain('Política inválida. Use IGNORE, OVERWRITE ou CREATE_VERSION.');
      }

      const missing = validateDedupePolicy({});
      expect(missing.success).toBe(false);

      const nullBody = validateDedupePolicy(null);
      expect(nullBody.success).toBe(false);
    });

    it('validates seen version with string up to 50 chars', () => {
      const valid = validateSeenVersion({ version: '3.5.2' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.version).toBe('3.5.2');
      }
    });

    it('rejects empty or overly long seen version', () => {
      const empty = validateSeenVersion({ version: '   ' });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.errors).toContain('Versão obrigatória');
      }

      const tooLong = validateSeenVersion({ version: 'v'.repeat(51) });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.errors).toContain('Versão deve ter no máximo 50 caracteres');
      }

      const nonObject = validateSeenVersion(null);
      expect(nonObject.success).toBe(false);
    });
  });
});

