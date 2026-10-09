import React from 'react';
import { Eye } from 'lucide-react';
import { PreviewColumn } from './csv-layout.types';

interface CsvLivePreviewPaneProps {
  showLivePreview: boolean;
  onTogglePreview: () => void;
  previewColumns: PreviewColumn[];
  isLight: boolean;
}

export function CsvLivePreviewPane({
  showLivePreview,
  onTogglePreview,
  previewColumns,
  isLight,
}: CsvLivePreviewPaneProps) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
      }`}
    >
      <div
        onClick={onTogglePreview}
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
              <tr
                className={
                  isLight
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'bg-blue-950/30 text-blue-300 font-bold'
                }
              >
                {previewColumns.map((col) => (
                  <th
                    key={col.colLetter}
                    className="px-2.5 py-1.5 border border-gray-400/30 font-mono text-center"
                  >
                    Coluna {col.colLetter}
                  </th>
                ))}
              </tr>
              <tr
                className={
                  isLight ? 'bg-gray-100 font-semibold' : 'bg-zinc-800 font-semibold'
                }
              >
                {previewColumns.map((col) => (
                  <th
                    key={col.colLetter}
                    className="px-2.5 py-1 border border-gray-400/30 text-[11px]"
                  >
                    {col.headerLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={isLight ? 'bg-white' : 'bg-zinc-900/60'}>
                {previewColumns.map((col) => (
                  <td
                    key={col.colLetter}
                    className="px-2.5 py-1.5 border border-gray-400/30 text-[11px] font-mono"
                  >
                    {col.sampleVal || <span className="text-gray-400 italic">(vazia)</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

