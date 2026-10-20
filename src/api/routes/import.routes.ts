import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { importService } from '../services/import.service';
import { workspaceRepository } from '../repositories/workspace.repository';
import { sanitizeFileName } from '../../core/security/pathSanitizer';

const router = Router();

export const BATCH_YIELD_INTERVAL = 25;

/**
 * Cede cooperativamente o Event Loop para manter rotas como /api/health e I/O
 * responsivos mesmo durante importações em massa (IMP-T06).
 */
export async function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// Limite de 100MB para pacotes ZIP e 10MB para XMLs individuais
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isXml = name.endsWith('.xml') || file.mimetype.includes('xml');
    const isZip = name.endsWith('.zip') || file.mimetype.includes('zip') || file.mimetype.includes('compressed');
    if (isXml || isZip) {
      return cb(null, true);
    }
    cb(null, true);
  },
});

router.post(['/', '/upload'], upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { batchId } = req.body;

    // Descompacta arquivos ZIP em itens XML individuais
    const unpackedFiles: Express.Multer.File[] = [];
    for (const file of files) {
      const name = file.originalname.toLowerCase();
      if (name.endsWith('.zip') || file.mimetype.includes('zip') || file.mimetype.includes('compressed')) {
        try {
          const zip = new AdmZip(file.buffer);
          const entries = zip.getEntries();
          for (const entry of entries) {
            if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml') && !entry.entryName.includes('__MACOSX')) {
              const buffer = entry.getData();
              unpackedFiles.push({
                fieldname: 'files',
                originalname: sanitizeFileName(path.basename(entry.entryName)),
                encoding: '7bit',
                mimetype: 'text/xml',
                size: buffer.length,
                buffer: buffer,
                destination: '',
                filename: '',
                path: '',
                stream: null as any,
              });
            }
          }
        } catch (zipErr) {
          console.error(`[ImportRoute] Erro ao descompactar ZIP ${file.originalname}:`, zipErr);
        }
      } else if (name.endsWith('.xml') || file.mimetype.includes('xml')) {
        unpackedFiles.push(file);
      }
    }

    if (unpackedFiles.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo XML válido encontrado para importação.' });
    }

    // Cria o registro do Job
    const job = await importService.createImportJob(unpackedFiles.length);

    // Processa os arquivos em segundo plano
    (async () => {
      try {
        for (let i = 0; i < unpackedFiles.length; i++) {
          await importService.processFile(job.id, unpackedFiles[i], batchId);
          if ((i + 1) % BATCH_YIELD_INTERVAL === 0) {
            await yieldEventLoop();
          }
        }
      } catch (loopErr) {
        console.error('[ImportRoute] Error during file processing loop:', loopErr);
      } finally {
        await importService.markJobCompleted(job.id);
      }
    })();

    res.status(202).json({
      message: 'Importação iniciada com sucesso.',
      jobId: job.id,
      totalFiles: unpackedFiles.length,
    });
  } catch (error) {
    console.error('[ImportRoute] Erro na importação:', error);
    res.status(500).json({ error: 'Erro interno ao iniciar a importação.' });
  }
});

router.get('/:jobId', async (req, res) => {
  try {
    const job = await importService.getImportJobStatus(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job não encontrado.' });
    }

    const docs = await importService.getJobDocuments(req.params.jobId);
    const total = job.totalFiles || 0;
    const processed = job.processedFiles || 0;
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 100;
    const statusNormalized = job.status.toLowerCase();
    const duplicates = importService.getJobDuplicatesCount(job.id);

    res.json({
      id: job.id,
      status: statusNormalized,
      statusRaw: job.status,
      total,
      processed,
      totalFiles: total,
      processedFiles: processed,
      duplicates,
      percent,
      results: docs
    });
  } catch (error) {
    console.error('[ImportRoute] Erro ao buscar status:', error);
    res.status(500).json({ error: 'Erro ao buscar status da importação.' });
  }
});

// Importação por caminhos locais (suporta XML, ZIP e pastas)
router.post('/paths', async (req, res) => {
  try {
    const { filePaths, batchId } = req.body as { filePaths?: string[]; batchId?: string };
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'filePaths deve ser um array não vazio.' });
    }

    // Coleta arquivos .xml e expande pastas e arquivos .zip
    const targetXmlPaths: string[] = [];
    const inMemoryFiles: Express.Multer.File[] = [];

    const walkDir = (dir: string, depth = 0) => {
      if (depth > 8) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walkDir(full, depth + 1);
          } else if (entry.isFile()) {
            if (entry.name.toLowerCase().endsWith('.xml')) {
              targetXmlPaths.push(full);
            } else if (entry.name.toLowerCase().endsWith('.zip')) {
              tryExtractZip(full);
            }
          }
        }
      } catch {}
    };

    const tryExtractZip = (zipPath: string) => {
      try {
        const zip = new AdmZip(zipPath);
        const entries = zip.getEntries();
        for (const entry of entries) {
          if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml') && !entry.entryName.includes('__MACOSX')) {
            const buffer = entry.getData();
            inMemoryFiles.push({
              fieldname: 'files',
              originalname: sanitizeFileName(path.basename(entry.entryName)),
              encoding: '7bit',
              mimetype: 'text/xml',
              size: buffer.length,
              buffer,
              destination: '',
              filename: '',
              path: '',
              stream: null as any,
            });
          }
        }
      } catch (err) {
        console.error(`[ImportRoute] Falha ao ler ZIP ${zipPath}:`, err);
      }
    };

    for (const p of filePaths) {
      if (typeof p !== 'string' || !p.trim()) continue;
      const normalized = path.normalize(p.trim());
      // Rejeita sequências relativas de directory traversal
      if (normalized.includes('..') && !path.isAbsolute(normalized)) continue;
      try {
        if (!fs.existsSync(normalized)) continue;
        const stat = fs.statSync(normalized);
        if (stat.isDirectory()) {
          walkDir(normalized);
        } else if (stat.isFile()) {
          if (normalized.toLowerCase().endsWith('.xml')) {
            targetXmlPaths.push(normalized);
          } else if (normalized.toLowerCase().endsWith('.zip')) {
            tryExtractZip(normalized);
          }
        }
      } catch {}
    }

    const totalCount = targetXmlPaths.length + inMemoryFiles.length;
    if (totalCount === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo XML válido encontrado nos caminhos fornecidos.' });
    }

    const job = await importService.createImportJob(totalCount);

    res.status(202).json({
      message: 'Importação iniciada.',
      jobId: job.id,
      queued: totalCount,
    });

    // Worker assíncrono em background
    (async () => {
      const MAX_SIZE = 10 * 1024 * 1024;
      try {
        // 1. Processa arquivos XML em disco
        for (let i = 0; i < targetXmlPaths.length; i++) {
          const filePath = targetXmlPaths[i];
          try {
            const stat = await fs.promises.stat(filePath);
            if (!stat.isFile() || stat.size === 0 || stat.size > MAX_SIZE) {
              await importService.incrementProcessed(job.id);
              continue;
            }
            const buffer = await fs.promises.readFile(filePath);
            const fakeFile: Express.Multer.File = {
              fieldname: 'files',
              originalname: path.basename(filePath),
              encoding: '7bit',
              mimetype: 'text/xml',
              size: buffer.length,
              buffer,
              destination: '',
              filename: '',
              path: filePath,
              stream: null as any,
            };
            await importService.processFile(job.id, fakeFile, batchId);
          } catch (fileErr) {
            console.error(`[ImportRoute] Erro ao ler ${filePath}:`, fileErr);
            await importService.incrementProcessed(job.id);
          }
          if ((i + 1) % BATCH_YIELD_INTERVAL === 0) {
            await yieldEventLoop();
          }
        }

        // Se a importação ocorreu direcionada a uma pasta, registra os arquivos em disco no histórico de watch
        if (batchId && targetXmlPaths.length > 0) {
          const filesToRecord = targetXmlPaths.map((fp) => ({ filePath: fp, status: 'imported' as const }));
          await workspaceRepository.recordWatchFilesBatch(batchId, filesToRecord).catch(() => {});
        }

        // 2. Processa arquivos extraídos de ZIPs
        for (let j = 0; j < inMemoryFiles.length; j++) {
          const file = inMemoryFiles[j];
          try {
            await importService.processFile(job.id, file, batchId);
          } catch (zipFileErr) {
            console.error('[ImportRoute] Erro ao processar arquivo de ZIP:', zipFileErr);
          }
          if ((j + 1) % BATCH_YIELD_INTERVAL === 0) {
            await yieldEventLoop();
          }
        }
      } catch (err) {
        console.error('[ImportRoute] Erro no worker de paths:', err);
      } finally {
        await importService.markJobCompleted(job.id);
      }
    })();
  } catch (e) {
    console.error('[ImportRoute] Erro em /paths:', e);
    res.status(500).json({ error: 'Erro ao iniciar importação por diretório.' });
  }
});

export default router;
