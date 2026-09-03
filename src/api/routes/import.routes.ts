import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { importService } from '../services/import.service';

const router = Router();
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

router.post('/', upload.array('files'), async (req, res) => {
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
                originalname: path.basename(entry.entryName),
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
        for (const file of unpackedFiles) {
          await importService.processFile(job.id, file, batchId);
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
              originalname: path.basename(entry.entryName),
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
      if (typeof p !== 'string') continue;
      try {
        if (!fs.existsSync(p)) continue;
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          walkDir(p);
        } else if (stat.isFile()) {
          if (p.toLowerCase().endsWith('.xml')) {
            targetXmlPaths.push(p);
          } else if (p.toLowerCase().endsWith('.zip')) {
            tryExtractZip(p);
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
        for (const filePath of targetXmlPaths) {
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
        }

        // 2. Processa arquivos extraídos de ZIPs
        for (const file of inMemoryFiles) {
          try {
            await importService.processFile(job.id, file, batchId);
          } catch (zipFileErr) {
            console.error('[ImportRoute] Erro ao processar arquivo de ZIP:', zipFileErr);
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
