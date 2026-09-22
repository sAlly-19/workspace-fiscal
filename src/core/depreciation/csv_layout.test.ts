import { describe, it, expect } from 'vitest';
import { colLetterToIndex, DEFAULT_COLUMN_MAPPINGS } from '../../api/services/depreciation.service';

describe('CSV Column Layout and Formatting', () => {
  it('correctly maps column letters to 0-based indexes', () => {
    expect(colLetterToIndex('A')).toBe(0);
    expect(colLetterToIndex('B')).toBe(1);
    expect(colLetterToIndex('C')).toBe(2);
    expect(colLetterToIndex('D')).toBe(3);
    expect(colLetterToIndex('E')).toBe(4);
    expect(colLetterToIndex('F')).toBe(5);
    expect(colLetterToIndex('G')).toBe(6);
    expect(colLetterToIndex('Z')).toBe(25);
    expect(colLetterToIndex('AA')).toBe(26);
    expect(colLetterToIndex('NONE')).toBe(-1);
    expect(colLetterToIndex('')).toBe(-1);
  });

  it('has the expected default column mapping requested by the user', () => {
    const map = new Map(DEFAULT_COLUMN_MAPPINGS.map(m => [m.id, m.column]));
    expect(map.get('date')).toBe('A');
    expect(map.get('description')).toBe('B');
    expect(map.get('category')).toBe('D');
    expect(map.get('documentNumber')).toBe('F');
    expect(map.get('depreciationValue')).toBe('G');
  });

  it('correctly builds sparse columns with empty positions (e.g. C and E empty)', () => {
    const userCols = [
      { id: 'date', column: 'A', label: 'Data' },
      { id: 'description', column: 'B', label: 'Descrição' },
      { id: 'category', column: 'D', label: 'Categoria' },
      { id: 'documentNumber', column: 'F', label: 'Nº Doc' },
      { id: 'depreciationValue', column: 'G', label: 'Valor' },
    ];

    const validCols = userCols
      .map(c => ({ ...c, index: colLetterToIndex(c.column) }))
      .filter(c => c.index >= 0);

    const maxColIndex = Math.max(...validCols.map(c => c.index));
    expect(maxColIndex).toBe(6); // Coluna G é índice 6

    const headerRow: string[] = new Array(maxColIndex + 1).fill('');
    validCols.forEach(c => {
      headerRow[c.index] = c.label;
    });

    // Separação por ';'
    const header = headerRow.join(';');
    expect(header).toBe('Data;Descrição;;Categoria;;Nº Doc;Valor');

    // Linha de dados com caracteres acentuados
    const dataValues: Record<string, string> = {
      date: '30/09/2026',
      description: 'Depreciação NF 1234, 09/2026',
      category: 'Veículos & Instalações',
      documentNumber: 'NF 1234',
      depreciationValue: '150,00',
    };

    const dataRow: string[] = new Array(maxColIndex + 1).fill('');
    validCols.forEach(c => {
      dataRow[c.index] = dataValues[c.id] || '';
    });
    const line = dataRow.join(';');
    expect(line).toBe('30/09/2026;Depreciação NF 1234, 09/2026;;Veículos & Instalações;;NF 1234;150,00');

    // Verifica presença do BOM UTF-8 (\uFEFF)
    const csv = '\uFEFF' + [header, line].join('\r\n');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });
});

