import React from 'react';
import { Folder } from 'lucide-react';

interface StorageFolderCardProps {
  defaultFolder: string;
  onSelectFolder: () => void;
  isLight: boolean;
}

export function StorageFolderCard({
  defaultFolder,
  onSelectFolder,
  isLight,
}: StorageFolderCardProps) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider ${
          isLight ? 'text-[#0f172a]' : 'text-white'
        }`}
      >
        <Folder className="w-4 h-4 text-purple-500" />
        <span>Pasta de Armazenamento dos Documentos</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={defaultFolder || 'Pasta padrão do sistema (userData/documents)'}
          className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
            isLight
              ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#111114] border-[#27272a] text-slate-300'
          }`}
        />
        <button
          type="button"
          onClick={onSelectFolder}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Alterar</span>
        </button>
      </div>
      <p className={`text-[11px] mt-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
        Local onde os arquivos XML e PDFs baixados pela SEFAZ serão arquivados, organizados
        por CNPJ e ano/mês.
      </p>
    </div>
  );
}

