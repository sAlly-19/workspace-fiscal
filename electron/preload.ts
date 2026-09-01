import { contextBridge, ipcRenderer } from 'electron';

export interface OpenXmlResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface ImportResult {
  canceled: boolean;
  results: Array<{
    filePath: string;
    fileName: string;
    content: string;
    size: number;
  }>;
}

export interface WindowStatePayload {
  isMaximized: boolean;
  isFullScreen: boolean;
  platform: NodeJS.Platform;
}

const api = {
  getApiBaseUrl: (): Promise<string> => ipcRenderer.invoke('api:baseUrl'),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getAppPaths: () => ipcRenderer.invoke('app:getPaths'),
  openXmlDialog: (options?: { multiSelections?: boolean }): Promise<OpenXmlResult> =>
    ipcRenderer.invoke('dialog:openXml', options || {}),
  openImportDialog: (): Promise<ImportResult> =>
    ipcRenderer.invoke('dialog:openImport'),
  saveFileDialog: (options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<SaveFileResult> => ipcRenderer.invoke('dialog:saveFile', options),
  writeFile: (filePath: string, content: string | Uint8Array): Promise<boolean> =>
    ipcRenderer.invoke('fs:writeFile', { filePath, content }),
  readFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:readFile', filePath),

  // Window controls (min/max/close + fullscreen toggle)
  windowControl: (action: 'minimize' | 'maximize' | 'close' | 'fullscreen'): Promise<void> =>
    ipcRenderer.invoke('window:control', action),
  getWindowState: (): Promise<WindowStatePayload> => ipcRenderer.invoke('window:getState'),
  onWindowStateChange: (cb: (state: WindowStatePayload) => void) => {
    const listener = (_e: unknown, state: WindowStatePayload) => cb(state);
    ipcRenderer.on('window:state', listener);
    return () => ipcRenderer.removeListener('window:state', listener);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
