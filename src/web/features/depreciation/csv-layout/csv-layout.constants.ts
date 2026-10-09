import { FieldDef, ColumnMappingItem } from './csv-layout.types';

export const ALL_FIELDS: FieldDef[] = [
  { id: 'date', name: 'Data do Lançamento', category: 'essencial', defaultCol: 'A', defaultLabel: 'Data', sampleVal: '31/08/2026' },
  { id: 'description', name: 'Descrição / Histórico Contábil', category: 'essencial', defaultCol: 'B', defaultLabel: 'Descrição', sampleVal: 'Depreciação NF 1234, 08/2026' },
  { id: 'category', name: 'Categoria / Tipo do Ativo', category: 'essencial', defaultCol: 'D', defaultLabel: 'Categoria', sampleVal: 'Máquinas e Equipamentos' },
  { id: 'documentNumber', name: 'Número do Documento / NF', category: 'essencial', defaultCol: 'F', defaultLabel: 'Nº Doc', sampleVal: 'NF 1234' },
  { id: 'depreciationValue', name: 'Valor da Depreciação (Mês)', category: 'calculo', defaultCol: 'G', defaultLabel: 'Valor', sampleVal: '75,00' },
  { id: 'supplier', name: 'Fornecedor / Razão Social', category: 'patrimonio', defaultCol: 'NONE', defaultLabel: 'Fornecedor', sampleVal: 'Dell Computadores do Brasil' },
  { id: 'assetDescription', name: 'Descrição Original do Bem', category: 'patrimonio', defaultCol: 'NONE', defaultLabel: 'Descrição do Bem', sampleVal: 'Notebook Dell Inspiron 15' },
  { id: 'acquisitionDate', name: 'Data de Aquisição', category: 'patrimonio', defaultCol: 'NONE', defaultLabel: 'Data Aquisição', sampleVal: '15/01/2025' },
  { id: 'acquisitionValue', name: 'Valor de Aquisição', category: 'patrimonio', defaultCol: 'NONE', defaultLabel: 'Valor Aquisição', sampleVal: '4.500,00' },
  { id: 'annualRate', name: 'Taxa Anual de Depreciação', category: 'calculo', defaultCol: 'NONE', defaultLabel: 'Taxa Anual', sampleVal: '20%' },
  { id: 'accumulatedValue', name: 'Depreciação Acumulada', category: 'calculo', defaultCol: 'NONE', defaultLabel: 'Deprec. Acumulada', sampleVal: '1.425,00' },
  { id: 'currentValue', name: 'Valor Residual Atual (Contábil)', category: 'calculo', defaultCol: 'NONE', defaultLabel: 'Saldo Residual', sampleVal: '3.075,00' },
  { id: 'competence', name: 'Competência', category: 'essencial', defaultCol: 'NONE', defaultLabel: 'Competência', sampleVal: '2026-08' },
];

export const AVAILABLE_COLUMNS = [
  'NONE',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'
];

export const DEFAULT_USER_MAPPING: ColumnMappingItem[] = ALL_FIELDS.map(f => ({
  id: f.id,
  column: f.defaultCol,
  label: f.defaultLabel,
}));

export const STORAGE_KEY = 'depreciation_csv_column_mapping_v1';

