import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  downloadUrl: string | null;
}

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas (verificação diária)
const LAST_CHECK_KEY = 'workspace_fiscal_last_update_check';

export function useAutoUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(LAST_CHECK_KEY);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  const checkNow = useCallback(async (force = false): Promise<UpdateInfo | null> => {
    setIsChecking(true);
    try {
      let info: UpdateInfo | null = null;

      // Se estamos no Electron com window.api disponível
      if (typeof window !== 'undefined' && window.api?.checkForUpdates) {
        info = await window.api.checkForUpdates();
      } else {
        // Fallback via API do Express
        const res = await apiFetch('/api/updates/check');
        if (res.ok) {
          info = await res.json();
        }
      }

      const now = Date.now();
      try {
        localStorage.setItem(LAST_CHECK_KEY, String(now));
      } catch {}
      setLastCheck(now);

      if (info && (info.hasUpdate || force)) {
        setUpdateInfo(info);
      }
      return info;
    } catch (err) {
      console.warn('[useAutoUpdate] Falha ao verificar atualizações:', err);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Escuta evento emitido pelo Electron em background caso disponível
    if (typeof window !== 'undefined' && window.api?.onUpdateAvailable) {
      const unsub = window.api.onUpdateAvailable((info: UpdateInfo) => {
        if (info && info.hasUpdate) {
          setUpdateInfo(info);
        }
      });
      return () => {
        if (unsub) unsub();
      };
    }
  }, []);

  useEffect(() => {
    // Verificação diária automática ao iniciar a aplicação
    const now = Date.now();
    const shouldCheck = !lastCheck || now - lastCheck >= CHECK_INTERVAL_MS;

    if (shouldCheck) {
      // Pequeno delay de 3 segundos para não concorrer com o carregamento inicial da UI
      const timer = setTimeout(() => {
        checkNow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCheck, checkNow]);

  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  return {
    updateInfo,
    isChecking,
    lastCheck,
    checkNow,
    dismissUpdate,
  };
}

