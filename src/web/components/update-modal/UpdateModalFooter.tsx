import React from 'react';
import {
  ExternalLink,
  Download,
  X,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { UpdaterState } from '../../hooks/useAutoUpdate';

interface UpdateModalFooterProps {
  updaterState: UpdaterState;
  isLight: boolean;
  onClose: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onInstall: () => void;
  onCheckAgain?: () => void;
  openGitHubRelease: () => void;
}

export function UpdateModalFooter({
  updaterState,
  isLight,
  onClose,
  onDownload,
  onCancel,
  onInstall,
  onCheckAgain,
  openGitHubRelease,
}: UpdateModalFooterProps) {
  const { status, isPortable } = updaterState;

  return (
    <div
      className={`px-5 py-3.5 border-t flex items-center justify-between gap-2 shrink-0 ${
        isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
      }`}
    >
      {/* Botão Ver no GitHub */}
      <button
        onClick={openGitHubRelease}
        className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
          isLight
            ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
            : 'bg-[#18181b] hover:bg-[#27272a] border-[#3f3f46] text-[#e4e4e7]'
        }`}
      >
        <ExternalLink className="w-3.5 h-3.5" /> Ver no GitHub
      </button>

      <div className="flex items-center gap-2">
        {/* Botões do Estado Disponível */}
        {status === 'available' && !isPortable && (
          <>
            <button
              onClick={onClose}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLight ? 'text-[#64748b] hover:bg-[#e2e8f0]' : 'text-[#a1a1aa] hover:bg-white/10'
              }`}
            >
              Lembrar mais tarde
            </button>
            <button
              onClick={onDownload}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Atualização
            </button>
          </>
        )}

        {/* Botões para Versão Portable */}
        {status === 'available' && isPortable && (
          <>
            <button
              onClick={onClose}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLight ? 'text-[#64748b] hover:bg-[#e2e8f0]' : 'text-[#a1a1aa] hover:bg-white/10'
              }`}
            >
              Fechar
            </button>
            <button
              onClick={openGitHubRelease}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir GitHub Releases
            </button>
          </>
        )}

        {/* Botão Cancelar Download */}
        {status === 'downloading' && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
        )}

        {/* Botões Downloaded (Instalar Agora ou Depois) */}
        {status === 'downloaded' && (
          <>
            <button
              onClick={onClose}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isLight ? 'text-[#64748b] hover:bg-[#e2e8f0]' : 'text-[#a1a1aa] hover:bg-white/10'
              }`}
            >
              Depois
            </button>
            <button
              onClick={onInstall}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Instalar e reiniciar
            </button>
          </>
        )}

        {/* Botões para Erro ou Sem Atualização */}
        {(status === 'error' || status === 'not-available') && (
          <>
            {onCheckAgain && (
              <button
                onClick={onCheckAgain}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-[#cbd5e1] text-[#334155]'
                    : 'bg-[#18181b] border-[#3f3f46] text-[#e4e4e7]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

