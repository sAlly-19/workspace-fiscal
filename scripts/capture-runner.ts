import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { createApp } from '../src/api/app';
import { initDatabase, rawClient } from '../src/db';

let mainWindow: BrowserWindow | null = null;
let apiServer: { port: number; close: () => void } | null = null;

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'screenshots');

async function startApi(): Promise<number> {
  process.env.NFVIEW_DB_PATH = path.resolve(process.cwd(), 'sqlite.db');
  await initDatabase();
  try {
    await rawClient.execute({
      sql: `INSERT OR REPLACE INTO application_settings (key, value) VALUES ('seen_app_version', '2.5.4')`,
      args: []
    });
  } catch {}

  const expressApp = createApp();
  const distPath = path.join(process.cwd(), 'dist');
  expressApp.use(express.static(distPath));
  expressApp.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  return new Promise<number>((resolve) => {
    const server = expressApp.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      console.log(`[Capture API] running on http://127.0.0.1:${port}`);
      apiServer = { port, close: () => server.close() };
      resolve(port);
    });
  });
}

function registerIpc(baseUrl: string) {
  ipcMain.handle('api:baseUrl', () => baseUrl);
  ipcMain.handle('app:version', () => '2.5.4');
  ipcMain.handle('app:checkForUpdates', async () => ({ updateAvailable: false }));
  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
  }));
  ipcMain.handle('window:getState', () => ({
    isMaximized: false,
    isFullScreen: false,
    platform: 'win32',
  }));
  ipcMain.handle('window:control', (_e, action) => {
    console.log('[window:control]', action);
  });
  ipcMain.handle('updater:getState', () => ({
    status: 'idle',
    updateInfo: null,
    error: null,
    downloadProgress: null,
  }));
  ipcMain.handle('updater:check', () => ({ updateAvailable: false }));
  ipcMain.handle('updater:download', () => ({}));
  ipcMain.handle('updater:cancel', () => ({}));
  ipcMain.handle('updater:install', () => ({}));
  ipcMain.handle('dialog:openBackup', () => ({ canceled: true, filePath: null }));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture(name: string, delay = 800) {
  if (!mainWindow) return;
  await sleep(delay);
  const image = await mainWindow.webContents.capturePage();
  const filePath = path.join(SCREENSHOT_DIR, name);
  fs.writeFileSync(filePath, image.toPNG());
  console.log(`[OK] Captured: ${name} (${image.getSize().width}x${image.getSize().height}, ${fs.statSync(filePath).size} bytes)`);
}

async function runCaptures(port: number) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const url = `http://127.0.0.1:${port}`;
  console.log('[Capture Runner] Loading:', url);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    frame: false,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  await mainWindow.loadURL(url);

  // Dispensar WhatsNewModal com clique no botão azul e atualizar localStorage
  await sleep(1000);
  await mainWindow.webContents.executeJavaScript(`
    localStorage.setItem('workspace_fiscal_seen_version', '2.5.4');
    localStorage.setItem('workspace_fiscal_seen_version_v2', '2.5.4');
    localStorage.setItem('workspace_fiscal_seen_version', '2.5.3');
    const okBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Entendido'));
    if (okBtn) okBtn.click();
  `);
  await sleep(600);

  // 1. Hub Principal (Home)
  console.log('-> Capturing 01-hub-principal.png...');
  await capture('01-hub-principal.png', 500);

  // 2. NF View - Painel e Documentos
  console.log('-> Navigating to NF View...');
  await mainWindow.webContents.executeJavaScript(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('NF View') || b.textContent?.includes('Acessar NF View')
    );
    if (btn) btn.click();
  `);
  await sleep(2500);
  console.log('-> Capturing 02-nfview-documentos.png...');
  await capture('02-nfview-documentos.png', 500);

  // 3. NF View - Dados Analíticos da Nota
  console.log('-> Selecting NF-e 14520 and Dados da Nota tab...');
  await mainWindow.webContents.executeJavaScript(`
    const nfe = document.querySelector('[data-doc-id="doc_demo_nfe_1"]');
    if (nfe) nfe.click();
    const tabDados = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('Dados da Nota')
    );
    if (tabDados) tabDados.click();
  `);
  await sleep(1500);
  console.log('-> Capturing 03-danfe-nfe.png (Dados Analíticos)...');
  await capture('03-danfe-nfe.png', 500);

  // 4. Visualizador de XML Técnico
  console.log('-> Switching to XML Original tab...');
  await mainWindow.webContents.executeJavaScript(`
    const tabXml = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('XML Original')
    );
    if (tabXml) tabXml.click();
  `);
  await sleep(2000);
  console.log('-> Capturing 06-visualizador-xml.png...');
  await capture('06-visualizador-xml.png', 500);

  // 5. DANFSE (NFS-e)
  console.log('-> Selecting NFS-e 2026048...');
  await mainWindow.webContents.executeJavaScript(`
    const tabVis = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('DANFE')
    );
    if (tabVis) tabVis.click();
    const nfse = document.querySelector('[data-doc-id="doc_demo_nfse_1"]');
    if (nfse) nfse.click();
  `);
  await sleep(1500);
  console.log('-> Capturing 04-danfse-nfse.png...');
  await capture('04-danfse-nfse.png', 500);

  // 6. DACTE (CT-e)
  console.log('-> Selecting CT-e 5541...');
  await mainWindow.webContents.executeJavaScript(`
    const cte = document.querySelector('[data-doc-id="doc_demo_cte_1"]');
    if (cte) cte.click();
  `);
  await sleep(1500);
  console.log('-> Capturing 05-dacte-cte.png...');
  await capture('05-dacte-cte.png', 500);

  // 7. Depreciação - Painel Geral
  console.log('-> Returning to Home...');
  await mainWindow.webContents.executeJavaScript(`
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.title?.includes('Voltar') || b.textContent?.includes('Início') || b.textContent?.includes('Voltar')
    );
    if (backBtn) backBtn.click();
  `);
  await sleep(1200);

  console.log('-> Navigating to Depreciação...');
  await mainWindow.webContents.executeJavaScript(`
    const depBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('Depreciação') || b.textContent?.includes('Acessar Depreciação')
    );
    if (depBtn) depBtn.click();
  `);
  await sleep(2500);
  console.log('-> Capturing 07-depreciacao-dashboard.png...');
  await capture('07-depreciacao-dashboard.png', 500);

  // 8. Depreciação - Ativos e Histórico / Cronograma
  console.log('-> Navigating to Bens tab...');
  await mainWindow.webContents.executeJavaScript(`
    const tabBens = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.trim() === 'Bens'
    );
    if (tabBens) tabBens.click();
  `);
  await sleep(1200);

  console.log('-> Opening Asset Schedule / History Modal...');
  await mainWindow.webContents.executeJavaScript(`
    const eyeBtn = document.querySelector('button[title*="histórico"], button[title*="Histórico"]');
    if (eyeBtn) eyeBtn.click();
  `);
  await sleep(1500);
  console.log('-> Capturing 08-depreciacao-cronograma.png...');
  await capture('08-depreciacao-cronograma.png', 500);

  // Fechar modal de histórico com ESC
  await mainWindow.webContents.executeJavaScript(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  `);
  await sleep(800);

  // 9. Depreciação - Configurador de Colunas do CSV
  console.log('-> Returning to Dashboard tab...');
  await mainWindow.webContents.executeJavaScript(`
    const tabDash = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.trim() === 'Início'
    );
    if (tabDash) tabDash.click();
  `);
  await sleep(1000);

  console.log('-> Opening CSV Layout Modal...');
  await mainWindow.webContents.executeJavaScript(`
    const csvBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('Colunas do CSV')
    );
    if (csvBtn) csvBtn.click();
  `);
  await sleep(1200);
  console.log('-> Capturing 09-configurador-colunas-csv.png...');
  await capture('09-configurador-colunas-csv.png', 500);

  // Fechar modal de layout CSV com ESC
  await mainWindow.webContents.executeJavaScript(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  `);
  await sleep(800);

  // 10. Central de Configurações - Backup & Restauração Segura
  console.log('-> Opening Settings Modal from Depreciation...');
  await mainWindow.webContents.executeJavaScript(`
    const setBtn = document.querySelector('button[title*="Configurações do Sistema"], button[aria-label*="Configurações"]');
    if (setBtn) setBtn.click();
  `);
  await sleep(1200);

  console.log('-> Selecting Backup Tab in Settings...');
  await mainWindow.webContents.executeJavaScript(`
    const backupBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.textContent?.includes('Backup') || b.textContent?.includes('Restauração')
    );
    if (backupBtn) backupBtn.click();
  `);
  await sleep(1500);
  console.log('-> Capturing 10-configuracoes-backup.png...');
  await capture('10-configuracoes-backup.png', 500);

  console.log('=== All 10 screenshots captured successfully! ===');
  setTimeout(() => {
    app.quit();
  }, 1000);
}

app.whenReady().then(async () => {
  const port = await startApi();
  registerIpc(`http://127.0.0.1:${port}`);
  await runCaptures(port);
});

app.on('window-all-closed', () => {
  if (apiServer) apiServer.close();
  app.quit();
});
