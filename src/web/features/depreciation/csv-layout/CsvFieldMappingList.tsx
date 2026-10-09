import React from 'react';
import { ColumnMappingItem } from './csv-layout.types';
import { ALL_FIELDS, AVAILABLE_COLUMNS } from './csv-layout.constants';

interface CsvFieldMappingListProps {
  mappings: ColumnMappingItem[];
  onColumnChange: (fieldId: string, newCol: string) => void;
  onLabelChange: (fieldId: string, newLabel: string) => void;
  activeCount: number;
  isLight: boolean;
}

export function CsvFieldMappingList({
  mappings,
  onColumnChange,
  onLabelChange,
  activeCount,
  isLight,
}: CsvFieldMappingListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          Mapeamento dos Dados da Depreciação
        </span>
        <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
          {activeCount} campo(s) ativos para exportação
        </span>
      </div>

      <div
        className={`rounded-xl border overflow-hidden ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
        }`}
      >
        <table className="w-full text-xs text-left border-collapse">
          <thead
            className={`border-b text-[10px] uppercase font-bold ${
              isLight
                ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]'
                : 'bg-[#0d0d10] text-[#a1a1aa] border-[#27272a]'
            }`}
          >
            <tr>
              <th className="px-3.5 py-2.5 w-1/3">Dado Gerado</th>
              <th className="px-3 py-2.5 w-32">Coluna CSV</th>
              <th className="px-3 py-2.5">Nome no Cabeçalho (Header)</th>
              <th className="px-3 py-2.5 text-right hidden sm:table-cell">Exemplo de Dado</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${
              isLight ? 'divide-[#e2e8f0] text-[#0f172a]' : 'divide-[#27272a] text-[#fafafa]'
            }`}
          >
            {ALL_FIELDS.map((field) => {
              const currentMapping = mappings.find((m) => m.id === field.id) || {
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
                      ? isLight
                        ? 'bg-white hover:bg-[#f8fafc]'
                        : 'bg-transparent hover:bg-white/[0.02]'
                      : isLight
                      ? 'bg-gray-50/70 opacity-60'
                      : 'bg-zinc-900/30 opacity-50'
                  }`}
                >
                  {/* Nome do Campo */}
                  <td className="px-3.5 py-2">
                    <div className="font-semibold flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isActive ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                      />
                      <span>{field.name}</span>
                    </div>
                  </td>

                  {/* Seletor de Coluna (A, B, C, D...) */}
                  <td className="px-3 py-1.5">
                    <select
                      value={currentMapping.column}
                      onChange={(e) => onColumnChange(field.id, e.target.value)}
                      className={`w-full px-2 py-1 rounded-md text-xs font-bold cursor-pointer border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-500'
                          : isLight
                          ? 'bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]'
                          : 'bg-[#27272a] text-[#a1a1aa] border-[#3f3f46]'
                      }`}
                    >
                      <option value="NONE">Desativada</option>
                      {AVAILABLE_COLUMNS.filter((c) => c !== 'NONE').map((col) => (
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
                      onChange={(e) => onLabelChange(field.id, e.target.value)}
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
  );
}

