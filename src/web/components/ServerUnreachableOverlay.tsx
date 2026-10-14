import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiUrl } from '../lib/api';

interface Props {
  /** Quando definido, exibe o overlay. */
  visible: boolean;
  onRetry?: () => void;
}

export function ServerUnreachableOverlay({ visible, onRetry }: Props) {
  const [isRetrying, setIsRetrying] = useState(false);

  const checkHealthAndRecover = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/health'), { method: 'GET' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('wsf:api-recovered'));
        return true;
      }
    } catch {
      // still unreachable
    }
    return false;
  }, []);

  // Polling automático enquanto o overlay estiver visível
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(async () => {
      const recovered = await checkHealthAndRecover();
      if (recovered) {
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [visible, checkHealthAndRecover]);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      if (typeof window !== 'undefined' && window.api?.restartServer) {
        await window.api.restartServer();
      }
      const recovered = await checkHealthAndRecover();
      if (!recovered && onRetry) {
        onRetry();
      }
    } catch {
      if (onRetry) onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

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
              Serviço local indisponível
            </h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
              O motor de banco de dados e API local está iniciando ou enfrentou um erro temporário.
              Tentando reconectar automaticamente a cada 2.5s...
            </p>
            <button
              onClick={handleManualRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md transition-all cursor-pointer"
            >
              {isRetrying ? 'Reiniciando motor...' : 'Tentar novamente'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook auxiliar: escuta eventos de falha e recuperação de fetch do api.ts */
export function useServerUnreachable(): boolean {
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    const onUnreachable = () => setUnreachable(true);
    const onRecovered = () => setUnreachable(false);

    window.addEventListener('wsf:api-unreachable', onUnreachable);
    window.addEventListener('wsf:api-recovered', onRecovered);

    return () => {
      window.removeEventListener('wsf:api-unreachable', onUnreachable);
      window.removeEventListener('wsf:api-recovered', onRecovered);
    };
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