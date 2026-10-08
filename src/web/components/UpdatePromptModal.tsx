import { motion, AnimatePresence } from 'motion/react';
import {
  Download, ExternalLink, X, Sparkles, Calendar,
  Loader2, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { UpdaterState } from '../hooks/useAutoUpdate';
import { ReleaseNotesRenderer } from './ReleaseNotesRenderer';

export interface UpdatePromptModalProps {
  isOpen: boolean;
  updaterState: UpdaterState;
  onClose: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onInstall: () => void;
  onCheckAgain?: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${units[i]}`;
}

export function UpdatePromptModal({
  isOpen,
  updaterState,
  onClose,
  onDownload,
  onCancel,
  onInstall,
  onCheckAgain,
}: UpdatePromptModalProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme) || 'dark';
  const isLight = currentTheme === 'light';

  if (!isOpen) return null;

  const { status, updateInfo, progress, errorMessage, isPortable } = updaterState;

  const rawDate = updateInfo?.releaseDate || updateInfo?.publishedAt;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const openGitHubRelease = () => {
    const url = updateInfo?.releaseUrl || 'https://github.com/sAlly-19/workspace-fiscal/releases';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh] ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#3f3f46] text-white'
          }`}
        >
          {/* Header */}
          <div
            className={`px-5 py-4 border-b flex items-center justify-between ${
              status === 'error'
                ? isLight ? 'bg-red-50/70 border-red-200' : 'bg-red-500/10 border-red-500/20'
                : status === 'downloaded'
                ? isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'
                : isLight ? 'bg-blue-50/70 border-[#e2e8f0]' : 'bg-blue-500/10 border-[#27272a]'
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

          {/* Body */}
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
                    <label className={`text-xs font-bold uppercase tracking-wider block mb-1.5 ${
                      isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
                    }`}>
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
                <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'
                }`}>
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
                    {progress?.bytesPerSecond ? `${formatBytes(progress.bytesPerSecond)}/s` : 'Calculando velocidade...'}
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
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                }`}>
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
                <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  isLight ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}>
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

          {/* Footer com Ações */}
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
                        isLight ? 'bg-white border-[#cbd5e1] text-[#334155]' : 'bg-[#18181b] border-[#3f3f46] text-[#e4e4e7]'
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
