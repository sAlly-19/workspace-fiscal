import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCw, Minimize2, Maximize2, CheckCircle2, FileCode, FolderOpen, X, AlertTriangle, Clock, Ban } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';

export interface ImportProgressModalProps {
  isOpen: boolean;
  total?: number;
  processed?: number;
  percent?: number;
  targetFolderName?: string;
  isComplete?: boolean;
  isCancelled?: boolean;
  isCancelling?: boolean;
  error?: string | null;
  onClose: () => void;
  onCancel?: () => void;
}

export function ImportProgressModal({
  isOpen,
  total = 0,
  processed = 0,
  percent = 0,
  targetFolderName,
  isComplete = false,
  isCancelled = false,
  isCancelling = false,
  error = null,
  onClose,
  onCancel,
}: ImportProgressModalProps) {
  const { settings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';
  const [isMinimized, setIsMinimized] = useState(false);
  const startTimeRef = useRef<number>(performance.now());

  const isFinished = isComplete || isCancelled;

  useEffect(() => {
    if (isOpen && !isFinished) startTimeRef.current = performance.now();
  }, [isOpen, isFinished]);

  const calculatedPercent =
    total > 0
      ? Math.min(100, Math.max(0, Math.round((processed / total) * 100)))
      : isComplete
        ? 100
        : 0;

  const displayPercent = isComplete ? 100 : percent > 0 ? percent : calculatedPercent;
  const remaining = Math.max(0, total - processed);

  // UX9: ETA em segundos baseada em throughput atual
  const elapsedSec = isOpen && !isFinished ? (performance.now() - startTimeRef.current) / 1000 : 0;
  const throughput = elapsedSec > 0 ? processed / elapsedSec : 0;
  const etaSec = isFinished || throughput <= 0 ? 0 : Math.ceil(remaining / throughput);
  const etaLabel = isComplete
    ? 'Concluído'
    : isCancelled
      ? 'Interrompido'
      : throughput <= 0
        ? 'Calculando…'
        : etaSec < 60
          ? `${etaSec}s restantes`
          : `${Math.ceil(etaSec / 60)}min restantes`;
  const throughputLabel = throughput > 0 && !isFinished ? `${throughput.toFixed(1)} docs/s` : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isMinimized ? (
            <motion.div
              key="import-bubble"
              initial={{ opacity: 0, scale: 0.6, y: 40, x: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 40, x: 20 }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              onClick={() => setIsMinimized(false)}
              className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-full shadow-2xl cursor-pointer select-none group border ${
                isLight
                  ? 'bg-white/95 text-[#0f172a] border-blue-500/50 shadow-blue-500/15'
                  : 'bg-[#18181b]/95 text-white border-blue-500/40 shadow-black/60'
              }`}
              title="Clique para expandir o progresso da importação"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                {isComplete ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : isCancelled ? (
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                ) : (
                  <>
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className={isLight ? 'text-gray-200' : 'text-white/10'}
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-blue-500 transition-all duration-300"
                        strokeDasharray={`${displayPercent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <RotateCw className="w-3.5 h-3.5 text-blue-500 animate-spin absolute" />
                  </>
                )}
              </div>

              <div className="flex flex-col pr-1 min-w-[130px]">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>
                    {isComplete
                      ? 'Concluído!'
                      : isCancelled
                        ? 'Importação Interrompida'
                        : `Importando: ${processed} de ${total}`}
                  </span>
                </div>
                <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  {isComplete
                    ? `${total} notas salvas`
                    : isCancelled
                      ? `${processed} notas salvas (cancelado)`
                      : `${displayPercent}% • ${remaining} restantes • ${etaLabel}`}
                </span>
              </div>

              <div
                className={`p-1 rounded-full transition-colors ml-1 ${
                  isLight
                    ? 'bg-[#f1f5f9] text-[#64748b] group-hover:text-white group-hover:bg-blue-600'
                    : 'bg-white/10 text-white/70 group-hover:text-white group-hover:bg-blue-600'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="import-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/75 backdrop-blur-xs"
            >
              <motion.div
                key="import-modal-card"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`w-full max-w-md rounded-2xl overflow-hidden flex flex-col shadow-2xl ${
                  isLight
                    ? 'bg-white border border-[#cbd5e1] text-[#0f172a]'
                    : 'bg-[#18181b] border border-[#3f3f46] text-white'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`px-5 py-4 border-b flex items-center justify-between ${
                    isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isCancelled
                        ? 'bg-amber-600/15 border-amber-500/30 text-amber-400'
                        : isComplete
                          ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                    }`}>
                      {isCancelled ? <AlertTriangle className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                        {isComplete
                          ? 'Importação Concluída'
                          : isCancelled
                            ? 'Importação Interrompida'
                            : 'Importando Documentos Fiscais'}
                      </h3>
                      <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                        {isCancelled
                          ? 'Processo interrompido pelo usuário'
                          : 'Processamento de arquivos XML em lote'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isFinished && (
                      <button
                        onClick={() => setIsMinimized(true)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight
                            ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                        title="Minimizar para Bolha flutuante"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    )}
                    {isFinished ? (
                      <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight
                            ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                        title="Fechar modal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : onCancel ? (
                      <button
                        onClick={onCancel}
                        disabled={isCancelling}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight
                            ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                            : 'text-red-400 hover:text-red-300 hover:bg-red-950/40'
                        } disabled:opacity-50`}
                        title="Cancelar importação"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isComplete ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : isCancelled ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <RotateCw className="w-5 h-5 text-blue-400 animate-spin" />
                      )}
                      <span className={`text-xs font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                        {isComplete
                          ? `${total} documento${total > 1 ? 's' : ''} processado${total > 1 ? 's' : ''} com sucesso!`
                          : isCancelled
                            ? `${processed} de ${total} documento${total > 1 ? 's' : ''} salvo${processed > 1 ? 's' : ''} antes da interrupção.`
                            : `Importando: ${processed} de ${total}`}
                      </span>
                    </div>
                    <span className={`text-lg font-black font-mono tracking-tight ${
                      isCancelled ? 'text-amber-400' : isComplete ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {displayPercent}%
                    </span>
                  </div>

                  <div
                    className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
                      isLight
                        ? 'bg-[#e2e8f0] border-[#cbd5e1]'
                        : 'bg-[#27272a] border-[#3f3f46]'
                    }`}
                  >
                    <motion.div
                      className={`h-full rounded-full ${
                        isComplete
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs shadow-green-500/40'
                          : isCancelled
                            ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-xs shadow-amber-500/30'
                            : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 shadow-xs shadow-blue-500/30'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${displayPercent}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>

                  <div
                    className={`grid grid-cols-2 gap-2.5 text-xs p-3.5 rounded-xl border ${
                      isLight
                        ? 'bg-[#f8fafc] border-[#e2e8f0]'
                        : 'bg-[#111114] border-[#27272a]'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isLight ? 'text-[#64748b]' : 'text-[#71717a]'
                        }`}
                      >
                        Status do Lote
                      </span>
                      <div className={`font-semibold mt-0.5 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                        {isComplete ? (
                          <span className="text-emerald-500 font-bold">Concluído (100%)</span>
                        ) : isCancelled ? (
                          <span className="text-amber-500 font-bold">Interrompido ({processed} de {total})</span>
                        ) : (
                          <span>
                            {processed} de {total} ({remaining} restantes)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isLight ? 'text-[#64748b]' : 'text-[#71717a]'
                        }`}
                      >
                        Tempo Restante
                      </span>
                      <div className={`font-semibold mt-0.5 flex items-center gap-1 ${
                        isLight ? 'text-[#0f172a]' : 'text-white'
                      }`}>
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${isCancelled ? 'text-amber-400' : 'text-blue-400'}`} />
                        <span>{etaLabel}</span>
                        {throughputLabel && (
                          <span className={`text-[10px] font-normal ml-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                            ({throughputLabel})
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isLight ? 'text-[#64748b]' : 'text-[#71717a]'
                        }`}
                      >
                        Pasta de Destino
                      </span>
                      <div className="font-semibold text-blue-400 mt-0.5 flex items-center gap-1 truncate" title={targetFolderName || 'Workspace Geral'}>
                        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">{targetFolderName || 'Geral (Raiz)'}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <div
                  className={`px-5 py-3.5 border-t flex items-center justify-between ${
                    isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
                  }`}
                >
                  <span
                    className={`text-[11px] ${
                      isLight ? 'text-[#64748b]' : 'text-[#71717a]'
                    }`}
                  >
                    {isComplete
                      ? 'Pronto para visualização'
                      : isCancelled
                        ? 'Notas salvas até a interrupção foram preservadas'
                        : 'Você pode minimizar e continuar navegando'}
                  </span>
                  <div className="flex items-center gap-2">
                    {!isFinished && onCancel && (
                      <button
                        type="button"
                        onClick={onCancel}
                        disabled={isCancelling}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border ${
                          isLight
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                            : 'bg-red-950/40 hover:bg-red-900/50 text-red-400 border-red-800/50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {isCancelling ? 'Cancelando...' : 'Cancelar Importação'}
                      </button>
                    )}
                    {!isFinished && (
                      <button
                        onClick={() => setIsMinimized(true)}
                        className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isLight
                            ? 'bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#27272a] hover:bg-[#3f3f46] text-white'
                        }`}
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        Minimizar para Bolha
                      </button>
                    )}
                    {isFinished && (
                      <button
                        onClick={onClose}
                        className={`px-4 py-1.5 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer ${
                          isCancelled ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
