export interface ColumnMappingItem {
  id: string;
  column: string; // 'A' | 'B' | 'C' ... or 'NONE'
  label?: string;
}

export interface CsvExportOptions {
  separator: ';' | ',';
  numericFormat: 'RAW' | 'BRL';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  columns: ColumnMappingItem[];
}

export interface FieldDef {
  id: string;
  name: string;
  category: 'essencial' | 'patrimonio' | 'calculo';
  defaultCol: string;
  defaultLabel: string;
  sampleVal: string;
}

export interface CsvLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: CsvExportOptions) => void;
  isGenerating?: boolean;
  competence: string;
  totalRows: number;
  theme?: string;
}

export interface PreviewColumn {
  colLetter: string;
  fieldId?: string;
  headerLabel: string;
  sampleVal: string;
}

