import { autoUpdater, CancellationToken, UpdateInfo, ProgressInfo } from 'electron-updater';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { updateService } from '../src/api/services/update.service';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export interface UpdateProgressData {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface AppUpdateInfo {
  version: string;
  currentVersion: string;
  releaseNotes?: string;
  releaseDate?: string;
  releaseName?: string;
  releaseUrl?: string;
  downloadUrl?: string | null;
  isPortable: boolean;
  isDev: boolean;
}

export interface UpdaterState {
  status: UpdateStatus;
  updateInfo: AppUpdateInfo | null;
  progress: UpdateProgressData | null;
  errorMessage: string | null;
  isPortable: boolean;
  isDev: boolean;
}

class AppUpdaterManager {
  private mainWindow: BrowserWindow | null = null;
  private cancellationToken: CancellationToken | null = null;
  private fallbackAbortController: AbortController | null = null;
  private fallbackInstallerPath: string | null = null;
  private isDownloadingFallback: boolean = false;
  private isPortable: boolean = false;
  private isDev: boolean = false;

  private state: UpdaterState = {
    status: 'idle',
    updateInfo: null,
    progress: null,
    errorMessage: null,
    isPortable: false,
    isDev: false,
  };

  init(window: BrowserWindow) {
    this.mainWindow = window;
    this.isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE);
    this.isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1';

    this.state.isPortable = this.isPortable;
    this.state.isDev = this.isDev;

    // Configurações do autoUpdater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    this.setupListeners();
    this.registerIpcHandlers();
  }

  setWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  getState(): UpdaterState {
    return { ...this.state };
  }

  private broadcastStatus() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:statusChange', this.getState());
    }
  }

  private broadcastProgress(progress: UpdateProgressData) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:progress', progress);
    }
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.state.status = 'checking';
      this.state.errorMessage = null;
      this.broadcastStatus();
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.state.status = 'available';
      this.state.errorMessage = null;

      let notes = '';
      if (typeof info.releaseNotes === 'string') {
        notes = info.releaseNotes;
      } else if (Array.isArray(info.releaseNotes)) {
        notes = info.releaseNotes.map((n: any) => (typeof n === 'string' ? n : n.note || '')).join('\n');
      }

      this.state.updateInfo = {
        version: info.version,
        currentVersion: app.getVersion(),
        releaseNotes: notes,
        releaseDate: info.releaseDate,
        releaseName: (info as any).releaseName || `Versão ${info.version}`,
        releaseUrl: `https://github.com/sAlly-19/workspace-fiscal/releases/tag/v${info.version}`,
        isPortable: this.isPortable,
        isDev: this.isDev,
      };
      this.broadcastStatus();
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.state.status = 'not-available';
      this.state.errorMessage = null;
      this.state.updateInfo = {
        version: info?.version || app.getVersion(),
        currentVersion: app.getVersion(),
        isPortable: this.isPortable,
        isDev: this.isDev,
      };
      this.broadcastStatus();
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      this.state.status = 'downloading';
      this.state.errorMessage = null;
      this.state.progress = {
        percent: Math.min(100, Math.max(0, Math.round(progressObj.percent * 10) / 10)),
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond,
      };
      this.broadcastProgress(this.state.progress);
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.state.status = 'downloaded';
      this.state.errorMessage = null;
      this.state.progress = {
        percent: 100,
        transferred: this.state.progress?.total || 0,
        total: this.state.progress?.total || 0,
        bytesPerSecond: 0,
      };
      this.broadcastStatus();
    });

    autoUpdater.on('error', (err: Error) => {
      console.error('[autoUpdater] error:', err);
      // Não sobrescreve se o download foi cancelado intencionalmente
      if (this.state.status === 'idle') return;

      // Se falhou durante o download do autoUpdater, tenta o fallback direto do GitHub
      if (this.state.status === 'downloading' && !this.isDownloadingFallback) {
        console.warn('[autoUpdater] download error encountered, initiating fallback:', err?.message);
        this.downloadFallbackDirect(this.state.updateInfo?.version).catch(() => {});
        return;
      }

      this.state.status = 'error';
      this.state.errorMessage = err?.message || 'Erro ao processar atualização';
      this.broadcastStatus();
    });
  }

  async checkForUpdates(): Promise<UpdaterState> {
    this.state.status = 'checking';
    this.state.errorMessage = null;
    this.broadcastStatus();

    // Se estiver em modo de desenvolvimento, usa o serviço da GitHub API
    // para consultar a release sem quebrar por falta de app-update.yml
    if (this.isDev) {
      try {
        const ghResult = await updateService.checkLatestRelease();
        if (ghResult.hasUpdate) {
          this.state.status = 'available';
          this.state.updateInfo = {
            version: ghResult.latestVersion,
            currentVersion: ghResult.currentVersion,
            releaseNotes: ghResult.releaseNotes,
            releaseDate: ghResult.publishedAt,
            releaseName: ghResult.releaseName,
            releaseUrl: ghResult.releaseUrl,
            downloadUrl: ghResult.downloadUrl,
            isPortable: this.isPortable,
            isDev: true,
          };
        } else {
          this.state.status = 'not-available';
          this.state.updateInfo = {
            version: ghResult.latestVersion,
            currentVersion: ghResult.currentVersion,
            isPortable: this.isPortable,
            isDev: true,
          };
        }
      } catch (err: any) {
        this.state.status = 'error';
        this.state.errorMessage = err?.message || 'Erro ao consultar GitHub';
      }
      this.broadcastStatus();
      return this.getState();
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (err: any) {
      console.error('[autoUpdater] checkForUpdates error:', err);
      this.state.status = 'error';
      this.state.errorMessage = err?.message || 'Erro ao buscar atualizações';
      this.broadcastStatus();
    }

    return this.getState();
  }

  async startDownload(): Promise<void> {
    if (this.isPortable) {
      this.state.status = 'error';
      this.state.errorMessage = 'A atualização automática não é suportada na versão portátil.';
      this.broadcastStatus();
      return;
    }

    if (this.isDev) {
      this.state.status = 'error';
      this.state.errorMessage = 'Download de atualização desativado no ambiente de desenvolvimento.';
      this.broadcastStatus();
      return;
    }

    this.isDownloadingFallback = false;
    this.fallbackInstallerPath = null;

    try {
      this.state.status = 'downloading';
      this.state.errorMessage = null;
      this.state.progress = { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 };
      this.broadcastStatus();

      this.cancellationToken = new CancellationToken();
      await autoUpdater.downloadUpdate(this.cancellationToken);
    } catch (err: any) {
      console.warn('[autoUpdater] downloadUpdate failed, trying fallback direct download:', err?.message);
      await this.downloadFallbackDirect(this.state.updateInfo?.version);
    }
  }

  private async downloadFallbackDirect(targetVersion?: string): Promise<void> {
    if (this.isDownloadingFallback) return;
    this.isDownloadingFallback = true;
    this.state.status = 'downloading';
    this.state.errorMessage = null;
    this.broadcastStatus();

    try {
      const repo = 'sAlly-19/workspace-fiscal';
      const endpoint = targetVersion
        ? `https://api.github.com/repos/${repo}/releases/tags/v${targetVersion.replace(/^v/, '')}`
        : `https://api.github.com/repos/${repo}/releases/latest`;

      const res = await fetch(endpoint, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `WorkspaceFiscal/${app.getVersion()}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Falha ao consultar release do GitHub (HTTP ${res.status})`);
      }

      const releaseData = await res.json();
      const assets = Array.isArray(releaseData.assets) ? releaseData.assets : [];

      // Procura o asset do instalador Setup NSIS (.exe)
      let installerAsset = assets.find((a: any) =>
        typeof a?.name === 'string' &&
        a.name.toLowerCase().endsWith('.exe') &&
        (a.name.toLowerCase().includes('setup') || !a.name.toLowerCase().includes('portable'))
      );

      // Fallback para qualquer .exe caso não tenha encontrado pelo padrão acima
      if (!installerAsset) {
        installerAsset = assets.find((a: any) =>
          typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.exe')
        );
      }

      if (!installerAsset || !installerAsset.browser_download_url) {
        throw new Error('Nenhum instalador executável (.exe) encontrado nos anexos da release do GitHub.');
      }

      const downloadUrl = installerAsset.browser_download_url;
      const totalBytes = installerAsset.size || 0;
      const tempDest = path.join(app.getPath('temp'), installerAsset.name);

      this.fallbackAbortController = new AbortController();

      const dlResponse = await fetch(downloadUrl, {
        signal: this.fallbackAbortController.signal,
        headers: {
          'User-Agent': `WorkspaceFiscal/${app.getVersion()}`,
        },
      });

      if (!dlResponse.ok || !dlResponse.body) {
        throw new Error(`Erro no download do instalador (HTTP ${dlResponse.status})`);
      }

      const fileStream = fs.createWriteStream(tempDest);
      let transferred = 0;
      let lastReport = Date.now();
      let lastTransferred = 0;

      const reader = dlResponse.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          fileStream.write(Buffer.from(value));
          transferred += value.length;

          const now = Date.now();
          if (now - lastReport > 200 || transferred === totalBytes) {
            const timeDelta = (now - lastReport) / 1000 || 0.001;
            const bytesDelta = transferred - lastTransferred;
            const bps = Math.round(bytesDelta / timeDelta);

            const percent = totalBytes > 0
              ? Math.min(100, Math.round((transferred / totalBytes) * 1000) / 10)
              : 0;

            this.state.progress = {
              percent,
              transferred,
              total: totalBytes || transferred,
              bytesPerSecond: bps,
            };
            this.broadcastProgress(this.state.progress);

            lastReport = now;
            lastTransferred = transferred;
          }
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.end((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.fallbackInstallerPath = tempDest;
      this.state.status = 'downloaded';
      this.state.progress = {
        percent: 100,
        transferred,
        total: totalBytes || transferred,
        bytesPerSecond: 0,
      };
      this.state.errorMessage = null;
      this.isDownloadingFallback = false;
      this.broadcastStatus();
    } catch (err: any) {
      if (this.fallbackAbortController?.signal.aborted) {
        this.state.status = 'available';
        this.state.progress = null;
        this.state.errorMessage = null;
      } else {
        console.error('[AppUpdaterManager] fallback download error:', err);
        this.state.status = 'error';
        this.state.errorMessage = err?.message || 'Falha ao baixar o instalador de atualização.';
      }
      this.isDownloadingFallback = false;
      this.broadcastStatus();
    }
  }

  cancelDownload() {
    if (this.cancellationToken) {
      this.cancellationToken.cancel();
      this.cancellationToken = null;
    }
    if (this.fallbackAbortController) {
      this.fallbackAbortController.abort();
      this.fallbackAbortController = null;
    }
    this.isDownloadingFallback = false;
    this.state.status = 'available';
    this.state.progress = null;
    this.state.errorMessage = null;
    this.broadcastStatus();
  }

  installAndRestart() {
    if (this.isPortable || this.isDev) {
      return;
    }
    this.state.status = 'installing';
    this.broadcastStatus();

    if (this.fallbackInstallerPath && fs.existsSync(this.fallbackInstallerPath)) {
      setImmediate(() => {
        try {
          const child = spawn(this.fallbackInstallerPath!, ['--updated'], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          app.quit();
        } catch (err) {
          console.error('[AppUpdaterManager] fallback execution error:', err);
          autoUpdater.quitAndInstall(false, true);
        }
      });
      return;
    }

    // Fecha o aplicativo e executa o instalador NSIS
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
  }

  private registerIpcHandlers() {
    ipcMain.handle('updater:check', async () => this.checkForUpdates());
    ipcMain.handle('updater:download', async () => this.startDownload());
    ipcMain.handle('updater:cancel', async () => this.cancelDownload());
    ipcMain.handle('updater:install', async () => this.installAndRestart());
    ipcMain.handle('updater:getState', () => this.getState());
  }
}

export const appUpdater = new AppUpdaterManager();
