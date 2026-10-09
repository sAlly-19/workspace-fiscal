import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Sparkles, X } from 'lucide-react';
import { UpdaterState } from '../../hooks/useAutoUpdate';

interface UpdateModalHeaderProps {
  updaterState: UpdaterState;
  isLight: boolean;
  onClose: () => void;
}

export function UpdateModalHeader({
  updaterState,
  isLight,
  onClose,
}: UpdateModalHeaderProps) {
  const { status, updateInfo } = updaterState;

  return (
    <div
      className={`px-5 py-4 border-b flex items-center justify-between ${
        status === 'error'
          ? isLight
            ? 'bg-red-50/70 border-red-200'
            : 'bg-red-500/10 border-red-500/20'
          : status === 'downloaded'
          ? isLight
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-emerald-500/10 border-emerald-500/20'
          : isLight
          ? 'bg-blue-50/70 border-[#e2e8f0]'
          : 'bg-blue-500/10 border-[#27272a]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
            status === 'error'
              ? 'bg-red-600'
              : status === 'downloaded'
              ? 'bg-emerald-600'
              : 'bg-blue-600'
          }`}
        >
          {status === 'checking' || status === 'installing' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : status === 'downloaded' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : status === 'error' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            {status === 'checking' && 'Verificando Atualizações...'}
            {status === 'not-available' && 'Você está atualizado'}
            {status === 'available' && (
              <>
                Nova Versão Disponível!
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white tracking-wide">
                  v{updateInfo?.version || updateInfo?.latestVersion}
                </span>
              </>
            )}
            {status === 'downloading' && 'Baixando Atualização...'}
            {status === 'downloaded' && 'Atualização Pronta!'}
            {status === 'installing' && 'Instalando Atualização...'}
            {status === 'error' && 'Falha na Atualização'}
          </h3>
          <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            {status === 'checking' && 'Consultando lançamentos no GitHub Releases...'}
            {status === 'not-available' && 'Você já está utilizando a versão mais recente.'}
            {status === 'available' && 'Um novo instalador está pronto para download no aplicativo.'}
            {status === 'downloading' && 'O instalador está sendo baixado em segundo plano.'}
            {status === 'downloaded' && 'O arquivo foi validado e está pronto para instalação.'}
            {status === 'installing' && 'O aplicativo será reiniciado para concluir.'}
            {status === 'error' && 'Ocorreu um problema ao comunicar com o servidor.'}
          </div>
        </div>
      </div>
      {status !== 'downloading' && status !== 'installing' && (
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
          }`}
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

