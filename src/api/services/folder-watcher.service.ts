import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { importService as defaultImportService, ImportService } from './import.service';
import { activityLogService as defaultActivityLogService, ActivityLogService } from './activity-log.service';
import { workspaceRepository as defaultWorkspaceRepo, WorkspaceRepository } from '../repositories/workspace.repository';
import { logger } from '../utils/logger';

export interface WatchedFolder {
  id: string;
  name: string;
  watchPath: string;
  watchRecursive?: boolean;
  watchMode: 'auto' | 'prompt';
}

export interface FolderWatcherServiceOptions {
  importService?: ImportService;
  activityLogService?: ActivityLogService;
  workspaceRepository?: WorkspaceRepository;
  debounceMs?: number;
}

export class FolderWatcherService extends EventEmitter {
  private importService: ImportService;
  private activityLogService: ActivityLogService;
  private workspaceRepository: WorkspaceRepository;
  private debounceMs: number;

  private watchers = new Map<string, fs.FSWatcher>();
  private activeConfigs = new Map<string, WatchedFolder>();
  private pendingFiles = new Map<string, Set<string>>();
  private processedFiles = new Map<string, Set<string>>();
  private ignoredFiles = new Map<string, Set<string>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(options: FolderWatcherServiceOptions = {}) {
    super();
    this.importService = options.importService || defaultImportService;
    this.activityLogService = options.activityLogService || defaultActivityLogService;
    this.workspaceRepository = options.workspaceRepository || defaultWorkspaceRepo;
    this.debounceMs = options.debounceMs ?? 600;
  }

  /**
   * Inicializa o serviço carregando e monitorando todas as pastas ativas do banco.
   */
  async init(): Promise<void> {
    try {
      const watched = await this.workspaceRepository.getActiveWatchedFolders();
      logger.info({ count: watched.length }, 'folder_watcher_init_starting');
      for (const folder of watched) {
        if (folder.watchPath && (folder.watchMode === 'auto' || folder.watchMode === 'prompt')) {
          await this.startWatcher({
            id: folder.id,
            name: folder.name,
            watchPath: folder.watchPath,
            watchRecursive: Boolean(folder.watchRecursive),
            watchMode: folder.watchMode as 'auto' | 'prompt',
          });
        }
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, 'folder_watcher_init_failed');
    }
  }

  /**
   * Sincroniza os watchers com o estado atual do banco de dados SQLite.
   */
  async syncWatchers(): Promise<void> {
    try {
      const activeFolders = await this.workspaceRepository.getActiveWatchedFolders();
      const activeIds = new Set(activeFolders.map((f) => f.id));

      // 1. Para watchers que não existem mais ou foram desativados
      for (const [folderId] of this.watchers) {
        if (!activeIds.has(folderId)) {
          this.stopWatcher(folderId);
        }
      }

      // 2. Inicia ou atualiza watchers ativos
      for (const f of activeFolders) {
        const current = this.activeConfigs.get(f.id);
        const needsRestart =
          !current ||
          current.watchPath !== f.watchPath ||
          current.watchRecursive !== Boolean(f.watchRecursive) ||
          current.watchMode !== f.watchMode;

        if (needsRestart && f.watchPath) {
          this.stopWatcher(f.id);
          await this.startWatcher({
            id: f.id,
            name: f.name,
            watchPath: f.watchPath,
            watchRecursive: Boolean(f.watchRecursive),
            watchMode: f.watchMode as 'auto' | 'prompt',
          });
        }
      }
    } catch (err: any) {
      logger.error({ err: err?.message }, 'folder_watcher_sync_failed');
    }
  }

  /**
   * Inicia o monitoramento de uma pasta específica.
   */
  async startWatcher(folder: WatchedFolder): Promise<boolean> {
    if (!folder.watchPath || !fs.existsSync(folder.watchPath)) {
      logger.warn({ folderId: folder.id, path: folder.watchPath }, 'folder_watcher_path_not_found');
      return false;
    }

    // Se já existia um watcher nesta pasta, fecha antes de reiniciar
    this.stopWatcher(folder.id);

    this.activeConfigs.set(folder.id, folder);
    if (!this.processedFiles.has(folder.id)) {
      this.processedFiles.set(folder.id, new Set());
    }
    if (!this.ignoredFiles.has(folder.id)) {
      this.ignoredFiles.set(folder.id, new Set());
    }
    if (!this.pendingFiles.has(folder.id)) {
      this.pendingFiles.set(folder.id, new Set());
    }

    try {
      // 1. Realiza a varredura inicial (Catch-up Scan)
      await this.scanDirectory(
        folder.id,
        folder.name,
        folder.watchPath,
        Boolean(folder.watchRecursive),
        folder.watchMode
      );

      // 2. Registra o fs.watch nativo
      const watcher = fs.watch(
        folder.watchPath,
        { recursive: Boolean(folder.watchRecursive) },
        (eventType, filename) => {
          if (!filename) return;
          const fullPath = path.isAbsolute(filename)
            ? filename
            : path.join(folder.watchPath, filename);

          if (!this.isXmlFile(fullPath)) return;

          this.handleFileChange(folder, fullPath);
        }
      );

      watcher.on('error', (err) => {
        logger.error({ folderId: folder.id, err: err?.message }, 'folder_watcher_fs_error');
      });

      this.watchers.set(folder.id, watcher);
      logger.info(
        { folderId: folder.id, path: folder.watchPath, mode: folder.watchMode },
        'folder_watcher_started'
      );
      return true;
    } catch (err: any) {
      logger.error({ folderId: folder.id, err: err?.message }, 'folder_watcher_start_failed');
      return false;
    }
  }

  /**
   * Encerra o watcher de uma pasta.
   */
  stopWatcher(folderId: string): void {
    const watcher = this.watchers.get(folderId);
    if (watcher) {
      try {
        watcher.close();
      } catch {}
      this.watchers.delete(folderId);
    }
    this.activeConfigs.delete(folderId);
  }

  /**
   * Para todos os watchers ativos (usado em encerramentos e testes).
   */
  stopAll(): void {
    for (const [folderId] of this.watchers) {
      this.stopWatcher(folderId);
    }
    for (const [, timer] of this.debounceTimers) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  isWatching(folderId: string): boolean {
    return this.watchers.has(folderId);
  }

  getPendingFiles(folderId: string): string[] {
    const set = this.pendingFiles.get(folderId);
    return set ? Array.from(set) : [];
  }

  getAllPending(): Record<string, { folderName: string; files: string[] }> {
    const result: Record<string, { folderName: string; files: string[] }> = {};
    for (const [fId, filesSet] of this.pendingFiles) {
      if (filesSet.size > 0) {
        const cfg = this.activeConfigs.get(fId);
        result[fId] = {
          folderName: cfg?.name || 'Pasta',
          files: Array.from(filesSet),
        };
      }
    }
    return result;
  }

  /**
   * Varre a pasta recursivamente ou não, detectando XMLs novos.
   */
  async scanDirectory(
    folderId: string,
    folderName: string,
    dirPath: string,
    recursive: boolean,
    mode: 'auto' | 'prompt'
  ): Promise<string[]> {
    this.emitSse('WATCH_SYNC_PROGRESS', {
      folderId,
      folderName,
      importedCount: 0,
      skippedCount: 0,
      total: 0,
      isSyncing: true,
      phase: 'scanning',
    });

    const foundXmls: string[] = [];

    const walk = async (currentDir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const full = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (recursive) {
            await walk(full);
          }
          continue;
        }

        if (entry.isFile() && this.isXmlFile(full)) {
          const processed = this.processedFiles.get(folderId)?.has(full);
          const ignored = this.ignoredFiles.get(folderId)?.has(full);
          if (!processed && !ignored) {
            foundXmls.push(full);
          }
        }
      }
    };

    await walk(dirPath);

    if (foundXmls.length === 0) {
      this.emitSse('WATCH_SYNC_PROGRESS', {
        folderId,
        folderName,
        importedCount: 0,
        skippedCount: 0,
        total: 0,
        isSyncing: false,
        phase: 'completed',
      });
      return [];
    }

    if (mode === 'auto') {
      await this.importFiles(folderId, folderName, foundXmls);
    } else {
      const set = this.pendingFiles.get(folderId) || new Set();
      foundXmls.forEach((f) => set.add(f));
      this.pendingFiles.set(folderId, set);
      this.emitSse('WATCH_SYNC_PROGRESS', {
        folderId,
        folderName,
        importedCount: 0,
        skippedCount: 0,
        total: set.size,
        isSyncing: false,
        phase: 'completed',
      });
      this.emitSse('WATCH_PROMPT_IMPORT', {
        folderId,
        folderName,
        pendingCount: set.size,
        files: Array.from(set),
      });
    }

    return foundXmls;
  }

  /**
   * Debounce + Stability Check para novos arquivos detectados via fs.watch
   */
  private handleFileChange(folder: WatchedFolder, filePath: string): void {
    const processed = this.processedFiles.get(folder.id)?.has(filePath);
    const ignored = this.ignoredFiles.get(folder.id)?.has(filePath);
    if (processed || ignored) return;

    // Cancela debounce anterior se houver
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      const isStable = await this.checkFileStability(filePath);
      if (!isStable) return;

      const stillIgnored = this.ignoredFiles.get(folder.id)?.has(filePath);
      const stillProcessed = this.processedFiles.get(folder.id)?.has(filePath);
      if (stillIgnored || stillProcessed) return;

      if (folder.watchMode === 'auto') {
        await this.importFiles(folder.id, folder.name, [filePath]);
      } else {
        const set = this.pendingFiles.get(folder.id) || new Set();
        set.add(filePath);
        this.pendingFiles.set(folder.id, set);
        this.emitSse('WATCH_PROMPT_IMPORT', {
          folderId: folder.id,
          folderName: folder.name,
          pendingCount: set.size,
          files: Array.from(set),
        });
      }
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Checagem de estabilidade para evitar leitura de arquivo incompleto/em gravação.
   */
  private async checkFileStability(filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) return false;
      const stat1 = await fs.promises.stat(filePath);
      if (!stat1.isFile() || stat1.size === 0) return false;

      // Espera 50ms para confirmar que o tamanho estabilizou
      await new Promise((r) => setTimeout(r, 50));
      if (!fs.existsSync(filePath)) return false;
      const stat2 = await fs.promises.stat(filePath);
      if (stat1.size !== stat2.size) return false;

      // Testa abertura para leitura exclusiva
      const handle = await fs.promises.open(filePath, 'r');
      await handle.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Importa lista de arquivos XML para uma pasta através do importService.
   */
  private async importFiles(
    folderId: string,
    folderName: string,
    filePaths: string[]
  ): Promise<{ importedCount: number; skippedCount: number }> {
    if (filePaths.length === 0) {
      this.emitSse('WATCH_SYNC_PROGRESS', {
        folderId,
        folderName,
        importedCount: 0,
        skippedCount: 0,
        total: 0,
        isSyncing: false,
        phase: 'completed',
      });
      return { importedCount: 0, skippedCount: 0 };
    }

    let importedCount = 0;
    let skippedCount = 0;
    const total = filePaths.length;

    // Emite progresso inicial
    this.emitSse('WATCH_SYNC_PROGRESS', {
      folderId,
      folderName,
      importedCount: 0,
      skippedCount: 0,
      total,
      isSyncing: true,
      phase: 'importing',
    });

    try {
      const job = await this.importService.createImportJob(total);
      const processedSet = this.processedFiles.get(folderId) || new Set();

      const BATCH_SIZE = 5;
      for (let i = 0; i < filePaths.length; i++) {
        const fp = filePaths[i];
        try {
          if (!fs.existsSync(fp)) {
            skippedCount++;
            continue;
          }
          const buffer = await fs.promises.readFile(fp);
          const originalname = path.basename(fp);

          const result: any = await this.importService.processFile(
            job.id,
            { buffer, originalname } as any,
            folderId
          );

          processedSet.add(fp);
          if (result && result.duplicate) {
            skippedCount++;
          } else {
            importedCount++;
          }
        } catch (err: any) {
          skippedCount++;
          logger.warn({ filePath: fp, err: err?.message }, 'folder_watcher_file_import_error');
        }

        // Emite atualização de progresso em tempo real e cede cooperativamente ao Event Loop
        if ((i + 1) % BATCH_SIZE === 0 || i === filePaths.length - 1) {
          this.emitSse('WATCH_SYNC_PROGRESS', {
            folderId,
            folderName,
            importedCount,
            skippedCount,
            total,
            isSyncing: true,
            phase: 'importing',
          });
          await new Promise((resolve) => setImmediate(resolve));
        }
      }

      this.processedFiles.set(folderId, processedSet);
      await this.importService.markJobCompleted(job.id);

      // Emite SSE informando conclusão do sincronismo
      this.emitSse('WATCH_SYNC_PROGRESS', {
        folderId,
        folderName,
        importedCount,
        skippedCount,
        total,
        isSyncing: false,
        phase: 'completed',
      });

      // Emite SSE informando importação automática (para toast / log)
      this.emitSse('WATCH_AUTO_IMPORTED', {
        folderId,
        folderName,
        importedCount,
        skippedCount,
      });

      // Grava log de auditoria
      await this.activityLogService.record({
        level: 'INFO',
        module: 'NFVIEW',
        action: 'WATCH_AUTO_IMPORTED',
        message: `${importedCount} XMLs importados automaticamente para "${folderName}" via pasta monitorada.`,
        details: { folderId, folderName, importedCount, skippedCount, total },
      });
    } catch (err: any) {
      logger.error({ folderId, err: err?.message }, 'folder_watcher_batch_import_failed');
      this.emitSse('WATCH_SYNC_PROGRESS', {
        folderId,
        folderName,
        importedCount,
        skippedCount,
        total,
        isSyncing: false,
        phase: 'completed',
      });
    }

    return { importedCount, skippedCount };
  }

  /**
   * Confirma e importa os arquivos pendentes do modo prompt.
   */
  async confirmPendingImport(
    folderId: string
  ): Promise<{ importedCount: number; skippedCount: number }> {
    const set = this.pendingFiles.get(folderId);
    if (!set || set.size === 0) {
      return { importedCount: 0, skippedCount: 0 };
    }

    const files = Array.from(set);
    this.pendingFiles.set(folderId, new Set());

    const cfg = this.activeConfigs.get(folderId);
    let folderName = cfg?.name;
    if (!folderName) {
      const folder = await this.workspaceRepository.getFolderById(folderId);
      folderName = folder?.name || 'Pasta';
    }

    return this.importFiles(folderId, folderName, files);
  }

  /**
   * Descarta os arquivos pendentes do modo prompt, marcando-os como ignorados.
   */
  dismissPendingImport(folderId: string): void {
    const pending = this.pendingFiles.get(folderId);
    if (pending && pending.size > 0) {
      const ignored = this.ignoredFiles.get(folderId) || new Set();
      for (const f of pending) {
        ignored.add(f);
      }
      this.ignoredFiles.set(folderId, ignored);
      this.pendingFiles.set(folderId, new Set());
    }
  }

  private isXmlFile(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.xml');
  }

  private emitSse(event: string, data: any): void {
    this.emit('event', { event, data });
  }
}

export const folderWatcherService = new FolderWatcherService();

