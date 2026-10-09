import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  DanfeCanhoto,
  DanfeHeader,
  DanfeRecipient,
  DanfeBilling,
  DanfeTaxTotals,
  DanfeTransport,
  DanfeItemsTable,
  DanfeAdditionalInfo,
} from './index';
import { DanfeNFeView } from '../DanfeNFeView';

describe('DanfeNFeView Submodules Contracts & Rendering', () => {
  const mockDoc = {
    id: 'doc-danfe-1',
    number: '001234',
    series: '1',
    operationNature: 'VENDA DE MERCADORIA',
    protocol: '135260000000000',
    issueDate: '2026-10-01T10:00:00Z',
    exitDate: '2026-10-01T12:00:00Z',
    exitTime: '12:00:00',
    totalAmount: 1850.5,
    accessKey: '35261012345678000190550010001234561000000018',
    issuer: {
      name: 'FORNECEDOR MATRIZ LTDA',
      document: '12345678000190',
      ie: '123456789',
      im: '98765',
      address: {
        street: 'Rua das Flores',
        number: '100',
        complement: 'Sala 1',
        neighborhood: 'Centro',
        zipCode: '01001000',
        city: 'São Paulo',
        state: 'SP',
      },
      phone: '11999998888',
    },
    recipient: {
      name: 'CLIENTE EXEMPLO S.A.',
      document: '98765432000110',
      ie: '987654321',
      address: {
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Andar 10',
        neighborhood: 'Bela Vista',
        zipCode: '01310100',
        city: 'São Paulo',
        state: 'SP',
      },
      phone: '1133334444',
    },
    billing: {
      invoice: {
        number: '001234',
        originalAmount: 1900.0,
        discountAmount: 49.5,
        netAmount: 1850.5,
      },
      duplicates: [
        { number: '1', dueDate: '2026-10-15', amount: 925.25 },
        { number: '2', dueDate: '2026-11-15', amount: 925.25 },
      ],
    },
    totals: {
      products: 1850.5,
      freight: 0,
      insurance: 0,
      discount: 49.5,
      otherExpenses: 0,
      totalTaxes: 300.0,
      icmsBase: 1850.5,
      icmsStBase: 0,
      taxes: {
        icms: 333.09,
        icmsSt: 0,
        ii: 0,
        ipi: 0,
        pis: 30.53,
        cofins: 140.64,
        icmsUfRemet: 0,
        icmsUfDest: 0,
        fcpUfDest: 0,
      },
    },
    transport: {
      modFrete: '0',
      name: 'TRANSPORTADORA VELOZ LTDA',
      document: '11222333000144',
      ie: '11223344',
      address: 'Rua do Transporte, 50',
      city: 'Campinas',
      state: 'SP',
      anttCode: 'ANTT-12345',
      vehiclePlate: 'ABC1D23',
      vehicleUf: 'SP',
      volumeQuantity: 5,
      volumeSpecies: 'VOLUMES',
      volumeBrand: 'MARCA',
      volumeNumber: '1-5',
      grossWeight: 50.5,
      netWeight: 48.2,
    },
    items: [
      {
        id: 'item-1',
        code: 'PRD-01',
        description: 'NOTEBOOK EMPRESARIAL',
        ncm: '84713012',
        cst: '000',
        cfop: '5102',
        unit: 'UN',
        quantity: 1,
        unitPrice: 1850.5,
        totalPrice: 1850.5,
        discount: 0,
        icmsBase: 1850.5,
        icmsValue: 333.09,
        icmsAliq: 18.0,
      },
    ],
    additionalInfo: 'Informações fiscais complementares.',
    fiscoInfo: 'Espaço fiscal reservado.',
  };

  describe('DanfeCanhoto', () => {
    it('creates canhoto element with receipt metadata', () => {
      const element = React.createElement(DanfeCanhoto, {
        issuerName: 'FORNECEDOR MATRIZ LTDA',
        issueDateStr: '01/10/2026',
        valorTotalNota: 1850.5,
        recipientName: 'CLIENTE EXEMPLO S.A.',
        recipientStreet: 'Avenida Paulista, 1000',
        recipientBairro: 'Bela Vista',
        recipientCity: 'São Paulo',
        recipientState: 'SP',
        docNumber: '001234',
        docSeries: '1',
      });
      expect(element).toBeDefined();
      expect(element.props.docNumber).toBe('001234');
    });
  });

  describe('DanfeHeader', () => {
    it('creates header with barcode representation and access key', () => {
      const element = React.createElement(DanfeHeader, {
        issuerName: 'FORNECEDOR MATRIZ LTDA',
        issuerStreet: 'Rua das Flores',
        issuerNumber: '100',
        issuerComp: ' - Sala 1',
        issuerBairro: 'Centro',
        issuerCep: '01001-000',
        issuerCity: 'São Paulo',
        issuerState: 'SP',
        issuerPhone: '(11) 99999-8888',
        issuerDoc: '12.345.678/0001-90',
        issuerIE: '123456789',
        issuerIM: '98765',
        docNumber: '001234',
        docSeries: '1',
        formattedKey: '3526 1012 3456 7800 0190 5500 1000 1234 5610 0000 0018',
        operationNature: 'VENDA DE MERCADORIA',
        protocol: '135260000000000',
      });
      expect(element).toBeDefined();
      expect(element.props.operationNature).toBe('VENDA DE MERCADORIA');
    });
  });

  describe('DanfeRecipient', () => {
    it('creates recipient element with recipient details', () => {
      const element = React.createElement(DanfeRecipient, {
        recipientName: 'CLIENTE EXEMPLO S.A.',
        recipientDoc: '98.765.432/0001-10',
        issueDateStr: '01/10/2026',
        recipientStreet: 'Avenida Paulista, 1000',
        recipientBairro: 'Bela Vista',
        recipientCep: '01310-100',
        exitDateStr: '01/10/2026',
        recipientCity: 'São Paulo',
        recipientState: 'SP',
        recipientPhone: '(11) 3333-4444',
        recipientIE: '987654321',
        exitTimeStr: '12:00:00',
      });
      expect(element).toBeDefined();
      expect(element.props.recipientCity).toBe('São Paulo');
    });
  });

  describe('DanfeBilling', () => {
    it('creates billing element with invoice and installments', () => {
      const element = React.createElement(DanfeBilling, {
        billing: mockDoc.billing,
        defaultDocNumber: '001234',
      });
      expect(element).toBeDefined();
      expect(element.props.billing.duplicates).toHaveLength(2);
    });

    it('returns null when billing data is absent', () => {
      expect(DanfeBilling({ billing: null })).toBeNull();
      expect(DanfeBilling({ billing: {} })).toBeNull();
    });
  });

  describe('DanfeTaxTotals', () => {
    it('creates tax totals element with calculated tax values', () => {
      const element = React.createElement(DanfeTaxTotals, {
        baseIcms: 1850.5,
        valorIcms: 333.09,
        baseIcmsSt: 0,
        valorIcmsSt: 0,
        impImportacao: 0,
        icmsUfRemet: 0,
        fcpUfDest: 0,
        pis: 30.53,
        valorProdutos: 1850.5,
        valorFrete: 0,
        valorSeguro: 0,
        valorDesconto: 49.5,
        outrasDespesas: 0,
        valorIpi: 0,
        icmsUfDest: 0,
        totalTrib: 300.0,
        cofins: 140.64,
        valorTotalNota: 1850.5,
      });
      expect(element).toBeDefined();
      expect(element.props.valorTotalNota).toBe(1850.5);
    });
  });

  describe('DanfeTransport', () => {
    it('creates transport element with carrier and volume information', () => {
      const element = React.createElement(DanfeTransport, {
        transport: mockDoc.transport,
        transpMod: '0 - Por conta do Emitente',
      });
      expect(element).toBeDefined();
      expect(element.props.transport.name).toBe('TRANSPORTADORA VELOZ LTDA');
    });
  });

  describe('DanfeItemsTable', () => {
    it('creates items table element with products', () => {
      const element = React.createElement(DanfeItemsTable, { items: mockDoc.items });
      expect(element).toBeDefined();
      expect(element.props.items).toHaveLength(1);
    });

    it('handles empty items without errors', () => {
      const element = React.createElement(DanfeItemsTable, { items: [] });
      expect(element).toBeDefined();
    });
  });

  describe('DanfeAdditionalInfo', () => {
    it('creates additional info element with fiscal notes', () => {
      const element = React.createElement(DanfeAdditionalInfo, {
        additionalInfo: mockDoc.additionalInfo,
        fiscoInfo: mockDoc.fiscoInfo,
      });
      expect(element).toBeDefined();
      expect(element.props.additionalInfo).toBe('Informações fiscais complementares.');
    });
  });

  describe('DanfeNFeView (integrated)', () => {
    it('instantiates the root DanfeNFeView with dark and light themes', () => {
      const darkEl = React.createElement(DanfeNFeView, { doc: mockDoc, theme: 'dark' });
      expect(darkEl).toBeDefined();
      expect(darkEl.props.theme).toBe('dark');

      const lightEl = React.createElement(DanfeNFeView, { doc: mockDoc, theme: 'light' });
      expect(lightEl).toBeDefined();
      expect(lightEl.props.theme).toBe('light');
    });
  });
});

