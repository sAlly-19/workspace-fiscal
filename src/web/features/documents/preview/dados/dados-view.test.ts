import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  DadosHeaderSection,
  DadosPartiesSection,
  DadosBillingSection,
  DadosTaxesSection,
  DadosItemsTable,
} from './index';
import { DadosView } from '../DadosView';

describe('DadosView Submodules Contracts & Rendering Logic', () => {
  const mockDoc = {
    id: 'doc-123',
    type: 'NF-e',
    number: '123456',
    series: '1',
    issueDate: '2026-10-01T12:00:00Z',
    totalAmount: 1500.5,
    accessKey: '35261012345678000190550010001234561000000018',
    issuerName: 'EMPRESA EMISSORA LTDA',
    issuerDocument: '12.345.678/0001-90',
    recipientName: 'EMPRESA DESTINATARIA S.A.',
    recipientDocument: '98.765.432/0001-10',
    billing: {
      invoice: {
        number: '123456',
        originalAmount: 1550.0,
        discountAmount: 49.5,
        netAmount: 1500.5,
      },
      duplicates: [
        { number: '1', dueDate: '2026-10-15', amount: 750.25 },
        { number: '2', dueDate: '2026-11-15', amount: 750.25 },
      ],
      payments: [
        { paymentType: '01', amount: 750.25 },
        { paymentType: '15', amount: 750.25 },
      ],
    },
    totals: {
      totalTaxes: 250.75,
      icmsBase: 1500.5,
      icmsStBase: 0,
      taxes: {
        icms: 180.06,
        icmsSt: 0,
        ipi: 0,
        pis: 9.75,
        cofins: 45.02,
        iss: 0,
        inss: 0,
        ir: 0,
        csll: 0,
      },
    },
    items: [
      {
        id: 'item-1',
        code: 'PRD-01',
        description: 'PRODUTO TESTE ALFA',
        ncm: '84713012',
        cfop: '5102',
        unit: 'UN',
        quantity: 2,
        unitPrice: 750.25,
        totalPrice: 1500.5,
      },
    ],
  };

  describe('DadosHeaderSection', () => {
    it('creates header element correctly in light and dark mode', () => {
      const darkHeader = React.createElement(DadosHeaderSection, { doc: mockDoc, isLight: false });
      expect(darkHeader).toBeDefined();
      expect(darkHeader.props.doc.type).toBe('NF-e');
      expect(darkHeader.props.isLight).toBe(false);

      const lightHeader = React.createElement(DadosHeaderSection, { doc: mockDoc, isLight: true });
      expect(lightHeader).toBeDefined();
      expect(lightHeader.props.isLight).toBe(true);
    });

    it('handles documents with missing optional fields without throwing', () => {
      const minimalDoc = {};
      const el = React.createElement(DadosHeaderSection, { doc: minimalDoc, isLight: false });
      expect(el).toBeDefined();
      expect(el.props.doc).toEqual({});
    });
  });

  describe('DadosPartiesSection', () => {
    it('creates parties element with issuer and recipient information', () => {
      const partiesEl = React.createElement(DadosPartiesSection, { doc: mockDoc, isLight: false });
      expect(partiesEl).toBeDefined();
      expect(partiesEl.props.doc.issuerName).toBe('EMPRESA EMISSORA LTDA');
      expect(partiesEl.props.doc.recipientName).toBe('EMPRESA DESTINATARIA S.A.');
    });

    it('handles missing party information gracefully', () => {
      const partiesEl = React.createElement(DadosPartiesSection, { doc: {}, isLight: true });
      expect(partiesEl).toBeDefined();
    });
  });

  describe('DadosBillingSection', () => {
    it('creates billing element with invoice, duplicates and payment information', () => {
      const billingEl = React.createElement(DadosBillingSection, { doc: mockDoc, isLight: false });
      expect(billingEl).toBeDefined();
      expect(billingEl.props.doc.billing.duplicates).toHaveLength(2);
      expect(billingEl.props.doc.billing.payments).toHaveLength(2);
    });

    it('renders null when document has no billing information', () => {
      const result = DadosBillingSection({ doc: {}, isLight: false });
      expect(result).toBeNull();
    });
  });

  describe('DadosTaxesSection', () => {
    it('creates taxes element with tax breakdowns', () => {
      const taxesEl = React.createElement(DadosTaxesSection, { doc: mockDoc, isLight: false });
      expect(taxesEl).toBeDefined();
      expect(taxesEl.props.doc.totals.taxes.icms).toBe(180.06);
    });

    it('renders null when document has no tax totals', () => {
      const result = DadosTaxesSection({ doc: {}, isLight: false });
      expect(result).toBeNull();
    });
  });

  describe('DadosItemsTable', () => {
    it('creates items table element with item list', () => {
      const tableEl = React.createElement(DadosItemsTable, { items: mockDoc.items, isLight: false });
      expect(tableEl).toBeDefined();
      expect(tableEl.props.items).toHaveLength(1);
    });

    it('renders null when items list is empty or undefined', () => {
      expect(DadosItemsTable({ items: [], isLight: false })).toBeNull();
      expect(DadosItemsTable({ items: undefined, isLight: false })).toBeNull();
    });
  });

  describe('DadosView (integrated)', () => {
    it('instantiates main DadosView with subcomponents in light and dark mode', () => {
      const darkView = React.createElement(DadosView, { doc: mockDoc, theme: 'dark' });
      expect(darkView).toBeDefined();
      expect(darkView.props.theme).toBe('dark');

      const lightView = React.createElement(DadosView, { doc: mockDoc, theme: 'light' });
      expect(lightView).toBeDefined();
      expect(lightView.props.theme).toBe('light');
    });
  });
});

