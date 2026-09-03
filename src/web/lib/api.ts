// Native Electron window controls: minimize, maximize/restore, close.
// Uses IPC to communicate with the main process (loaded via preload).

export interface WindowState {
  isMaximized: boolean;
  isFullScreen: boolean;
  platform: NodeJS.Platform;
}

export type WindowAction = 'minimize' | 'maximize' | 'close' | 'fullscreen';

declare global {
  interface Window {
    api: {
      getApiBaseUrl: () => Promise<string>;
      getAppVersion: () => Promise<string>;
      getAppPaths: () => Promise<{
        userData: string;
        documents: string;
        downloads: string;
        home: string;
      }>;
      openXmlDialog: (options?: { multiSelections?: boolean }) => Promise<{
        canceled: boolean;
        filePaths: string[];
      }>;
      openDirectory: (options?: { recursive?: boolean; maxFiles?: number }) => Promise<{
        canceled: boolean;
        directory: string | null;
        filePaths: string[];
        totalFound: number;
        skipped: number;
      }>;
      openImportDialog: () => Promise<{
        canceled: boolean;
        results: Array<{ filePath: string; fileName: string; content: string; size: number }>;
      }>;
      saveFileDialog: (options?: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<{ canceled: boolean; filePath: string | null }>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string | Uint8Array) => Promise<boolean>;
      windowControl: (action: WindowAction) => Promise<void>;
      getWindowState: () => Promise<WindowState>;
      onWindowStateChange: (cb: (state: WindowState) => void) => () => void;
    };
  }
}

export const apiBaseUrl: string = '';
let _cachedApiBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  if (_cachedApiBaseUrl) return _cachedApiBaseUrl;
  if (typeof window !== 'undefined' && window.api?.getApiBaseUrl) {
    try {
      _cachedApiBaseUrl = await window.api.getApiBaseUrl();
      if (_cachedApiBaseUrl) return _cachedApiBaseUrl;
    } catch {}
  }
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')) {
    _cachedApiBaseUrl = window.location.origin;
    return _cachedApiBaseUrl;
  }
  return '';
}

export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  // Usa cache síncrono se já resolvido
  if (_cachedApiBaseUrl) return _cachedApiBaseUrl + path;
  // Fallback legado
  if (typeof window !== 'undefined' && (window as any).apiBaseUrl) {
    return (window as any).apiBaseUrl + path;
  }
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')) {
    return window.location.origin + path;
  }
  return path;
}

/** Versão síncrona que usa cache; para chamadas que precisam de await use apiFetch */
export function apiUrlSync(path: string): string {
  return apiUrl(path);
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = await getApiBaseUrl();
  const url = base + (path.startsWith('/') ? path : '/' + path);
  try {
    return await fetch(url, init);
  } catch (err) {
    // Só aciona o overlay se a API realmente estiver fora do ar
    try {
      const ping = await fetch(`${base}/api/health`, { method: 'GET' });
      if (!ping.ok) {
        _cachedApiBaseUrl = null;
        window.dispatchEvent(new CustomEvent('wsf:api-unreachable'));
      }
    } catch {
      _cachedApiBaseUrl = null;
      try {
        window.dispatchEvent(new CustomEvent('wsf:api-unreachable'));
      } catch {}
    }
    throw err;
  }
}

/** Inicializa cache de base URL em background (chamar no startup) */
export function prefetchApiBaseUrl(): void {
  if (typeof window !== 'undefined' && window.api?.getApiBaseUrl && !_cachedApiBaseUrl) {
    window.api.getApiBaseUrl().then((u) => {
      _cachedApiBaseUrl = u;
      // Expõe também como apiBaseUrl para compatibilidade legada
      (window as any).apiBaseUrl = u;
    }).catch(() => {});
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.api;
}
