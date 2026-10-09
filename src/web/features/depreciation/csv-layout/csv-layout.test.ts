import { describe, it, expect } from 'vitest';
import {
  colLetterToIndex,
  indexToColLetter,
  buildPreviewColumns,
  ALL_FIELDS,
  DEFAULT_USER_MAPPING,
} from './index';

describe('CSV Layout Modules & Helpers', () => {
  it('correctly converts column letters to 0-based indices and back', () => {
    expect(colLetterToIndex('A')).toBe(0);
    expect(colLetterToIndex('B')).toBe(1);
    expect(colLetterToIndex('Z')).toBe(25);
    expect(colLetterToIndex('AA')).toBe(26);
    expect(colLetterToIndex('NONE')).toBe(-1);

    expect(indexToColLetter(0)).toBe('A');
    expect(indexToColLetter(1)).toBe('B');
    expect(indexToColLetter(25)).toBe('Z');
    expect(indexToColLetter(26)).toBe('AA');
  });

  it('DEFAULT_USER_MAPPING contains all ALL_FIELDS definitions', () => {
    expect(DEFAULT_USER_MAPPING.length).toBe(ALL_FIELDS.length);
    const dateMapping = DEFAULT_USER_MAPPING.find(m => m.id === 'date');
    expect(dateMapping).toBeDefined();
    expect(dateMapping?.column).toBe('A');
    expect(dateMapping?.label).toBe('Data');
  });

  it('buildPreviewColumns formats currency with BRL prefix when requested', () => {
    const activeMappings = [
      { id: 'date', column: 'A', label: 'Data' },
      { id: 'depreciationValue', column: 'B', label: 'Valor' },
    ];

    const rawPreview = buildPreviewColumns(activeMappings, 'RAW');
    expect(rawPreview.length).toBe(2);
    expect(rawPreview[0].colLetter).toBe('A');
    expect(rawPreview[1].colLetter).toBe('B');
    expect(rawPreview[1].sampleVal).toBe('75,00');

    const brlPreview = buildPreviewColumns(activeMappings, 'BRL');
    expect(brlPreview[1].sampleVal).toBe('R$ 75,00');
  });

  it('buildPreviewColumns creates empty placeholder for gap columns', () => {
    const activeMappings = [
      { id: 'date', column: 'A', label: 'Data' },
      { id: 'depreciationValue', column: 'C', label: 'Valor' },
    ];

    const preview = buildPreviewColumns(activeMappings, 'RAW');
    expect(preview.length).toBe(3); // A, B (vazia), C
    expect(preview[0].colLetter).toBe('A');
    expect(preview[1].colLetter).toBe('B');
    expect(preview[1].headerLabel).toBe('(vazia)');
    expect(preview[1].sampleVal).toBe('');
    expect(preview[2].colLetter).toBe('C');
  });
});

