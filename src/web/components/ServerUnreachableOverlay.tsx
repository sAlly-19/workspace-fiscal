import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  /** Quando definido, exibe o overlay. */
  visible: boolean;
  onRetry?: () => void;
}

export function ServerUnreachableOverlay({ visible, onRetry }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          role="alert"
          aria-live="assertive"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#18181b] p-6 text-center shadow-2xl"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center">
              <ServerErrorSvg />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight mb-1">
              Servidor da API não está respondendo
            </h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
              O backend Express não foi encontrado em <span className="font-mono text-red-400">127.0.0.1:3000</span>.
              <br />
              Verifique se o servidor está rodando:
            </p>
            <pre className="text-left text-[10px] font-mono text-[#d4d4d8] bg-[#0d0d10] border border-[#27272a] rounded-lg p-3 mb-4 overflow-x-auto">
{`# Em outro terminal:
$ npm run dev
# ou em produção:
$ npm run build && npm start`}
            </pre>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Tentar novamente
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook auxiliar: escuta eventos de falha de fetch do api.ts */
export function useServerUnreachable(): boolean {
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    const onUnreachable = () => setUnreachable(true);
    window.addEventListener('wsf:api-unreachable', onUnreachable);
    return () => window.removeEventListener('wsf:api-unreachable', onUnreachable);
  }, []);

  return unreachable;
}

function ServerErrorSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="7" r="0.8" fill="currentColor" />
      <circle cx="7" cy="17" r="0.8" fill="currentColor" />
      <line x1="11" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="17" x2="18" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}