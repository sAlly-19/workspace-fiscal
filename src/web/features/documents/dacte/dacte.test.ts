import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  formatRole,
  formatUnit,
  DacteHeader,
  DacteRoute,
  DacteParties,
  DacteCargoAndFreight,
  DacteFiscalAndRoad,
} from './index';
import { DanfeDACTE } from '../DanfeDACTE';

describe('DACTE Submodules and Helpers', () => {
  describe('formatRole helper', () => {
    it('maps CT-e roles to human descriptions with correct fallback', () => {
      expect(formatRole('0')).toBe('Remetente');
      expect(formatRole('1')).toBe('Expedidor');
      expect(formatRole('2')).toBe('Recebedor');
      expect(formatRole('3')).toBe('Destinatário');
      expect(formatRole('4')).toBe('Outros');
      expect(formatRole('invalid')).toBe('Remetente');
    });
  });

  describe('formatUnit helper', () => {
    it('maps CT-e measurement unit codes to standard acronyms', () => {
      expect(formatUnit('00')).toBe('M3');
      expect(formatUnit('01')).toBe('KG');
      expect(formatUnit('02')).toBe('TON');
      expect(formatUnit('03')).toBe('UN');
      expect(formatUnit('04')).toBe('LT');
      expect(formatUnit('05')).toBe('MMBTU');
      expect(formatUnit('CX')).toBe('CX');
    });
  });

  describe('DacteHeader', () => {
    it('creates header component with issuer and key information', () => {
      const element = React.createElement(DacteHeader, {
        issuerName: 'TRANSPORTADORA BRASIL LTDA',
        issuerStreet: 'Rodovia Anhanguera, km 100',
        issuerBairro: 'Distrito Industrial',
        issuerCep: '13000-000',
        issuerCity: 'Campinas',
        issuerState: 'SP',
        issuerPhone: '(19) 3000-0000',
        issuerDoc: '11.222.333/0001-44',
        issuerIE: '123456789',
        series: '1',
        number: '000.123',
        formattedKey: '3526 1011 2223 3300 0144 5700 1000 0001 2310 0000 0019',
      });
      expect(element).toBeDefined();
      expect(element.props.number).toBe('000.123');
    });
  });

  describe('DacteRoute', () => {
    it('creates route component with origin and destination', () => {
      const element = React.createElement(DacteRoute, {
        cfop: '5353',
        natOp: 'PRESTACAO DE SERVICO DE TRANSPORTE',
        protocolStr: '135260000000000',
        startCity: 'São Paulo',
        startState: 'SP',
        endCity: 'Rio de Janeiro',
        endState: 'RJ',
      });
      expect(element).toBeDefined();
      expect(element.props.startCity).toBe('São Paulo');
      expect(element.props.endCity).toBe('Rio de Janeiro');
    });
  });

  describe('DacteParties', () => {
    it('creates parties component with sender, recipient and tomador', () => {
      const element = React.createElement(DacteParties, {
        tomadorRole: '0',
        tomadorName: 'REMETENTE TESTE S.A.',
        tomadorDoc: '12.345.678/0001-90',
        tomadorIE: '123456789',
        tomadorCity: 'São Paulo',
        tomadorState: 'SP',
        tomadorPhone: '(11) 9999-9999',
        senderName: 'REMETENTE TESTE S.A.',
        senderDoc: '12.345.678/0001-90',
        senderIE: '123456789',
        senderStreet: 'Rua A, 100',
        senderBairro: 'Centro',
        senderCity: 'São Paulo',
        senderState: 'SP',
        senderCep: '01001-000',
        destName: 'DESTINATARIO TESTE LTDA',
        destDoc: '98.765.432/0001-10',
        destIE: '987654321',
        destStreet: 'Avenida B, 200',
        destBairro: 'Porto',
        destCity: 'Santos',
        destState: 'SP',
        destCep: '11000-000',
        expedName: '-',
        expedDoc: '-',
        expedIE: '-',
        expedStreet: '-',
        expedCity: '-',
        expedState: '-',
        recebName: '-',
        recebDoc: '-',
        recebIE: '-',
        recebStreet: '-',
        recebCity: '-',
        recebState: '-',
      });
      expect(element).toBeDefined();
      expect(element.props.tomadorName).toBe('REMETENTE TESTE S.A.');
    });
  });

  describe('DacteCargoAndFreight', () => {
    it('creates cargo and freight component with quantities and components', () => {
      const element = React.createElement(DacteCargoAndFreight, {
        proPred: 'ELETROELETRONICOS',
        outCat: 'FRAGIL',
        vCarga: 25000,
        quantities: [
          { measureType: 'PESO BRUTO', quantity: 150.5, unit: '01' },
          { measureType: 'VOLUME', quantity: 10, unit: '03' },
        ],
        components: [
          { name: 'FRETE VALOR', amount: 800 },
          { name: 'SEGURO', amount: 50 },
        ],
        totalPrestacao: 850,
        valorReceber: 850,
      });
      expect(element).toBeDefined();
      expect(element.props.quantities).toHaveLength(2);
      expect(element.props.components).toHaveLength(2);
    });
  });

  describe('DacteFiscalAndRoad', () => {
    it('creates fiscal and road component with tax and vehicle metadata', () => {
      const element = React.createElement(DacteFiscalAndRoad, {
        icmsCst: '00',
        icmsBase: 850,
        icmsAliq: 12,
        icmsValor: 102,
        icmsRed: 0,
        docsList: [{ type: 'NFE', key: '35261012345678000190550010001234561000000018' }],
        rntrc: '12345678',
        ciot: '87654321',
        placa: 'XYZ9K88',
        ufVeic: 'SP',
        motorista: 'JOSE SILVA',
        motoristaCpf: '123.456.789-00',
        additionalInfo: 'Transporte sob temperatura ambiente.',
        fiscoInfo: 'Informações reservadas.',
      });
      expect(element).toBeDefined();
      expect(element.props.icmsValor).toBe(102);
    });
  });

  describe('DanfeDACTE (integrated)', () => {
    const mockCteDoc = {
      id: 'doc-cte-1',
      number: '1234',
      series: '1',
      totalAmount: 950.0,
      accessKey: '35261011222333000144570010000012341000000019',
      issuer: {
        name: 'RAPIDO PAULISTA TRANSPORTES LTDA',
        document: '11222333000144',
        ie: '123456789',
        address: {
          street: 'Rodovia dos Bandeirantes',
          number: '500',
          neighborhood: 'Trevo',
          city: 'Campinas',
          state: 'SP',
          zipCode: '13000000',
        },
        phone: '1930001111',
      },
      sender: {
        name: 'INDUSTRIA ELETRICA ALFA',
        document: '22333444000155',
        ie: '234567890',
        address: {
          street: 'Avenida Industrial, 100',
          neighborhood: 'Fabril',
          city: 'Jundiaí',
          state: 'SP',
          zipCode: '13200000',
        },
      },
      recipient: {
        name: 'COMERCIO BETA LTDA',
        document: '33444555000166',
        ie: '345678901',
        address: {
          street: 'Rua do Comercio, 50',
          neighborhood: 'Centro',
          city: 'Curitiba',
          state: 'PR',
          zipCode: '80000000',
        },
      },
      cteCargo: {
        predominantProduct: 'TRANSFORMADORES',
        cargoValue: 45000,
        quantities: [{ measureType: 'PESO LIQUIDO', quantity: 350.0, unit: '01' }],
      },
      cteComponents: [
        { name: 'FRETE PESO', amount: 750 },
        { name: 'GRIS', amount: 200 },
      ],
      totals: {
        total: 950.0,
      },
    };

    it('instantiates root DanfeDACTE component successfully', () => {
      const element = React.createElement(DanfeDACTE, { doc: mockCteDoc });
      expect(element).toBeDefined();
      expect(element.props.doc.number).toBe('1234');
    });
  });
});

