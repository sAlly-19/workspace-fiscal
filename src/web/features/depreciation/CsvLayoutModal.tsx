import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, AlertCircle, RotateCcw, Download } from 'lucide-react';
import {
  ColumnMappingItem,
  CsvLayoutModalProps,
  ALL_FIELDS,
  DEFAULT_USER_MAPPING,
  STORAGE_KEY,
  buildPreviewColumns,
  CsvFormatOptionsBar,
  CsvFieldMappingList,
  CsvLivePreviewPane,
} from './csv-layout';

export * from './csv-layout';

export function CsvLayoutModal({
  isOpen,
  onClose,
  onExport,
  isGenerating,
  competence,
  totalRows,
  theme = 'dark',
}: CsvLayoutModalProps) {
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
          const merged = ALL_FIELDS.map((f) => {
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
    setMappings((prev) =>
      prev.map((m) => (m.id === fieldId ? { ...m, column: newCol } : m))
    );
  };

  const handleLabelChange = (fieldId: string, newLabel: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === fieldId ? { ...m, label: newLabel } : m))
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

  const activeMappings = mappings.filter((m) => m.column && m.column !== 'NONE');
  const previewColumns = buildPreviewColumns(activeMappings, numericFormat);

  // Verifica se há colunas duplicadas
  const colCounts: Record<string, number> = {};
  activeMappings.forEach((m) => {
    colCounts[m.column] = (colCounts[m.column] || 0) + 1;
  });
  const duplicates = Object.entries(colCounts)
    .filter(([_, count]) => count > 1)
    .map(([col]) => col);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border ${
          isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#111114] border-[#27272a]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}
        >
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
              isLight
                ? 'bg-white border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9]'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Notice de Duplicidade */}
          {duplicates.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Atenção: A(s) coluna(s) <b>{duplicates.join(', ')}</b> foram atribuídas a mais de um dado ao mesmo tempo.
              </span>
            </div>
          )}

          {/* Formato e Delimitadores */}
          <CsvFormatOptionsBar
            separator={separator}
            onSeparatorChange={setSeparator}
            numericFormat={numericFormat}
            onNumericFormatChange={setNumericFormat}
            dateFormat={dateFormat}
            onDateFormatChange={setDateFormat}
            isLight={isLight}
          />

          {/* Grid de Atribuição de Colunas */}
          <CsvFieldMappingList
            mappings={mappings}
            onColumnChange={handleColumnChange}
            onLabelChange={handleLabelChange}
            activeCount={activeMappings.length}
            isLight={isLight}
          />

          {/* Live Preview Accordion */}
          <CsvLivePreviewPane
            showLivePreview={showLivePreview}
            onTogglePreview={() => setShowLivePreview(!showLivePreview)}
            previewColumns={previewColumns}
            isLight={isLight}
          />
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}
        >
          <button
            onClick={handleResetDefaults}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-slate-100'
                : 'bg-[#27272a] border-[#3f3f46] text-[#a1a1aa] hover:text-white'
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
                isLight
                  ? 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-slate-100'
                  : 'bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46]'
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
