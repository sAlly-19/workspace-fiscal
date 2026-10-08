import { contextBridge, ipcRenderer } from 'electron';

export interface OpenXmlResult {
  canceled: boolean;
  filePaths: string[];
}

export interface OpenDirectoryResult {
  canceled: boolean;
  directory: string | null;
  filePaths: string[];
  totalFound: number;
  skipped: number;
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
  openDirectory: (options?: { recursive?: boolean; maxFiles?: number }): Promise<OpenDirectoryResult> =>
    ipcRenderer.invoke('dialog:openDirectory', options || {}),
  openImportDialog: (): Promise<ImportResult> =>
    ipcRenderer.invoke('dialog:openImport'),
  openBackupDialog: (): Promise<{ canceled: boolean; filePath: string | null }> =>
    ipcRenderer.invoke('dialog:openBackup'),
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
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  onUpdateAvailable: (cb: (info: any) => void) => {
    const listener = (_e: unknown, info: any) => cb(info);
    ipcRenderer.on('app:updateAvailable', listener);
    return () => ipcRenderer.removeListener('app:updateAvailable', listener);
  },

  // Novo mecanismo de Auto-Update integrado (electron-updater)
  updater: {
    check: (): Promise<any> => ipcRenderer.invoke('updater:check'),
    download: (): Promise<void> => ipcRenderer.invoke('updater:download'),
    cancel: (): Promise<void> => ipcRenderer.invoke('updater:cancel'),
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
    getState: (): Promise<any> => ipcRenderer.invoke('updater:getState'),
    onStatusChange: (cb: (state: any) => void) => {
      const listener = (_e: unknown, state: any) => cb(state);
      ipcRenderer.on('updater:statusChange', listener);
      return () => ipcRenderer.removeListener('updater:statusChange', listener);
    },
    onProgress: (cb: (progress: any) => void) => {
      const listener = (_e: unknown, progress: any) => cb(progress);
      ipcRenderer.on('updater:progress', listener);
      return () => ipcRenderer.removeListener('updater:progress', listener);
    },
  },
};

const fiscalApi = {
  companies: {
    list: () => ipcRenderer.invoke('companies:list'),
    create: (dto: any) => ipcRenderer.invoke('companies:create', dto),
    update: (dto: any) => ipcRenderer.invoke('companies:update', dto),
    delete: (id: number) => ipcRenderer.invoke('companies:delete', id),
    selectActive: (id: number) => ipcRenderer.invoke('companies:selectActive', id),
    getActive: () => ipcRenderer.invoke('companies:getActive'),
  },
  certificates: {
    listAvailable: () => ipcRenderer.invoke('certificates:listAvailable'),
    getForCompany: (companyId: number) => ipcRenderer.invoke('certificates:getForCompany', companyId),
    associateToCompany: (companyId: number, thumbprint: string) =>
      ipcRenderer.invoke('certificates:associateToCompany', companyId, thumbprint),
  },
  documents: {
    search: (filters: any) => ipcRenderer.invoke('documents:search', filters),
    getById: (request: any) => ipcRenderer.invoke('documents:getById', request),
    downloadXml: (request: any) => ipcRenderer.invoke('documents:downloadXml', request),
    downloadPdf: (request: any) => ipcRenderer.invoke('documents:downloadPdf', request),
    downloadBatch: (options: any) => ipcRenderer.invoke('documents:downloadBatch', options),
    openFileFolder: (request: any) => ipcRenderer.invoke('documents:openFileFolder', request),
  },
  sefaz: {
    consultDocuments: (companyId: number, docType?: 'NFE' | 'CTE') =>
      ipcRenderer.invoke('sefaz:consultDocuments', companyId, docType),
    getStatus: (companyId: number) => ipcRenderer.invoke('sefaz:getStatus', companyId),
    cancelQuery: (companyId: number, docType?: 'NFE' | 'CTE') => ipcRenderer.invoke('sefaz:cancelQuery', companyId, docType),
    resetNSU: (companyId: number, docType: 'NFE' | 'CTE') => ipcRenderer.invoke('sefaz:resetNSU', companyId, docType),
    onProgress: (callback: (data: { companyId: number; documentType: 'NFE' | 'CTE'; message: string; currentNSU?: string; count?: number }) => void) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('sefaz:progress', subscription);
      return () => {
        ipcRenderer.removeListener('sefaz:progress', subscription);
      };
    },
  },
  nfse: {
    sync: (companyId: number, environment?: 'homologation' | 'production') =>
      ipcRenderer.invoke('nfse:sync', companyId, environment),
    getStatus: (companyId: number, environment?: 'homologation' | 'production') =>
      ipcRenderer.invoke('nfse:getStatus', companyId, environment),
    cancelSync: (companyId: number, environment?: 'homologation' | 'production') =>
      ipcRenderer.invoke('nfse:cancelSync', companyId, environment),
    resetNSU: (companyId: number, environment?: 'homologation' | 'production') =>
      ipcRenderer.invoke('nfse:resetNSU', companyId, environment),
    consultByKey: (companyId: number, accessKey: string, environment?: 'homologation' | 'production') =>
      ipcRenderer.invoke('nfse:consultByKey', companyId, accessKey, environment),
    getEvents: (companyId: number, accessKey: string, environment?: 'homologation' | 'production') =>
      ipcRenderer.invoke('nfse:getEvents', companyId, accessKey, environment),
    onProgress: (
      callback: (data: {
        companyId: number;
        message: string;
        currentNsu?: string;
        maxNsu?: string;
        documentsCount?: number;
        eventsCount?: number;
      }) => void
    ) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on('nfse:progress', subscription);
      return () => {
        ipcRenderer.removeListener('nfse:progress', subscription);
      };
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
    selectFolder: (title?: string) => ipcRenderer.invoke('settings:selectFolder', title),
  },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('fiscalApi', fiscalApi);

export type ElectronApi = typeof api;
export type FiscalApi = typeof fiscalApi;
