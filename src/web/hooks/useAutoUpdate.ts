import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface UpdateProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdateInfo {
  version?: string;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt?: string;
  releaseDate?: string;
  releaseUrl: string;
  downloadUrl: string | null;
  isPortable?: boolean;
  isDev?: boolean;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export interface UpdaterState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgressData | null;
  errorMessage: string | null;
  isPortable: boolean;
  isDev: boolean;
}

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas (verificação diária)
const LAST_CHECK_KEY = 'workspace_fiscal_last_update_check';

export function useAutoUpdate() {
  const [updaterState, setUpdaterState] = useState<UpdaterState>({
    status: 'idle',
    updateInfo: null,
    progress: null,
    errorMessage: null,
    isPortable: false,
    isDev: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(LAST_CHECK_KEY);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });

  // Conexão com listeners do Electron Updater
  useEffect(() => {
    if (typeof window !== 'undefined' && window.api?.updater) {
      window.api.updater
        .getState()
        .then((state) => {
          if (state) {
            setUpdaterState(state);
            if (state.status === 'available' || state.status === 'downloaded') {
              setIsOpen(true);
            }
          }
        })
        .catch(() => {});

      const unsubStatus = window.api.updater.onStatusChange((state) => {
        if (state) {
          setUpdaterState(state);
          if (state.status === 'available' || state.status === 'downloaded') {
            setIsOpen(true);
          }
        }
      });

      const unsubProgress = window.api.updater.onProgress((progress) => {
        if (progress) {
          setUpdaterState((prev) => ({
            ...prev,
            status: 'downloading',
            progress,
          }));
        }
      });

      return () => {
        unsubStatus();
        unsubProgress();
      };
    }
  }, []);

  const checkNow = useCallback(async (force = false) => {
    try {
      if (typeof window !== 'undefined' && window.api?.updater) {
        const state = await window.api.updater.check();
        if (state) {
          setUpdaterState(state);
          if (state.status === 'available' || force) {
            setIsOpen(true);
          }
          const now = Date.now();
          try {
            localStorage.setItem(LAST_CHECK_KEY, String(now));
          } catch {}
          setLastCheck(now);
          return state;
        }
      } else {
        // Fallback web
        const res = await apiFetch('/api/updates/check');
        if (res.ok) {
          const info: UpdateInfo = await res.json();
          const state: UpdaterState = {
            status: info.hasUpdate ? 'available' : 'not-available',
            updateInfo: info,
            progress: null,
            errorMessage: null,
            isPortable: false,
            isDev: true,
          };
          setUpdaterState(state);
          if (info.hasUpdate || force) setIsOpen(true);
          return state;
        }
      }
    } catch (err) {
      console.warn('[useAutoUpdate] Falha ao verificar atualizações:', err);
    }
    return null;
  }, []);

  const startDownload = useCallback(async () => {
    if (typeof window !== 'undefined' && window.api?.updater) {
      await window.api.updater.download();
    }
  }, []);

  const cancelDownload = useCallback(async () => {
    if (typeof window !== 'undefined' && window.api?.updater) {
      await window.api.updater.cancel();
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    if (typeof window !== 'undefined' && window.api?.updater) {
      await window.api.updater.install();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Verificação diária automática ao iniciar a aplicação
  useEffect(() => {
    const now = Date.now();
    const shouldCheck = !lastCheck || now - lastCheck >= CHECK_INTERVAL_MS;

    if (shouldCheck) {
      const timer = setTimeout(() => {
        checkNow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCheck, checkNow]);

  return {
    isOpen,
    updaterState,
    updateInfo: updaterState.updateInfo,
    isChecking: updaterState.status === 'checking',
    lastCheck,
    checkNow,
    startDownload,
    cancelDownload,
    installAndRestart,
    dismissUpdate,
    openModal: () => setIsOpen(true),
  };
}
