import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { promises as fs } from 'fs';

import { initDatabase } from '../src/db';
import { createApp } from '../src/api/app';
import { backupService } from '../src/api/services/backup.service';

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1';

// Em produção desktop, garantir NODE_ENV=production para que o DB use
// `synchronous=FULL` (segurança contra corrupção por queda de energia).
if (!isDev && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'production';
}

let apiServer: { port: number; close: () => void } | null = null;
let mainWindow: BrowserWindow | null = null;

function resolveIconPath(): string | undefined {
  const candidates = [
    isDev
      ? path.join(__dirname, '..', 'src', 'assets', 'images', 'app_icon_1787839206021.jpg')
      : path.join(process.resourcesPath, 'src', 'assets', 'images', 'app_icon_1787839206021.jpg'),
    path.join(__dirname, '..', 'src', 'assets', 'images', 'app_icon_1787839206021.jpg'),
  ];
  for (const p of candidates) {
    try {
      if (require('fs').existsSync(p)) return p;
    } catch {}
  }
  return undefined;
}

async function startApiServer(): Promise<number> {
  await initDatabase();

  const expressApp = createApp();
  const PORT = 0;

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    expressApp.use(express.static(distPath));
    expressApp.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return new Promise<number>((resolve) => {
    const server = expressApp.listen(PORT, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      console.log(`[API] running on http://127.0.0.1:${port}`);
      apiServer = { port, close: () => server.close() };
      resolve(port);
    });
  });
}

function registerIpcHandlers(apiBaseUrl: string) {
  ipcMain.handle('api:baseUrl', () => apiBaseUrl);
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
  }));

  ipcMain.handle(
    'dialog:openDirectory',
    async (_e, options: { recursive?: boolean; maxFiles?: number } = {}) => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return { canceled: true, directory: null, filePaths: [] as string[], totalFound: 0, skipped: 0 };
      }
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Selecionar pasta com XMLs',
        properties: ['openDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true, directory: null, filePaths: [] as string[], totalFound: 0, skipped: 0 };
      }
      const root = result.filePaths[0];
      const recursive = options.recursive !== false;
      const maxFiles = options.maxFiles ?? 5000;
      const found: string[] = [];
      const MAX_DEPTH = 6;
      const walk = async (dir: string, depth: number) => {
        if (depth > MAX_DEPTH || found.length >= maxFiles) return;
        let entries: import('fs').Dirent[];
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          if (found.length >= maxFiles) return;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (recursive) await walk(full, depth + 1);
            continue;
          }
          if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) {
            found.push(full);
          }
        }
      };
      await walk(root, 0);
      // Autoriza leitura de cada arquivo encontrado
      for (const p of found) trackReadFile(p);
      return {
        canceled: false,
        directory: root,
        filePaths: found,
        totalFound: found.length,
        skipped: 0,
      };
    }
  );

  ipcMain.handle('dialog:openXml', async (_e, options: { multiSelections?: boolean }) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { canceled: true, filePaths: [] as string[] };
    }
    const properties: ('openFile' | 'multiSelections')[] = options?.multiSelections
      ? ['openFile', 'multiSelections']
      : ['openFile'];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar XML(s) fiscal(is)',
      properties,
      filters: [
        { name: 'Documentos Fiscais', extensions: ['xml'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    });
    for (const p of result.filePaths) trackReadFile(p);
    return { canceled: result.canceled, filePaths: result.filePaths };
  });

  ipcMain.handle('dialog:openImport', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { canceled: true, results: [] };
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar documentos fiscais',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documentos Fiscais', extensions: ['xml'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, results: [] };
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const results: Array<{ filePath: string; fileName: string; content: string; size: number }> = [];
    for (const filePath of result.filePaths) {
      try {
        const stat = await fs.stat(filePath);
        if (stat.size > MAX_FILE_SIZE) {
          console.warn(`[openImport] skipped oversized file ${filePath} (${stat.size})`);
          continue;
        }
        // Valida extensão
        if (!filePath.toLowerCase().endsWith('.xml')) {
          console.warn(`[openImport] skipped non-xml ${filePath}`);
          continue;
        }
        const content = await fs.readFile(filePath, 'utf-8');
        // Já autorizado pelo dialog; também registramos para fs:readFile.
        trackReadFile(filePath);
        results.push({
          filePath,
          fileName: path.basename(filePath),
          content,
          size: stat.size,
        });
      } catch (err) {
        console.error('[openImport] failed to read', filePath, err);
      }
    }
    return { canceled: false, results };
  });

  ipcMain.handle(
    'dialog:saveFile',
    async (_e, options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
      const result = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
      if (!result.canceled && result.filePath) {
        userAuthorizedWriteFiles.add(path.resolve(result.filePath));
      }
      return { canceled: result.canceled, filePath: result.filePath };
    }
  );

  // IPC handlers `fs:readFile` / `fs:writeFile` operam EXCLUSIVAMENTE sobre
  // paths previamente autorizados via `dialog:openXml` / `dialog:openImport` /
  // `dialog:saveFile`. A whitelist abaixo é populada quando o usuário escolhe
  // arquivos via dialog e validada em toda chamada subsequente.
  const userAuthorizedFiles = new Set<string>();
  const userAuthorizedWriteFiles = new Set<string>();

  const trackReadFile = (filePath: string) => {
    userAuthorizedFiles.add(path.resolve(filePath));
  };

  ipcMain.handle(
    'fs:readFile',
    async (_e, filePath: string): Promise<{ ok: true; content: string } | { ok: false; error: string }> => {
      if (!filePath || typeof filePath !== 'string') {
        return { ok: false, error: 'invalid_path' };
      }
      const resolved = path.resolve(filePath);
      if (!userAuthorizedFiles.has(resolved)) {
        return { ok: false, error: 'forbidden' };
      }
      try {
        const stat = await fs.stat(resolved);
        if (!stat.isFile()) return { ok: false, error: 'not_a_file' };
        if (stat.size > 10 * 1024 * 1024) return { ok: false, error: 'too_large' };
        const content = await fs.readFile(resolved, 'utf-8');
        // Consumed (one-shot auth). Renderer deve re-invocar dialog se precisar de novo.
        userAuthorizedFiles.delete(resolved);
        return { ok: true, content };
      } catch {
        return { ok: false, error: 'read_failed' };
      }
    }
  );

  ipcMain.handle(
    'fs:writeFile',
    async (
      _e,
      payload: { filePath: string; content: string | Uint8Array }
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!payload?.filePath || typeof payload.filePath !== 'string') {
        return { ok: false, error: 'invalid_path' };
      }
      const resolved = path.resolve(payload.filePath);
      if (!userAuthorizedWriteFiles.has(resolved)) {
        return { ok: false, error: 'forbidden' };
      }
      try {
        const byteLength =
          typeof payload.content === 'string'
            ? Buffer.byteLength(payload.content, 'utf-8')
            : payload.content.byteLength;
        if (byteLength > 20 * 1024 * 1024) return { ok: false, error: 'too_large' };
        const data =
          typeof payload.content === 'string'
            ? Buffer.from(payload.content, 'utf-8')
            : Buffer.from(payload.content);
        await fs.writeFile(resolved, data);
        userAuthorizedWriteFiles.delete(resolved);
        return { ok: true };
      } catch {
        return { ok: false, error: 'write_failed' };
      }
    }
  );

  // Custom title bar — fully React-rendered, no native overlay.
  const allowedActions = new Set(['minimize', 'maximize', 'close', 'fullscreen']);
  ipcMain.handle('window:control', async (_e, action: string) => {
    if (!mainWindow) return;
    if (!allowedActions.has(action)) {
      console.warn('[window:control] blocked invalid action', action);
      return;
    }
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
        break;
      case 'fullscreen':
        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
        else mainWindow.setFullScreen(true);
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  ipcMain.handle('window:getState', async () => {
    if (!mainWindow) {
      return { isMaximized: false, isFullScreen: false, platform: process.platform };
    }
    return {
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
      platform: process.platform,
    };
  });
}

async function createWindow(apiBaseUrl: string) {
  const iconPath = resolveIconPath();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0c0e12',
    title: 'Workspace Fiscal',
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    // Fully custom title bar — React renders the entire bar including min/max/close buttons.
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  // Broadcast window state changes to the renderer (for syncing icon swap in React).
  const broadcastState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('window:state', {
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
      platform: process.platform,
    });
  };
  mainWindow.on('maximize', broadcastState);
  mainWindow.on('unmaximize', broadcastState);
  mainWindow.on('enter-full-screen', broadcastState);
  mainWindow.on('leave-full-screen', broadcastState);
  mainWindow.on('minimize', broadcastState);
  mainWindow.on('restore', broadcastState);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    broadcastState();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      } else {
        console.warn('[security] blocked non-http external url:', url);
      }
    } catch {
      console.warn('[security] blocked malformed external url:', url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(apiBaseUrl);
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  const apiPort = await startApiServer();
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  registerIpcHandlers(apiBaseUrl);
  await createWindow(apiBaseUrl);

  // Inicia agendador de backup e tenta um check imediato
  backupService.startScheduler(6);
  backupService.maybeRunIfDue().catch((err) =>
    console.error('[backup] startup check failed:', err)
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(apiBaseUrl);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (apiServer) {
    try {
      apiServer.close();
    } catch (err) {
      console.error('[shutdown] apiServer.close failed', err);
    }
  }
  backupService.stopScheduler();
});
