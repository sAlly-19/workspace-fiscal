import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { apiFetch } from '../lib/api';
import { CURRENT_APP_VERSION, WHATS_NEW_VERSIONS, type AppVersion } from './whats-new/whatsNewData';
import { WhatsNewVersionContent } from './whats-new/WhatsNewVersionContent';

export { CURRENT_APP_VERSION, type AppVersion };

const SEEN_VERSION_KEY = 'workspace_fiscal_seen_version';

interface WhatsNewModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme) || 'dark';
  const isLight = currentTheme === 'light';

  const [internalOpen, setInternalOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState<AppVersion>('3.5.0');

  useEffect(() => {
    if (open !== undefined) {
      setInternalOpen(open);
      return;
    }

    let isMounted = true;
    const checkSeen = async () => {
      // 1. Tenta verificar primeiro no SQLite (persistente mesmo com porta randômica no Electron)
      try {
        const res = await apiFetch('/api/settings/seen-version');
        if (res.ok) {
          const data = await res.json();
          if (data?.version === CURRENT_APP_VERSION) {
            if (isMounted) setInternalOpen(false);
            return;
          }
        }
      } catch {}

      // 2. Fallback via localStorage
      try {
        const seen = localStorage.getItem(SEEN_VERSION_KEY);
        if (seen === CURRENT_APP_VERSION) {
          if (isMounted) setInternalOpen(false);
          return;
        }
      } catch {}

      if (isMounted) setInternalOpen(true);
    };

    checkSeen();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleClose = async () => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, CURRENT_APP_VERSION);
    } catch {}
    try {
      await apiFetch('/api/settings/seen-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: CURRENT_APP_VERSION }),
      });
    } catch {}
    setInternalOpen(false);
    if (onClose) onClose();
  };

  if (!internalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#3f3f46] text-white'
          }`}
        >
          {/* Header */}
          <div
            className={`px-6 py-5 border-b flex items-center justify-between ${
              isLight
                ? 'bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border-[#e2e8f0]'
                : 'bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-[#18181b] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base tracking-tight">
                    Novidades da Versão
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-600 text-white shadow-xs">
                    v{CURRENT_APP_VERSION}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Versão 3.5
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Confira as principais melhorias e novos recursos disponíveis no Workspace Fiscal.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
              }`}
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas de Navegação entre Versões */}
          <div
            className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
              <span className={`text-[11px] font-bold mr-1 uppercase tracking-wider shrink-0 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Versão:
              </span>
              {WHATS_NEW_VERSIONS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVersion(v.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeVersion === v.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isLight
                        ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  <span>{v.label}</span>
                  {v.isCurrent && activeVersion === '3.5.0' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              ))}
            </div>
            <span className={`text-[11px] shrink-0 hidden sm:inline ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              {activeVersion === '3.5.0'
                ? 'Lançamento mais recente'
                : activeVersion === '2.5.0'
                  ? 'Lançamento do Hub Fiscal'
                  : 'Versão anterior'}
            </span>
          </div>

          {/* Cards Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            <WhatsNewVersionContent version={activeVersion} isLight={isLight} />
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Este aviso é exibido apenas uma vez por atualização.
            </div>
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Entendido, vamos começar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
