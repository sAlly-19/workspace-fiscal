import { apiFetch } from '../../lib/api';
import { AppSettings } from './workspace.types';

export function readUrlParams(): { folderId: string | null; folderName: string; search: string } {
  if (typeof window === 'undefined') return { folderId: null, folderName: 'Todos os Documentos', search: '' };
  try {
    const sp = new URLSearchParams(window.location.search);
    const folderId = sp.get('folder');
    const search = sp.get('q') || '';
    return {
      folderId: folderId || null,
      folderName: sp.get('folderName') || (folderId ? 'Pasta' : 'Todos os Documentos'),
      search,
    };
  } catch {
    return { folderId: null, folderName: 'Todos os Documentos', search: '' };
  }
}

export function writeUrlParams(folderId: string | null, folderName: string, search: string) {
  if (typeof window === 'undefined') return;
  try {
    const sp = new URLSearchParams(window.location.search);
    if (folderId) {
      sp.set('folder', folderId);
      sp.set('folderName', folderName);
    } else {
      sp.delete('folder');
      sp.delete('folderName');
    }
    if (search) sp.set('q', search);
    else sp.delete('q');
    const next = sp.toString();
    const url = window.location.pathname + (next ? `?${next}` : '');
    window.history.replaceState({}, '', url);
  } catch {}
}

export const DEFAULT_SETTINGS: AppSettings = {
  showReceiptStub: true,
  autoOpenPrint: false,
  defaultFormat: 'A4',
  theme: 'dark',
};

export const getStoredSettings = (): AppSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem('danfe_app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
};

export async function safeFetchJson<T>(
  path: string,
  options?: RequestInit,
  retries = 2,
  delayMs = 300
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch(path, options);
      if (!res.ok) {
        if (attempt === retries) {
          console.warn(`[API] Fetch failed for ${path} with status ${res.status}`);
          return null;
        }
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) {
        console.warn(`[API] Network error for ${path}:`, err);
        return null;
      }
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  return null;
}

