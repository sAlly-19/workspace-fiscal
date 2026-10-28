/**
 * Automated Full HD (1920x1080 @ 60fps) Video Recorder for Workspace Fiscal Presentation
 * Uses Headless Chromium (Chrome/Edge) via DevTools Protocol (CDP) + FFmpeg H.264 Encoding.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PRESENTATION_HTML = path.join(ROOT_DIR, 'presentation', 'index.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'release');
const OUTPUT_MP4 = path.join(OUTPUT_DIR, 'workspace-fiscal-apresentacao-1080p.mp4');

const CAPTURE_FPS = 30;
const OUTPUT_FPS = 60;
const DURATION_SECONDS = 185; // 3m 05s
const TOTAL_FRAMES = DURATION_SECONDS * CAPTURE_FPS;

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Nenhum navegador Chromium (Chrome ou Edge) encontrado no sistema.');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForDebuggerUrl(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const pageTarget = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (pageTarget) return pageTarget.webSocketDebuggerUrl;
      }
    } catch {
      // wait until ready
    }
    await sleep(150);
  }
  throw new Error('Timeout aguardando conexão CDP do navegador.');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browserExe = findBrowserExecutable();
  const debugPort = 9345 + Math.floor(Math.random() * 500);
  const userDataDir = path.join(OUTPUT_DIR, `.tmp-chrome-profile-${debugPort}`);
  const targetUrl = `${pathToFileURL(PRESENTATION_HTML).href}?record=1`;

  console.log(`[1/4] Iniciando motor de renderização Full HD (1920x1080)...`);
  console.log(`      Navegador: ${browserExe}`);
  console.log(`      Apresentação: ${targetUrl}`);

  const chromeProc = spawn(
    browserExe,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1920,1080',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu-vsync',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      targetUrl,
    ],
    { stdio: 'ignore' }
  );

  let cdp = null;
  try {
    const wsUrl = await waitForDebuggerUrl(debugPort);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Wait until window.__setPresentationTime is defined
    for (let i = 0; i < 40; i++) {
      const check = await cdp.send('Runtime.evaluate', {
        expression: 'typeof window.__setPresentationTime === "function"',
        returnByValue: true,
      });
      if (check?.result?.value === true) break;
      await sleep(100);
    }

    console.log(`[2/4] Iniciando pipeline FFmpeg (1920x1080 @ ${OUTPUT_FPS}fps H.264)...`);
    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(CAPTURE_FPS),
      '-i', '-',
      '-r', String(OUTPUT_FPS),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      OUTPUT_MP4,
    ];

    const ffmpegProc = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    let ffmpegStderr = '';
    ffmpegProc.stderr.on('data', (chunk) => {
      ffmpegStderr += chunk.toString();
    });

    const ffmpegDone = new Promise((resolve, reject) => {
      ffmpegProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg encerrou com código ${code}:\n${ffmpegStderr.slice(-600)}`));
      });
    });

    console.log(`[3/4] Renderizando ${TOTAL_FRAMES} quadros (${DURATION_SECONDS}s de apresentação)...`);
    let lastSignature = null;
    let lastFrameBuffer = null;
    let renderedScreenshots = 0;
    let cachedFrames = 0;
    const startTime = Date.now();

    for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
      const t = frame / CAPTURE_FPS;

      const evalRes = await cdp.send('Runtime.evaluate', {
        expression: `window.__setPresentationTime(${t.toFixed(4)})`,
        returnByValue: true,
      });
      const signature = evalRes?.result?.value;

      if (signature && signature === lastSignature && lastFrameBuffer) {
        cachedFrames++;
      } else {
        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'jpeg',
          quality: 92,
        });
        lastFrameBuffer = Buffer.from(shot.data, 'base64');
        lastSignature = signature;
        renderedScreenshots++;
      }

      const canContinue = ffmpegProc.stdin.write(lastFrameBuffer);
      if (!canContinue) {
        await new Promise((r) => ffmpegProc.stdin.once('drain', r));
      }

      if ((frame + 1) % (CAPTURE_FPS * 15) === 0 || frame === TOTAL_FRAMES - 1) {
        const pct = (((frame + 1) / TOTAL_FRAMES) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `      Progresso: ${pct}% (${Math.round(t)}s / ${DURATION_SECONDS}s) | Capturas: ${renderedScreenshots} | Cache: ${cachedFrames} | Tempo: ${elapsed}s`
        );
      }
    }

    ffmpegProc.stdin.end();
    console.log(`[4/4] Finalizando codificação MP4 e gravando metadados faststart...`);
    await ffmpegDone;

    const stats = fs.statSync(OUTPUT_MP4);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ Vídeo gerado com sucesso!`);
    console.log(`   Arquivo: ${OUTPUT_MP4}`);
    console.log(`   Tamanho: ${sizeMb} MB`);
    console.log(`   Resolução: 1920x1080 Full HD @ ${OUTPUT_FPS}fps | Duração: 03:05 (185s)`);
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
    await sleep(400);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup errors
    }
  }
}

main().catch((err) => {
  console.error('❌ Erro ao gravar apresentação:', err);
  process.exit(1);
});

