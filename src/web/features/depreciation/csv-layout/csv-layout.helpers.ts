import { ColumnMappingItem, PreviewColumn } from './csv-layout.types';
import { ALL_FIELDS } from './csv-layout.constants';

export function colLetterToIndex(col: string): number {
  if (!col || col === 'NONE') return -1;
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

export function indexToColLetter(idx: number): string {
  let letter = '';
  let temp = idx + 1;
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

export function buildPreviewColumns(
  activeMappings: ColumnMappingItem[],
  numericFormat: 'RAW' | 'BRL'
): PreviewColumn[] {
  const maxColIndex = activeMappings.length > 0
    ? Math.max(...activeMappings.map(m => colLetterToIndex(m.column)))
    : 0;

  const previewColumns: PreviewColumn[] = [];
  for (let i = 0; i <= maxColIndex; i++) {
    const letter = indexToColLetter(i);
    const match = activeMappings.find(m => m.column.toUpperCase() === letter);
    if (match) {
      const fieldDef = ALL_FIELDS.find(f => f.id === match.id);
      let sample = fieldDef?.sampleVal || '';
      if (
        match.id === 'depreciationValue' ||
        match.id === 'acquisitionValue' ||
        match.id === 'accumulatedValue' ||
        match.id === 'currentValue'
      ) {
        sample = numericFormat === 'BRL' ? `R$ ${sample}` : sample;
      }
      previewColumns.push({
        colLetter: letter,
        fieldId: match.id,
        headerLabel: match.label || fieldDef?.defaultLabel || letter,
        sampleVal: sample,
      });
    } else {
      previewColumns.push({
        colLetter: letter,
        headerLabel: '(vazia)',
        sampleVal: '',
      });
    }
  }

  return previewColumns;
}

