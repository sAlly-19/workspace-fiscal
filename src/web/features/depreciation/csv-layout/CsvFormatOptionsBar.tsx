import React from 'react';

interface CsvFormatOptionsBarProps {
  separator: ';' | ',';
  onSeparatorChange: (sep: ';' | ',') => void;
  numericFormat: 'RAW' | 'BRL';
  onNumericFormatChange: (fmt: 'RAW' | 'BRL') => void;
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  onDateFormatChange: (fmt: 'DD/MM/YYYY' | 'YYYY-MM-DD') => void;
  isLight: boolean;
}

export function CsvFormatOptionsBar({
  separator,
  onSeparatorChange,
  numericFormat,
  onNumericFormatChange,
  dateFormat,
  onDateFormatChange,
  isLight,
}: CsvFormatOptionsBarProps) {
  return (
    <div
      className={`p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 ${
        isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b]/50 border-[#27272a]'
      }`}
    >
      <div>
        <label
          className={`block text-[10px] font-bold uppercase mb-1 ${
            isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'
          }`}
        >
          Separador de Colunas
        </label>
        <select
          value={separator}
          onChange={(e) => onSeparatorChange(e.target.value as ';' | ',')}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#27272a] text-white'
          }`}
        >
          <option value=";">Ponto e vírgula ( ; ) — Padrão Brasil / Excel</option>
          <option value=",">Vírgula ( , ) — Padrão Internacional</option>
        </select>
      </div>

      <div>
        <label
          className={`block text-[10px] font-bold uppercase mb-1 ${
            isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'
          }`}
        >
          Formato Numérico
        </label>
        <select
          value={numericFormat}
          onChange={(e) => onNumericFormatChange(e.target.value as 'RAW' | 'BRL')}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#27272a] text-white'
          }`}
        >
          <option value="RAW">Decimal sem R$ (ex: 1234,56) — Melhor para ERPs</option>
          <option value="BRL">Formatado com R$ (ex: R$ 1.234,56)</option>
        </select>
      </div>

      <div>
        <label
          className={`block text-[10px] font-bold uppercase mb-1 ${
            isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'
          }`}
        >
          Formato de Data
        </label>
        <select
          value={dateFormat}
          onChange={(e) => onDateFormatChange(e.target.value as 'DD/MM/YYYY' | 'YYYY-MM-DD')}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#27272a] text-white'
          }`}
        >
          <option value="DD/MM/YYYY">DD/MM/AAAA (ex: 31/08/2026)</option>
          <option value="YYYY-MM-DD">AAAA-MM-DD (ex: 2026-08-31)</option>
        </select>
      </div>
    </div>
  );
}

