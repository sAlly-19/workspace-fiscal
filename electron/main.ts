import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { promises as fs } from 'fs';

import { initDatabase } from '../src/db';
import { createApp } from '../src/api/app';

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1';

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
    home: app.getPath('home'),
  }));

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
      return { canceled: result.canceled, filePath: result.filePath };
    }
  );

  // Hardened file access: apenas dentro de userData / documents / downloads
  const allowedBasePaths = [
    app.getPath('userData'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('home'),
  ];

  function isPathAllowed(targetPath: string): boolean {
    try {
      const resolved = path.resolve(targetPath);
      return allowedBasePaths.some((base) => {
        const baseResolved = path.resolve(base);
        return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
      });
    } catch {
      return false;
    }
  }

  ipcMain.handle(
    'fs:writeFile',
    async (_e, payload: { filePath: string; content: string | Uint8Array }) => {
      try {
        if (!payload?.filePath || typeof payload.filePath !== 'string') return false;
        if (!isPathAllowed(payload.filePath)) {
          console.warn('[fs:writeFile] blocked disallowed path', payload.filePath);
          return false;
        }
        // Limite 20MB
        const byteLength = typeof payload.content === 'string'
          ? Buffer.byteLength(payload.content, 'utf-8')
          : payload.content.byteLength;
        if (byteLength > 20 * 1024 * 1024) {
          console.warn('[fs:writeFile] blocked oversized write', byteLength);
          return false;
        }
        const data =
          typeof payload.content === 'string'
            ? Buffer.from(payload.content, 'utf-8')
            : Buffer.from(payload.content);
        await fs.writeFile(payload.filePath, data);
        return true;
      } catch (err) {
        console.error('[fs:writeFile] failed', err);
        return false;
      }
    }
  );

  ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
    if (!isPathAllowed(filePath)) {
      throw new Error('Acesso negado: caminho fora das pastas permitidas');
    }
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) throw new Error('Arquivo não encontrado');
    if (stat.size > 10 * 1024 * 1024) throw new Error('Arquivo excede limite de 10MB');
    return await fs.readFile(filePath, 'utf-8');
  });

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
      sandbox: true,
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
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadURL(apiBaseUrl);
  }
}

app.whenReady().then(async () => {
  const apiPort = await startApiServer();
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  registerIpcHandlers(apiBaseUrl);
  await createWindow(apiBaseUrl);

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
});
