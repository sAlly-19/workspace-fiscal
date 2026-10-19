import { describe, it, expect } from 'vitest';
import {
  matchCompanyByPriority,
  getSuggestedPlaque,
  formatBrlValue,
  parseBrlInputToCents,
  extractItemPreFill,
  CompanyParticipant,
} from './depreciate-modal.utils';

describe('Depreciate Document Modal Logic & Utilities (TDD)', () => {
  const registeredCompanies = [
    {
      id: 'comp-dest-1',
      name: 'Empresa Destinatária Oficial Ltda',
      cnpj: '44555666000188',
      document: '44555666000188',
    },
    {
      id: 'comp-emit-2',
      name: 'Fornecedor Emitente SA',
      cnpj: '11222333000199',
      document: '11222333000199',
    },
  ];

  it('1. Prioridade de sugestão: Destinatário/Tomador tem precedência sobre Emitente/Remetente', () => {
    const dest: CompanyParticipant = {
      name: 'Empresa Destinatária Oficial Ltda',
      document: '44.555.666/0001-88',
      cleanDocument: '44555666000188',
    };
    const emit: CompanyParticipant = {
      name: 'Fornecedor Emitente SA',
      document: '11.222.333/0001-99',
      cleanDocument: '11222333000199',
    };

    const match = matchCompanyByPriority(registeredCompanies, dest, emit);

    expect(match).not.toBeNull();
    expect(match?.company.id).toBe('comp-dest-1');
    expect(match?.source).toBe('DESTINATARIO');
    expect(match?.badgeText).toContain('Destinatário');
  });

  it('2. Fallback de sugestão: se Destinatário não estiver cadastrado, sugere Emitente se este existir', () => {
    const dest: CompanyParticipant = {
      name: 'Cliente Não Cadastrado Ltda',
      document: '99.888.777/0001-66',
      cleanDocument: '99888777000166',
    };
    const emit: CompanyParticipant = {
      name: 'Fornecedor Emitente SA',
      document: '11.222.333/0001-99',
      cleanDocument: '11222333000199',
    };

    const match = matchCompanyByPriority(registeredCompanies, dest, emit);

    expect(match).not.toBeNull();
    expect(match?.company.id).toBe('comp-emit-2');
    expect(match?.source).toBe('EMITENTE');
    expect(match?.badgeText).toContain('Emitente');
  });

  it('3. Cadastro 1-Clique: quando nenhuma empresa estiver cadastrada, retorna dados para criação imediata', () => {
    const dest: CompanyParticipant = {
      name: 'Nova Empresa Destino SA',
      document: '77.888.999/0001-55',
      cleanDocument: '77888999000155',
      state: 'SP',
      city: 'Campinas',
    };
    const emit: CompanyParticipant = {
      name: 'Fornecedor Outro Ltda',
      document: '33.444.555/0001-22',
      cleanDocument: '33444555000122',
    };

    const match = matchCompanyByPriority(registeredCompanies, dest, emit);
    expect(match).toBeNull();
  });

  it('4. Sugestão de Plaqueta / Código segue padrão IMOB-{numeroNota}-{nItem}', () => {
    expect(getSuggestedPlaque('12345', 1)).toBe('IMOB-12345-1');
    expect(getSuggestedPlaque('999', 3)).toBe('IMOB-999-3');
    expect(getSuggestedPlaque('', 1)).toBe('IMOB-0-1');
  });

  it('5. Alternância de itens atualiza descrição, valor de aquisição, NCM e plaqueta', () => {
    const items = [
      {
        itemIndex: 1,
        code: 'PROD-A',
        description: 'Servidor Dell PowerEdge R750',
        quantity: 1,
        unitPrice: 15000,
        totalPrice: 15000,
        totalPriceCents: 1500000,
        ncm: '84715010',
      },
      {
        itemIndex: 2,
        code: 'PROD-B',
        description: 'Switch Cisco Catalyst 24 Portas',
        quantity: 2,
        unitPrice: 3500,
        totalPrice: 7000,
        totalPriceCents: 700000,
        ncm: '85176259',
      },
    ];

    const item1Prefill = extractItemPreFill(items[0], '54321');
    expect(item1Prefill.description).toBe('Servidor Dell PowerEdge R750');
    expect(item1Prefill.acquisitionValueFormatted).toBe('15000,00');
    expect(item1Prefill.ncm).toBe('84715010');
    expect(item1Prefill.code).toBe('IMOB-54321-1');

    const item2Prefill = extractItemPreFill(items[1], '54321');
    expect(item2Prefill.description).toBe('Switch Cisco Catalyst 24 Portas');
    expect(item2Prefill.acquisitionValueFormatted).toBe('7000,00');
    expect(item2Prefill.ncm).toBe('85176259');
    expect(item2Prefill.code).toBe('IMOB-54321-2');
  });

  it('6. Formatação e parse de valores em reais (BRL)', () => {
    expect(formatBrlValue(4500.5)).toBe('4500,50');
    expect(formatBrlValue(100)).toBe('100,00');
    expect(parseBrlInputToCents('4500,50')).toBe(450050);
    expect(parseBrlInputToCents('R$ 1.250,99')).toBe(125099);
  });
});
