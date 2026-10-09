export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  children: FolderNode[];
  documentCount?: number;
}

export interface DocumentItem {
  id: string;
  type: string;
  accessKey?: string;
  number?: string;
  series?: string | null;
  status: string;
  issueDate?: string;
  issuerName?: string;
  recipientName?: string;
  recipientDocument?: string;
  totalAmount?: number;
  batchId?: string | null;
}

export interface ImportProgress {
  total: number;
  processed: number;
  percent: number;
  status: string;
  message?: string;
}

export interface AppSettings {
  showReceiptStub: boolean;
  autoOpenPrint: boolean;
  defaultFormat: 'A4' | 'A5';
  theme: 'dark' | 'light';
}

export interface WorkspaceState {
  folders: FolderNode[];
  selectedFolderId: string | null;
  selectedFolderName: string;
  documents: DocumentItem[];
  selectedDocumentId: string | null;
  selectedDocIds: string[];
  searchQuery: string;
  expandedFolderIds: Record<string, boolean>;

  // Progress & Settings
  isImporting: boolean;
  importProgress: ImportProgress | null;
  settings: AppSettings;
  isSettingsOpen: boolean;

  // Actions
  fetchWorkspace: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<FolderNode | null>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolderExpand: (folderId: string) => void;
  selectFolder: (folderId: string | null, folderName?: string) => void;

  fetchDocuments: (folderId?: string | null) => Promise<void>;
  moveDocument: (documentId: string, folderId: string | null) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  bulkDeleteDocuments: (ids: string[]) => Promise<void>;
  bulkMoveDocuments: (ids: string[], folderId: string | null) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
  resetWorkspaceDatabase: () => Promise<void>;
  selectDocument: (documentId: string, title?: string) => void;

  // Bulk Selection Actions
  toggleDocSelection: (docId: string) => void;
  selectAllDocs: (selected: boolean) => void;
  clearDocSelection: () => void;

  // Search & Settings & Progress
  setSearchQuery: (query: string) => void;
  setImporting: (importing: boolean, progress?: ImportProgress | null) => void;
  setImportProgress: (progress: ImportProgress | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

