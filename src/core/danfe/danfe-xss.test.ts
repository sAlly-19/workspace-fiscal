import { describe, it, expect } from 'vitest';
import {
  renderDanfeNFeHtml,
  renderDanfeNFCeHtml,
  renderDanfeDACTEHtml,
  renderDanfeNFSeHtml,
} from './renderers';
import {
  buildNfseViewModel,
  buildCteViewModel,
  buildNfeViewModel,
} from './view-models';

describe('DANFE View-Models and XSS Hardening', () => {
  const XSS_PAYLOAD = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';

  describe('View-Model extraction', () => {
    it('builds NFS-e view model with normalized taxes and parties', () => {
      const doc = {
        issuer: { name: 'Prestador SA', document: '12345678000199', city: 'São Paulo' },
        recipient: { name: 'Tomador SA', document: '98765432000188' },
        totals: {
          products: 1000,
          taxes: { iss: 50, issAliquot: 5, issRetained: true },
        },
        number: '123',
      };
      const vm = buildNfseViewModel(doc);
      expect(vm.issuerName).toBe('Prestador SA');
      expect(vm.recipientName).toBe('Tomador SA');
      expect(vm.valorServicos).toBe(1000);
      expect(vm.issValor).toBe(50);
      expect(vm.isIssRetido).toBe(true);
    });

    it('builds CT-e view model with parties and freight components', () => {
      const doc = {
        issuer: { name: 'Transp SA', document: '12345678000199' },
        sender: { name: 'Remetente SA' },
        recipient: { name: 'Destinatario SA' },
        totalAmount: 500,
        route: { startCity: 'Campinas', endCity: 'Santos' },
      };
      const vm = buildCteViewModel(doc);
      expect(vm.issuerName).toBe('Transp SA');
      expect(vm.senderName).toBe('Remetente SA');
      expect(vm.startCity).toBe('Campinas');
      expect(vm.endCity).toBe('Santos');
      expect(vm.valorTotal).toBe(500);
    });

    it('builds NF-e view model with normalized totals', () => {
      const doc = {
        issuer: { name: 'Loja SA', document: '12345678000199' },
        recipient: { name: 'Cliente SA' },
        totalAmount: 250,
      };
      const vm = buildNfeViewModel(doc);
      expect(vm.issuerName).toBe('Loja SA');
      expect(vm.recipientName).toBe('Cliente SA');
      expect(vm.valorTotalNota).toBe(250);
    });
  });

  describe('XSS Hardening on Renderers', () => {
    it('escapes script tags in NF-e rendered HTML', () => {
      const maliciousDoc = {
        type: 'NFE',
        issuerName: XSS_PAYLOAD,
        recipientName: XSS_PAYLOAD,
        operationNature: XSS_PAYLOAD,
        additionalInfo: XSS_PAYLOAD,
        items: [{ description: XSS_PAYLOAD, code: XSS_PAYLOAD }],
      };
      const html = renderDanfeNFeHtml(maliciousDoc, 0, 1);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img');
    });

    it('escapes script tags in CT-e (DACTE) rendered HTML', () => {
      const maliciousDoc = {
        type: 'CTE',
        issuerName: XSS_PAYLOAD,
        sender: { name: XSS_PAYLOAD, address: { street: XSS_PAYLOAD } },
        recipient: { name: XSS_PAYLOAD },
        additionalInfo: XSS_PAYLOAD,
        items: [{ description: XSS_PAYLOAD }],
      };
      const html = renderDanfeDACTEHtml(maliciousDoc, 0, 1);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img');
    });

    it('escapes script tags in NFS-e rendered HTML', () => {
      const maliciousDoc = {
        type: 'NFSE',
        issuerName: XSS_PAYLOAD,
        recipientName: XSS_PAYLOAD,
        serviceDescription: XSS_PAYLOAD,
        items: [{ description: XSS_PAYLOAD }],
      };
      const html = renderDanfeNFSeHtml(maliciousDoc, 0, 1);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img');
    });

    it('escapes script tags in NFC-e rendered HTML', () => {
      const maliciousDoc = {
        type: 'NFCE',
        issuerName: XSS_PAYLOAD,
        recipientName: XSS_PAYLOAD,
        items: [{ description: XSS_PAYLOAD, code: XSS_PAYLOAD }],
      };
      const html = renderDanfeNFCeHtml(maliciousDoc, 0, 1);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img');
    });
  });
});
