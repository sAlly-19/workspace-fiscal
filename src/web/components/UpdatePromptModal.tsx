import { motion, AnimatePresence } from 'motion/react';
import { Download, ExternalLink, X, Sparkles, Calendar } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { UpdateInfo } from '../hooks/useAutoUpdate';

interface UpdatePromptModalProps {
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

export function UpdatePromptModal({ updateInfo, onClose }: UpdatePromptModalProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme) || 'dark';
  const isLight = currentTheme === 'light';

  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleDownload = () => {
    const targetUrl = updateInfo.downloadUrl || updateInfo.releaseUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

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
              isLight ? 'bg-blue-50/70 border-[#e2e8f0]' : 'bg-blue-500/10 border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  Nova Versão Disponível!
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white tracking-wide">
                    v{updateInfo.latestVersion}
                  </span>
                </h3>
                <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Uma atualização do Workspace Fiscal foi lançada no GitHub.
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
              }`}
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Version Transition Badge */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
              }`}
            >
              <div>
                <span className={`text-[11px] font-medium ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                  Versão atual
                </span>
                <div className="font-bold text-sm">v{updateInfo.currentVersion}</div>
              </div>
              <div className="text-blue-500 font-black text-lg">→</div>
              <div className="text-right">
                <span className={`text-[11px] font-medium ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                  Nova versão
                </span>
                <div className="font-bold text-sm text-blue-500">v{updateInfo.latestVersion}</div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-[11px] text-[#71717a]">
              {formattedDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Lançada em {formattedDate}
                </span>
              )}
            </div>

            {/* Release Notes */}
            {updateInfo.releaseNotes && (
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'
                }`}>
                  Notas de Lançamento:
                </label>
                <div
                  className={`p-3.5 rounded-xl border font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap ${
                    isLight ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#334155]' : 'bg-[#09090b] border-[#27272a] text-[#d4d4d8]'
                  }`}
                >
                  {updateInfo.releaseNotes}
                </div>
              </div>
            )}

            <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Recomendamos manter o aplicativo atualizado para obter as correções fiscais mais recentes, melhorias de desempenho e novos recursos.
            </p>
          </div>

          {/* Footer */}
          <div
            className={`px-5 py-3.5 border-t flex items-center justify-between gap-2 shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <button
              onClick={() => {
                if (updateInfo.releaseUrl) {
                  window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isLight ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]' : 'bg-[#18181b] hover:bg-[#27272a] border-[#3f3f46] text-[#e4e4e7]'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver no GitHub
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isLight ? 'text-[#64748b] hover:bg-[#e2e8f0]' : 'text-[#a1a1aa] hover:bg-white/10'
                }`}
              >
                Lembrar mais tarde
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Atualização
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

