import path from 'path';

export type BackupModule = 'NF_VIEW' | 'DEPRECIATION' | 'SETTINGS';

export interface BackupSettings {
  enabled: boolean;
  intervalDays: number;
  retentionCount: number;
  destination: string; // absolute path
}

export interface BackupManifest {
  format: 'workspace-fiscal-backup';
  formatVersion: '1.0';
  appVersion: string;
  createdAt: string;
  modules: BackupModule[];
  stats: {
    companies?: number;
    categories?: number;
    assets?: number;
    depreciationEntries?: number;
    depreciationExports?: number;
    folders?: number;
    batches?: number;
    importJobs?: number;
    documents?: number;
    documentItems?: number;
    documentTaxes?: number;
    documentEvents?: number;
    storageXmlFiles?: number;
    applicationSettings?: number;
  };
}

export interface BackupInspectionResult {
  valid: boolean;
  error?: string;
  isLegacy?: boolean;
  format?: 'wfb' | 'legacy-sqlite';
  appVersion?: string;
  createdAt?: string;
  filePath?: string;
  modules?: BackupModule[] | ['FULL_DATABASE'];
  stats?: BackupManifest['stats'];
}

export interface DatabaseStats {
  nfView: {
    documents: number;
    items: number;
    taxes: number;
    events: number;
    folders: number;
    batches: number;
    storageXmlFiles: number;
  };
  depreciation: {
    companies: number;
    categories: number;
    assets: number;
    depreciationEntries: number;
    depreciationExports: number;
  };
  settings: {
    count: number;
  };
}

export function getDefaultDestination(): string {
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app && typeof app.getPath === 'function' && app.isReady()) {
      return path.join(app.getPath('documents'), 'workspace-fiscal-backups');
    }
  } catch {}
  return path.join(process.cwd(), 'backups');
}

export const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  intervalDays: 7,
  retentionCount: 30,
  destination: getDefaultDestination(),
};

