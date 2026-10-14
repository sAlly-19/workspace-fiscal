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
} from './index';

describe('API Input Contract Validators (IMP-011)', () => {
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
});

