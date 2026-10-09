import React from 'react';
import { motion } from 'motion/react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { UpdaterState } from '../../hooks/useAutoUpdate';
import { ReleaseNotesRenderer } from '../ReleaseNotesRenderer';
import { formatBytes } from './update-modal.types';

interface UpdateModalBodyProps {
  updaterState: UpdaterState;
  isLight: boolean;
  formattedDate: string;
}

export function UpdateModalBody({
  updaterState,
  isLight,
  formattedDate,
}: UpdateModalBodyProps) {
  const { status, updateInfo, progress, errorMessage, isPortable } = updaterState;

  return (
    <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
      {/* Estado 1: Verificando */}
      {status === 'checking' && (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className={`${isLight ? 'text-[#475569]' : 'text-[#d4d4d8]'}`}>
            Conectando ao GitHub para verificar novas versões...
          </p>
        </div>
      )}

      {/* Estado 2: Sem atualização */}
      {status === 'not-available' && (
        <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Tudo em dia!</h4>
            <p className={`text-xs mt-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Você está rodando a versão <b>v{updateInfo?.currentVersion || '3.0.0'}</b> do Workspace Fiscal.
            </p>
          </div>
        </div>
      )}

      {/* Estado 3: Disponível */}
      {status === 'available' && updateInfo && (
        <>
          {/* Version Transition Badge */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <div>
              <span className={`text-[11px] font-medium ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                Versão instalada
              </span>
              <div className="font-bold text-sm">v{updateInfo.currentVersion}</div>
            </div>
            <div className="text-blue-500 font-black text-lg">
              <ArrowRight className="w-5 h-5" />
            </div>
            <div className="text-right">
              <span className={`text-[11px] font-medium ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                Nova versão
              </span>
              <div className="font-bold text-sm text-blue-500">v{updateInfo.version}</div>
            </div>
          </div>

          {formattedDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
              <Calendar className="w-3.5 h-3.5" /> Lançada em {formattedDate}
            </div>
          )}

          {/* Aviso para versão Portátil */}
          {isPortable && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Versão Portátil em Execução</p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  O auto-update integrado é exclusivo para a versão instalada (NSIS). Para atualizar sua cópia portátil, faça o download do executável correspondente no GitHub.
                </p>
              </div>
            </div>
          )}

          {/* Release Notes */}
          {updateInfo.releaseNotes && (
            <div>
              <label
                className={`text-xs font-bold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
                }`}
              >
                O que há de novo:
              </label>
              <div
                className={`p-3.5 rounded-xl border max-h-52 overflow-y-auto ${
                  isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#09090b] border-[#27272a]'
                }`}
              >
                <ReleaseNotesRenderer content={updateInfo.releaseNotes} isLight={isLight} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Estado 4: Baixando (Progresso Real) */}
      {status === 'downloading' && (
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs">Progresso do Download</span>
            <span className="font-mono font-bold text-sm text-blue-500">
              {progress?.percent ? `${progress.percent}%` : 'Iniciando...'}
            </span>
          </div>

          {/* Barra de Progresso Real */}
          <div
            className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <motion.div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress?.percent || 2}%` }}
            />
          </div>

          {/* Detalhes de bytes e velocidade */}
          <div className="flex items-center justify-between text-[11px] font-mono opacity-80">
            <span>
              {formatBytes(progress?.transferred)} de {formatBytes(progress?.total)}
            </span>
            <span>
              {progress?.bytesPerSecond
                ? `${formatBytes(progress.bytesPerSecond)}/s`
                : 'Calculando velocidade...'}
            </span>
          </div>

          <p className={`text-[11px] mt-2 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
            O download está sendo executado internamente. Você pode continuar trabalhando enquanto o processo finaliza.
          </p>
        </div>
      )}

      {/* Estado 5: Download Concluído */}
      {status === 'downloaded' && (
        <div className="space-y-4 py-2">
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <h4 className="font-bold text-sm">Download concluído com sucesso!</h4>
              <p className="text-xs mt-1 leading-relaxed">
                A versão <b>v{updateInfo?.version}</b> está pronta para ser instalada. Deseja fechar o Workspace Fiscal e aplicar a atualização agora?
              </p>
            </div>
          </div>
          <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
            Se você escolher "Depois", o arquivo baixado permanecerá guardado e você poderá atualizar quando desejar.
          </p>
        </div>
      )}

      {/* Estado 6: Instalando */}
      {status === 'installing' && (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <h4 className="font-bold text-sm">Preparando para reiniciar...</h4>
          <p className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
            O Workspace Fiscal será encerrado para que o instalador NSIS conclua a atualização.
          </p>
        </div>
      )}

      {/* Estado de Erro */}
      {status === 'error' && (
        <div className="space-y-3 py-2">
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              isLight
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-bold">Não foi possível baixar a atualização</p>
              <p className="mt-0.5 text-[11px] opacity-90">
                Verifique sua conexão com a internet e tente novamente, ou baixe diretamente pelo GitHub.
              </p>
              {errorMessage && (
                <p className="mt-2 text-[10px] font-mono opacity-75 truncate max-w-sm">
                  Erro: {errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

