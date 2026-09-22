import React, { useState, useEffect } from 'react';
import { X, Table, Download, RotateCcw, Check, SlidersHorizontal, Eye, AlertCircle } from 'lucide-react';

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

const STORAGE_KEY = 'depreciation_csv_column_mapping_v1';

export function CsvLayoutModal({
  isOpen,
  onClose,
  onExport,
  isGenerating,
  competence,
  totalRows,
  theme = 'dark',
}: {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: CsvExportOptions) => void;
  isGenerating?: boolean;
  competence: string;
  totalRows: number;
  theme?: string;
}) {
  const isLight = theme === 'light';

  const [mappings, setMappings] = useState<ColumnMappingItem[]>(DEFAULT_USER_MAPPING);
  const [separator, setSeparator] = useState<';' | ','>(';');
  const [numericFormat, setNumericFormat] = useState<'RAW' | 'BRL'>('RAW');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Carrega mapeamento salvo do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mappings && Array.isArray(parsed.mappings)) {
          // Merge com campos disponíveis para garantir que nenhum campo falte
          const merged = ALL_FIELDS.map(f => {
            const match = parsed.mappings.find((m: ColumnMappingItem) => m.id === f.id);
            return match || { id: f.id, column: f.defaultCol, label: f.defaultLabel };
          });
          setMappings(merged);
        }
        if (parsed.separator) setSeparator(parsed.separator);
        if (parsed.numericFormat) setNumericFormat(parsed.numericFormat);
        if (parsed.dateFormat) setDateFormat(parsed.dateFormat);
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const handleColumnChange = (fieldId: string, newCol: string) => {
    setMappings(prev =>
      prev.map(m => (m.id === fieldId ? { ...m, column: newCol } : m))
    );
  };

  const handleLabelChange = (fieldId: string, newLabel: string) => {
    setMappings(prev =>
      prev.map(m => (m.id === fieldId ? { ...m, label: newLabel } : m))
    );
  };

  const handleResetDefaults = () => {
    setMappings(DEFAULT_USER_MAPPING);
    setSeparator(';');
    setNumericFormat('RAW');
    setDateFormat('DD/MM/YYYY');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleSaveAndExport = () => {
    // Salva preferências no localStorage
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mappings, separator, numericFormat, dateFormat })
      );
    } catch {}

    onExport({
      separator,
      numericFormat,
      dateFormat,
      columns: mappings,
    });
  };

  // Cálculo das colunas para Live Preview
  const activeMappings = mappings.filter(m => m.column && m.column !== 'NONE');
  
  // Encontra maior coluna
  const colLetterToIndex = (col: string) => {
    if (!col || col === 'NONE') return -1;
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
      idx = idx * 26 + (col.charCodeAt(i) - 64);
    }
    return idx - 1;
  };

  const indexToColLetter = (idx: number) => {
    let letter = '';
    let temp = idx + 1;
    while (temp > 0) {
      const mod = (temp - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      temp = Math.floor((temp - mod) / 26);
    }
    return letter;
  };

  const maxColIndex = activeMappings.length > 0
    ? Math.max(...activeMappings.map(m => colLetterToIndex(m.column)))
    : 0;

  // Monta linha de visualização de A até maxColIndex
  const previewColumns: Array<{ colLetter: string; fieldId?: string; headerLabel: string; sampleVal: string }> = [];
  for (let i = 0; i <= maxColIndex; i++) {
    const letter = indexToColLetter(i);
    const match = activeMappings.find(m => m.column.toUpperCase() === letter);
    if (match) {
      const fieldDef = ALL_FIELDS.find(f => f.id === match.id);
      let sample = fieldDef?.sampleVal || '';
      if (match.id === 'depreciationValue' || match.id === 'acquisitionValue' || match.id === 'accumulatedValue' || match.id === 'currentValue') {
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

  // Verifica se há colunas duplicadas
  const colCounts: Record<string, number> = {};
  activeMappings.forEach(m => {
    colCounts[m.column] = (colCounts[m.column] || 0) + 1;
  });
  const duplicates = Object.entries(colCounts).filter(([_, count]) => count > 1).map(([col]) => col);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
        isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#111114] border-[#27272a]'
      }`}>
        {/* Modal Header */}
        <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Personalizar Layout de Colunas do CSV
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Defina qual coluna (A, B, C...) cada dado ocupará no arquivo exportado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'bg-white border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9]' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Notice */}
          {duplicates.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Atenção: A(s) coluna(s) <b>{duplicates.join(', ')}</b> foram atribuídas a mais de um dado ao mesmo tempo.</span>
            </div>
          )}

          {/* Formato e Delimitadores */}
          <div className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b]/50 border-[#27272a]'
          }`}>
            <div>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Separador de Colunas
              </label>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value as ';' | ',')}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#27272a] text-white'
                }`}
              >
                <option value=";">Ponto e vírgula ( ; ) — Padrão Brasil / Excel</option>
                <option value=",">Vírgula ( , ) — Padrão Internacional</option>
              </select>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Formato Numérico
              </label>
              <select
                value={numericFormat}
                onChange={(e) => setNumericFormat(e.target.value as 'RAW' | 'BRL')}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#27272a] text-white'
                }`}
              >
                <option value="RAW">Decimal sem R$ (ex: 1234,56) — Melhor para ERPs</option>
                <option value="BRL">Formatado com R$ (ex: R$ 1.234,56)</option>
              </select>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Formato de Data
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as 'DD/MM/YYYY' | 'YYYY-MM-DD')}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#27272a] text-white'
                }`}
              >
                <option value="DD/MM/YYYY">DD/MM/AAAA (ex: 31/08/2026)</option>
                <option value="YYYY-MM-DD">AAAA-MM-DD (ex: 2026-08-31)</option>
              </select>
            </div>
          </div>

          {/* Grid de Atribuição de Colunas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Mapeamento dos Dados da Depreciação
              </span>
              <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                {activeMappings.length} campo(s) ativos para exportação
              </span>
            </div>

            <div className={`rounded-xl border overflow-hidden ${
              isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}>
              <table className="w-full text-xs text-left border-collapse">
                <thead className={`border-b text-[10px] uppercase font-bold ${
                  isLight ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]' : 'bg-[#0d0d10] text-[#a1a1aa] border-[#27272a]'
                }`}>
                  <tr>
                    <th className="px-3.5 py-2.5 w-1/3">Dado Gerado</th>
                    <th className="px-3 py-2.5 w-32">Coluna CSV</th>
                    <th className="px-3 py-2.5">Nome no Cabeçalho (Header)</th>
                    <th className="px-3 py-2.5 text-right hidden sm:table-cell">Exemplo de Dado</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isLight ? 'divide-[#e2e8f0] text-[#0f172a]' : 'divide-[#27272a] text-[#fafafa]'
                }`}>
                  {ALL_FIELDS.map(field => {
                    const currentMapping = mappings.find(m => m.id === field.id) || {
                      id: field.id,
                      column: field.defaultCol,
                      label: field.defaultLabel,
                    };
                    const isActive = currentMapping.column !== 'NONE';

                    return (
                      <tr
                        key={field.id}
                        className={`transition-colors ${
                          isActive
                            ? isLight ? 'bg-white hover:bg-[#f8fafc]' : 'bg-transparent hover:bg-white/[0.02]'
                            : isLight ? 'bg-gray-50/70 opacity-60' : 'bg-zinc-900/30 opacity-50'
                        }`}
                      >
                        {/* Nome do Campo */}
                        <td className="px-3.5 py-2">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-500' : 'bg-gray-400'}`} />
                            <span>{field.name}</span>
                          </div>
                        </td>

                        {/* Seletor de Coluna (A, B, C, D...) */}
                        <td className="px-3 py-1.5">
                          <select
                            value={currentMapping.column}
                            onChange={(e) => handleColumnChange(field.id, e.target.value)}
                            className={`w-full px-2 py-1 rounded-md text-xs font-bold cursor-pointer border ${
                              isActive
                                ? 'bg-blue-600 text-white border-blue-500'
                                : isLight
                                ? 'bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]'
                                : 'bg-[#27272a] text-[#a1a1aa] border-[#3f3f46]'
                            }`}
                          >
                            <option value="NONE">Desativada</option>
                            {AVAILABLE_COLUMNS.filter(c => c !== 'NONE').map(col => (
                              <option key={col} value={col}>
                                Coluna {col}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Rótulo Customizado */}
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            disabled={!isActive}
                            value={currentMapping.label ?? field.defaultLabel}
                            onChange={(e) => handleLabelChange(field.id, e.target.value)}
                            placeholder={field.defaultLabel}
                            className={`w-full px-2.5 py-1 rounded-md border text-xs transition-colors ${
                              !isActive
                                ? 'opacity-40 cursor-not-allowed bg-transparent border-transparent'
                                : isLight
                                ? 'bg-white border-[#cbd5e1] focus:border-blue-500 text-[#0f172a]'
                                : 'bg-[#18181b] border-[#27272a] focus:border-blue-500 text-white'
                            }`}
                          />
                        </td>

                        {/* Amostra do Dado */}
                        <td className="px-3 py-2 text-right font-mono text-[11px] text-[#64748b] hidden sm:table-cell">
                          {field.sampleVal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Preview Accordion */}
          <div className={`rounded-xl border overflow-hidden ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}>
            <div
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:opacity-90"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  Pré-visualização do Layout do Arquivo ({previewColumns.length} colunas no CSV)
                </span>
              </div>
              <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                {showLivePreview ? 'Ocultar' : 'Exibir'}
              </span>
            </div>

            {showLivePreview && (
              <div className="p-3 border-t overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-gray-400/30">
                  <thead>
                    <tr className={isLight ? 'bg-blue-50 text-blue-900 font-bold' : 'bg-blue-950/30 text-blue-300 font-bold'}>
                      {previewColumns.map(col => (
                        <th key={col.colLetter} className="px-2.5 py-1.5 border border-gray-400/30 font-mono text-center">
                          Coluna {col.colLetter}
                        </th>
                      ))}
                    </tr>
                    <tr className={isLight ? 'bg-gray-100 font-semibold' : 'bg-zinc-800 font-semibold'}>
                      {previewColumns.map(col => (
                        <th key={col.colLetter} className="px-2.5 py-1 border border-gray-400/30 text-[11px]">
                          {col.headerLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={isLight ? 'bg-white' : 'bg-zinc-900/60'}>
                      {previewColumns.map(col => (
                        <td key={col.colLetter} className="px-2.5 py-1.5 border border-gray-400/30 text-[11px] font-mono">
                          {col.sampleVal || <span className="text-gray-400 italic">(vazia)</span>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
        }`}>
          <button
            onClick={handleResetDefaults}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLight ? 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-slate-100' : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa] hover:text-white'
            }`}
            title="Redefinir para o layout padrão (A: Data, B: Descrição, D: Categoria, F: Nº Doc, G: Valor)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-slate-100' : 'bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46]'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndExport}
              disabled={isGenerating || activeMappings.length === 0}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? 'Exportando...' : 'Salvar e Exportar CSV'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

