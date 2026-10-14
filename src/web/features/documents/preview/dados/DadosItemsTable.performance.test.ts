import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DadosItemsTable } from './DadosItemsTable';

describe('DadosItemsTable - Performance & Chunking for Large Invoices (IMP-013)', () => {
  const generateMockItems = (count: number) => {
    return Array.from({ length: count }).map((_, idx) => ({
      id: `item-${idx + 1}`,
      code: `PRD-${idx + 1}`,
      description: `PRODUTO FISCAL ${idx + 1}`,
      ncm: '84713012',
      cfop: '5102',
      unit: 'UN',
      quantity: 1,
      unitPrice: 10 + idx,
      totalPrice: 10 + idx,
    }));
  };

  it('renders only the first 50 items initially when an invoice has 120 items and displays expansion control', () => {
    const items120 = generateMockItems(120);
    const html = renderToStaticMarkup(
      React.createElement(DadosItemsTable, { items: items120, isLight: false })
    );

    // Header counter should show total items count
    expect(html).toContain('Itens da Nota (120)');
    // Item 1 and 50 should be present
    expect(html).toContain('PRODUTO FISCAL 1');
    expect(html).toContain('PRODUTO FISCAL 50');
    // Item 51 and 120 should NOT be rendered in initial batch
    expect(html).not.toContain('PRODUTO FISCAL 51');
    expect(html).not.toContain('PRODUTO FISCAL 120');

    // Expansion footer should be visible
    expect(html).toContain('Exibindo 50 de 120 itens');
    expect(html).toContain('Mostrar todos os 120 itens');
  });

  it('renders all items without expansion footer when items count is within initial limit (<= 50)', () => {
    const items20 = generateMockItems(20);
    const html = renderToStaticMarkup(
      React.createElement(DadosItemsTable, { items: items20, isLight: true })
    );

    expect(html).toContain('Itens da Nota (20)');
    expect(html).toContain('PRODUTO FISCAL 1');
    expect(html).toContain('PRODUTO FISCAL 20');
    expect(html).not.toContain('Exibindo 50 de');
    expect(html).not.toContain('Mostrar todos');
  });

  it('renders null when items list is empty or undefined (backward compatibility)', () => {
    expect(DadosItemsTable({ items: [], isLight: false })).toBeNull();
    expect(DadosItemsTable({ items: undefined, isLight: false })).toBeNull();
  });
});

