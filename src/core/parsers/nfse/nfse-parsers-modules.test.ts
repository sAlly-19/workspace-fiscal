import { describe, it, expect } from 'vitest';
import {
  parseNfseNumber,
  parseSefinNacional,
  parseMunicipalNotas,
  parseAbrasf,
} from './index';
import { NFSeParser } from '../nfse.parser';

describe('NFS-e Parser Modules', () => {
  describe('parseNfseNumber', () => {
    it('handles brazilian formatted numbers and raw floats', () => {
      expect(parseNfseNumber('1.234,56')).toBe(1234.56);
      expect(parseNfseNumber('1234,56')).toBe(1234.56);
      expect(parseNfseNumber('1234.56')).toBe(1234.56);
      expect(parseNfseNumber(1234.56)).toBe(1234.56);
      expect(parseNfseNumber('')).toBe(0);
      expect(parseNfseNumber(null)).toBe(0);
      expect(parseNfseNumber(undefined)).toBe(0);
    });
  });

  describe('parseSefinNacional', () => {
    it('correctly maps Sefin Nacional attributes into FiscalDocument', () => {
      const mockInf = {
        '@_Id': 'NFS12345678901234567890123456789012345678901234',
        nNFSe: '123',
        dhProc: '2026-08-15T10:00:00Z',
        emit: {
          xNome: 'EMPRESA PRESTADORA LTDA',
          CNPJ: '12345678000199',
          enderNac: {
            xLgr: 'Rua das Flores',
            nro: '100',
            xBairro: 'Centro',
            xMun: 'São Paulo',
            UF: 'SP',
            CEP: '01001000',
          },
        },
        DPS: {
          infDPS: {
            toma: {
              xNome: 'CLIENTE TOMADOR S/A',
              CNPJ: '98765432000188',
            },
            serv: {
              cServ: {
                xDescServ: 'Serviço de Consultoria',
                cTribNac: '01.07.01',
              },
            },
            valores: {
              vServPrest: { vServ: '1500,00' },
            },
          },
        },
        valores: {
          vServ: '1500.00',
          vISSQN: '75.00',
          vLiq: '1425.00',
        },
      };

      const doc = parseSefinNacional(mockInf, '/dummy/path.xml');
      expect(doc.type).toBe('NFSE');
      expect(doc.accessKey).toBe('12345678901234567890123456789012345678901234');
      expect(doc.number).toBe('123');
      expect(doc.issuer?.name).toBe('EMPRESA PRESTADORA LTDA');
      expect(doc.recipient?.name).toBe('CLIENTE TOMADOR S/A');
      expect(doc.totals?.products).toBe(1500);
      expect(doc.totals?.taxes?.iss).toBe(75);
    });
  });

  describe('parseMunicipalNotas', () => {
    it('correctly maps municipal simplificado format into FiscalDocument', () => {
      const mockData = {
        CHAVENFSE: 'NFS998877',
        N_DA_NFSE: '456',
        DATA_EMISSAO: '20/09/2026',
        RAZAO_SOCIAL_PRESTADOR: 'PRESTADOR MUNICIPAL',
        CNPJ_PRESTADOR: '11222333000144',
        RAZAO_SOCIAL_TOMADOR: 'TOMADOR MUNICIPAL',
        CNPJ_TOMADOR: '44555666000177',
        VALOR_SERVICOS: '800,00',
        VALOR_ISS: '40,00',
        VALOR_LIQUIDO: '760,00',
        DISCRIMINACAO: 'Limpeza predial',
      };

      const doc = parseMunicipalNotas(mockData, '/dummy/municipal.xml');
      expect(doc.type).toBe('NFSE');
      expect(doc.accessKey).toBe('998877');
      expect(doc.number).toBe('456');
      expect(doc.issuer?.name).toBe('PRESTADOR MUNICIPAL');
      expect(doc.recipient?.name).toBe('TOMADOR MUNICIPAL');
      expect(doc.totals?.products).toBe(800);
      expect(doc.totals?.taxes?.iss).toBe(40);
    });
  });

  describe('parseAbrasf', () => {
    it('correctly maps ABRASF format into FiscalDocument', () => {
      const mockInf = {
        Numero: '789',
        DataEmissao: '2026-07-10T12:00:00Z',
        CodigoVerificacao: 'ABC123XYZ',
        PrestadorServico: {
          RazaoSocial: 'PRESTADOR ABRASF',
          IdentificacaoPrestador: { Cnpj: '33444555000199' },
        },
        TomadorServico: {
          RazaoSocial: 'TOMADOR ABRASF',
          IdentificacaoTomador: { CpfCnpj: { Cnpj: '66777888000122' } },
        },
        Servico: {
          Discriminacao: 'Desenvolvimento de Software',
          Valores: {
            ValorServicos: '5000.00',
            ValorIss: '250.00',
            ValorLiquidoNfse: '4750.00',
          },
        },
      };

      const doc = parseAbrasf(mockInf, '/dummy/abrasf.xml');
      expect(doc.type).toBe('NFSE');
      expect(doc.number).toBe('789');
      expect(doc.verificationCode).toBe('ABC123XYZ');
      expect(doc.issuer?.name).toBe('PRESTADOR ABRASF');
      expect(doc.recipient?.name).toBe('TOMADOR ABRASF');
      expect(doc.totals?.products).toBe(5000);
      expect(doc.totals?.taxes?.iss).toBe(250);
    });
  });

  describe('NFSeParser orchestrator', () => {
    it('throws error on unknown XML format', () => {
      const parser = new NFSeParser();
      expect(() => parser.parse('<xml><desconhecido>123</desconhecido></xml>', '/dummy.xml')).toThrow(
        'Formato NFS-e desconhecido: tags reconhecidas ausentes no XML.'
      );
    });
  });
});

