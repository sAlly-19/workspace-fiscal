import { describe, it, expect } from 'vitest';
import {
  renderDanfeNFeHtml,
  renderDanfeNFCeHtml,
  renderDanfeDACTEHtml,
  renderDanfeNFSeHtml,
  renderDanfeCardHtml,
  generateDanfeBatchHtml,
  formatRole,
  formatUnit,
} from './index';

describe('DANFE HTML Generators & Renderers', () => {
  describe('formatRole & formatUnit helpers', () => {
    it('formats CT-e role codes correctly', () => {
      expect(formatRole('0')).toBe('Remetente');
      expect(formatRole('1')).toBe('Expedidor');
      expect(formatRole('2')).toBe('Recebedor');
      expect(formatRole('3')).toBe('Destinatário');
      expect(formatRole('4')).toBe('Outros');
      expect(formatRole('99')).toBe('Remetente'); // fallback
    });

    it('formats CT-e unit codes correctly', () => {
      expect(formatUnit('00')).toBe('M3');
      expect(formatUnit('01')).toBe('KG');
      expect(formatUnit('02')).toBe('TON');
      expect(formatUnit('03')).toBe('UN');
      expect(formatUnit('04')).toBe('LT');
      expect(formatUnit('05')).toBe('MMBTU');
      expect(formatUnit('CX')).toBe('CX'); // fallback
    });
  });

  describe('renderDanfeNFeHtml', () => {
    it('generates SEFAZ traditional NF-e DANFE HTML with products and totals', () => {
      const mockDoc = {
        type: 'NFE',
        number: '123456',
        series: '1',
        accessKey: '35260112345678000199550010001234561000000018',
        issueDate: '2026-01-15T10:30:00Z',
        issuerName: 'EMPRESA TESTE LTDA',
        issuerDocument: '12.345.678/0001-99',
        recipientName: 'CLIENTE TESTE S.A.',
        recipientDocument: '98.765.432/0001-11',
        totalAmount: 1500.0,
        items: [
          {
            code: 'PROD-01',
            description: 'PRODUTO FISCAL TESTE',
            ncm: '84713012',
            cst: '000',
            cfop: '5102',
            unit: 'UN',
            quantity: 2,
            unitPrice: 750.0,
            totalPrice: 1500.0,
          },
        ],
        totals: {
          products: 1500.0,
          total: 1500.0,
          taxes: {
            icms: 270.0,
          },
        },
      };

      const html = renderDanfeNFeHtml(mockDoc, 0, 1);
      expect(html).toContain('DANFE');
      expect(html).toContain('123456');
      expect(html).toContain('EMPRESA TESTE LTDA');
      expect(html).toContain('PRODUTO FISCAL TESTE');
      expect(html).toContain('1500.00');
    });
  });

  describe('renderDanfeNFCeHtml', () => {
    it('generates NFC-e receipt HTML with QR code and items', () => {
      const mockDoc = {
        type: 'NFCE',
        number: '987',
        series: '2',
        accessKey: '43260112345678000199650020000009871000000015',
        issueDate: '2026-01-20T14:15:00Z',
        issuerName: 'MERCADO TESTE',
        issuerDocument: '12345678000199',
        totalAmount: 49.9,
        items: [
          {
            description: 'REFRIGERANTE 2L',
            quantity: 1,
            unitPrice: 9.9,
            totalPrice: 9.9,
          },
        ],
      };

      const html = renderDanfeNFCeHtml(mockDoc, 0, 1);
      expect(html).toContain('CUPOM FISCAL ELETRÔNICO');
      expect(html).toContain('NFC-e');
      expect(html).toContain('MERCADO TESTE');
      expect(html).toContain('REFRIGERANTE 2L');
    });
  });

  describe('renderDanfeDACTEHtml', () => {
    it('generates DACTE HTML for freight transport document', () => {
      const mockDoc = {
        type: 'CTE',
        number: '5544',
        series: '1',
        accessKey: '35260112345678000199570010000055441000000012',
        issuerName: 'TRANSPORTADORA VELOZ',
        sender: { name: 'FABRICA REMETENTE', document: '11111111000111' },
        recipient: { name: 'LOJA DESTINATARIA', document: '22222222000122' },
        totalAmount: 320.0,
      };

      const html = renderDanfeDACTEHtml(mockDoc, 0, 1);
      expect(html).toContain('DACTE');
      expect(html).toContain('MODAL RODOVIÁRIO');
      expect(html).toContain('TRANSPORTADORA VELOZ');
      expect(html).toContain('FABRICA REMETENTE');
      expect(html).toContain('LOJA DESTINATARIA');
    });
  });

  describe('renderDanfeNFSeHtml', () => {
    it('generates NFS-e municipal service invoice HTML', () => {
      const mockDoc = {
        type: 'NFSE',
        number: '2026001',
        issueDate: '2026-02-01T09:00:00Z',
        issuerName: 'CONSULTORIA CONTABIL',
        issuerCity: 'São Paulo',
        recipientName: 'TOMADOR DE SERVICO LTDA',
        serviceDescription: 'SERVIÇOS DE ASSESSORIA FISCAL E CONTABIL',
        totalAmount: 2500.0,
      };

      const html = renderDanfeNFSeHtml(mockDoc, 0, 1);
      expect(html).toContain('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e');
      expect(html).toContain('CONSULTORIA CONTABIL');
      expect(html).toContain('TOMADOR DE SERVICO LTDA');
      expect(html).toContain('ASSESSORIA FISCAL');
    });
  });

  describe('renderDanfeCardHtml dispatch', () => {
    it('routes correctly based on doc type', () => {
      const nfeHtml = renderDanfeCardHtml({ type: 'NFE', number: '1' }, 0, 1);
      expect(nfeHtml).toContain('DANFE');

      const nfceHtml = renderDanfeCardHtml({ type: 'NFCE', number: '2' }, 0, 1);
      expect(nfceHtml).toContain('CUPOM FISCAL ELETRÔNICO');

      const cteHtml = renderDanfeCardHtml({ type: 'CTE', number: '3' }, 0, 1);
      expect(cteHtml).toContain('DACTE');

      const nfseHtml = renderDanfeCardHtml({ type: 'NFSE', number: '4' }, 0, 1);
      expect(nfseHtml).toContain('NFS-e');
    });
  });

  describe('generateDanfeBatchHtml', () => {
    it('creates complete printable HTML document with zoom controls and multiple pages', () => {
      const docs = [
        { type: 'NFE', number: '101', totalAmount: 100 },
        { type: 'NFSE', number: '202', totalAmount: 200 },
      ];

      const batchHtml = generateDanfeBatchHtml(docs);
      expect(batchHtml).toContain('<!DOCTYPE html>');
      expect(batchHtml).toContain('DANFE em Lote (2 Documentos)');
      expect(batchHtml).toContain('id="danfe-pages-container"');
      expect(batchHtml).toContain('window.print()');
      expect(batchHtml).toContain('R$ 300.00');
    });
  });
});

