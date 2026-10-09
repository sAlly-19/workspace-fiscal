import { describe, it, expect } from 'vitest';
import {
  parseCteNumber,
  parseParty,
  parseTomador,
  parseCargo,
  parseModal,
  parseIcms,
  parseBilling,
} from './index';
import { CTeParser } from '../cte.parser';

describe('CT-e Parser Modules', () => {
  it('parseCteNumber handles brazilian and float formats', () => {
    expect(parseCteNumber('1.500,50')).toBe(1500.5);
    expect(parseCteNumber('1500.50')).toBe(1500.5);
    expect(parseCteNumber(1500.5)).toBe(1500.5);
    expect(parseCteNumber(null)).toBe(0);
    expect(parseCteNumber('')).toBe(0);
  });

  it('parseParty correctly parses party documents, name and address', () => {
    const raw = {
      xNome: 'TRANSPORTES RAPIDOS LTDA',
      CNPJ: '12345678000199',
      IE: '123456789',
      enderEmit: {
        xLgr: 'Rodovia Anhanguera',
        nro: 'KM 50',
        xBairro: 'Distrito Industrial',
        xMun: 'Jundiaí',
        UF: 'SP',
        CEP: '13200000',
      },
    };
    const party = parseParty(raw);
    expect(party.name).toBe('TRANSPORTES RAPIDOS LTDA');
    expect(party.document).toBe('12345678000199');
    expect(party.ie).toBe('123456789');
    expect(party.address?.city).toBe('Jundiaí');
    expect(party.address?.state).toBe('SP');
  });

  it('parseTomador resolves role 0 (remetente) and role 3 (destinatário)', () => {
    const rem = { name: 'REMETENTE S/A', document: '11111111000111' };
    const dest = { name: 'DESTINATARIO LTDA', document: '22222222000122' };

    const toma0 = parseTomador({ toma: '0' }, null, null, rem, dest);
    expect(toma0.role).toBe('0');
    expect(toma0.name).toBe('REMETENTE S/A');

    const toma3 = parseTomador({ toma: '3' }, null, null, rem, dest);
    expect(toma3.role).toBe('3');
    expect(toma3.name).toBe('DESTINATARIO LTDA');
  });

  it('parseCargo extracts products, cargo values and quantities', () => {
    const infCarga = {
      vCarga: '100000,00',
      proPred: 'BOBINAS DE ACO',
      infQ: [
        { cUnid: '01', tpMed: 'PESO BRUTO', qCarga: '15000,00' },
        { cUnid: '03', tpMed: 'VOLUMES', qCarga: '20' },
      ],
    };
    const cargo = parseCargo(infCarga);
    expect(cargo.cargoValue).toBe(100000);
    expect(cargo.predominantProduct).toBe('BOBINAS DE ACO');
    expect(cargo.quantities.length).toBe(2);
    expect(cargo.quantities[0].quantity).toBe(15000);
    expect(cargo.quantities[1].quantity).toBe(20);
  });

  it('parseModal extracts vehicle plate and driver info', () => {
    const infModal = {
      rodo: {
        RNTRC: '12345678',
        veic: { placa: 'ABC1D23', UF: 'SP', RENAVAM: '987654321' },
        moto: { xNome: 'JOAO MOTORISTA', CPF: '12345678900' },
      },
    };
    const modal = parseModal(infModal);
    expect(modal.rntrc).toBe('12345678');
    expect(modal.vehiclePlate).toBe('ABC1D23');
    expect(modal.driverName).toBe('JOAO MOTORISTA');
    expect(modal.driverCpf).toBe('12345678900');
  });

  it('parseIcms extracts CST, base, aliquot and values', () => {
    const imp = {
      ICMS: {
        ICMS00: {
          CST: '00',
          vBC: '2500,00',
          pICMS: '12,00',
          vICMS: '300,00',
        },
      },
    };
    const icms = parseIcms(imp);
    expect(icms.cst).toBe('00');
    expect(icms.base).toBe(2500);
    expect(icms.aliq).toBe(12);
    expect(icms.value).toBe(300);
  });

  it('parseBilling correctly parses invoice and duplicates', () => {
    const cobr = {
      fat: { nFat: 'FAT-999', vOrig: '5000,00', vLiq: '5000,00' },
      dup: [
        { nDup: '001', dVenc: '2026-11-10', vDup: '2500,00' },
        { nDup: '002', dVenc: '2026-12-10', vDup: '2500,00' },
      ],
    };
    const billing = parseBilling(cobr);
    expect(billing?.invoice?.number).toBe('FAT-999');
    expect(billing?.duplicates?.length).toBe(2);
    expect(billing?.duplicates?.[0].amount).toBe(2500);
  });

  it('CTeParser throws error when infCte is missing', () => {
    const parser = new CTeParser();
    expect(() => parser.parse('<xml><CTe><semInfCte>1</semInfCte></CTe></xml>', '/dummy.xml')).toThrow(
      'Formato CT-e inválido: tag infCte ausente.'
    );
  });
});

