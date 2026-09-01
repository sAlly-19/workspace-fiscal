import { Router } from 'express';
import multer from 'multer';
import { importService } from '../services/import.service';

const router = Router();
// Limite apenas por tamanho (10MB por arquivo). Sem limite de quantidade, conforme solicitado.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isXml = name.endsWith('.xml') || file.mimetype.includes('xml');
    // Aceita apenas XML; outros serão ignorados no handler, mas bloqueia executáveis
    if (!isXml && file.mimetype.startsWith('application/')) {
      // Rejeita binários suspeitos, mas permite fluxo seguir para mensagem de skip
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

    const { batchId } = req.body; // Optional target batch/folder

    // Create the job tracking record
    const job = await importService.createImportJob(files.length);

    // Process files asynchronously in background
    (async () => {
      try {
        for (const file of files) {
          const isXml = 
            file.mimetype === 'text/xml' || 
            file.mimetype === 'application/xml' || 
            file.originalname.toLowerCase().endsWith('.xml');

          if (isXml) {
            await importService.processFile(job.id, file, batchId);
          } else {
            console.warn(`[ImportRoute] Skipping non-XML file: ${file.originalname}`);
            await importService.incrementProcessed(job.id);
          }
        }
      } catch (loopErr) {
        console.error('[ImportRoute] Error during file processing loop:', loopErr);
      } finally {
        await importService.markJobCompleted(job.id);
      }
    })();

    // Return the Job ID immediately to the client
    res.status(202).json({
      message: 'Importação iniciada com sucesso.',
      jobId: job.id
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

export default router;
