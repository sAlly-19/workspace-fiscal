export interface ColumnMappingItem {
  id: string;
  column: string;
  label?: string;
}

export const DEFAULT_COLUMN_MAPPINGS: ColumnMappingItem[] = [
  { id: 'date', column: 'A', label: 'Data' },
  { id: 'description', column: 'B', label: 'Descrição' },
  { id: 'category', column: 'D', label: 'Categoria' },
  { id: 'documentNumber', column: 'F', label: 'Nº Doc' },
  { id: 'depreciationValue', column: 'G', label: 'Valor' },
];

export interface DepreciationCsvRow {
  competence: string;
  documentNumber: string;
  description?: string;
  assetDescription?: string;
  categoryName?: string | null;
  supplier?: string;
  acquisitionDate?: string | Date;
  acquisitionValue: number;
  annualRate: number;
  depreciationValue: number;
  accumulatedValue: number;
  currentValue: number;
  status?: string;
}

export function colLetterToIndex(col: string): number {
  if (!col || col === 'NONE') return -1;
  const upper = col.trim().toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function formatDepreciationRowsToCsv(
  rows: DepreciationCsvRow[],
  options?: {
    separator?: string;
    numericFormat?: 'BRL' | 'RAW';
    dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
    columns?: ColumnMappingItem[];
  }
): string {
  const sep = options?.separator || ';';

  // Escape separador e aspas duplas
  const esc = (v: string) => {
    if (v.includes(sep) || v.includes('"') || v.includes('\n') || v.includes('\r')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  // Mapeamento de colunas solicitado pelo usuário (padrão: A: Data, B: Descrição, D: Categoria, F: Nº Doc, G: Valor)
  const userCols = options?.columns && options.columns.length > 0
    ? options.columns.filter(c => c.column && c.column !== 'NONE')
    : DEFAULT_COLUMN_MAPPINGS;

  const validCols = userCols
    .map(c => ({ ...c, index: colLetterToIndex(c.column) }))
    .filter(c => c.index >= 0);

  const maxColIndex = validCols.length > 0 ? Math.max(...validCols.map(c => c.index)) : 0;

  // Cabeçalho montado conforme as posições das colunas
  const headerRow: string[] = new Array(maxColIndex + 1).fill('');
  validCols.forEach(c => {
    const defaultLabel = DEFAULT_COLUMN_MAPPINGS.find(d => d.id === c.id)?.label || c.id;
    headerRow[c.index] = c.label || defaultLabel;
  });
  const header = headerRow.map(esc).join(sep);

  const formatNum = (cents: number) => {
    const raw = (cents / 100).toFixed(2).replace('.', ',');
    return options?.numericFormat === 'BRL' ? `R$ ${raw}` : raw;
  };

  const lines = rows.map((r) => {
    // Data = último dia da competência
    const [y, m] = r.competence.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const dateStr = options?.dateFormat === 'YYYY-MM-DD'
      ? `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      : `${String(lastDay).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

    const docNumFormatted = r.documentNumber.startsWith('NF ') ? r.documentNumber : `NF ${r.documentNumber}`;

    const fieldValues: Record<string, string> = {
      date: dateStr,
      description: `Depreciação ${docNumFormatted}, ${String(m).padStart(2, '0')}/${y}`,
      assetDescription: r.assetDescription || r.description || '',
      category: r.categoryName || 'Outros',
      documentNumber: docNumFormatted,
      supplier: r.supplier || '',
      acquisitionDate: r.acquisitionDate ? new Date(r.acquisitionDate).toLocaleDateString('pt-BR') : '',
      acquisitionValue: formatNum(r.acquisitionValue),
      annualRate: `${r.annualRate}%`,
      depreciationValue: formatNum(r.depreciationValue),
      accumulatedValue: formatNum(r.accumulatedValue),
      currentValue: formatNum(r.currentValue),
      competence: r.competence,
      status: r.status === 'current' ? 'ATUAL' : r.status === 'exported' ? 'EXPORTADO' : (r.status || ''),
    };

    const rowCols: string[] = new Array(maxColIndex + 1).fill('');
    validCols.forEach(c => {
      rowCols[c.index] = esc(fieldValues[c.id] ?? '');
    });

    return rowCols.join(sep);
  });

  // UTF-8 BOM (\uFEFF) explícito e CRLF (\r\n) para evitar corrupção de acentuação no Excel do Windows
  return '\uFEFF' + [header, ...lines].join('\r\n');
}
