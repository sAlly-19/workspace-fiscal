import { Router } from 'express';
import crypto from 'crypto';
import { documentsRepository } from '../repositories/documents.repository';
import { storageService } from '../services/storage.service';
import { enrichDocumentFromXml } from '../services/document-enricher.service';
import { generateDanfeBatchHtml } from '../../core/danfe';
import { validateBulkDeleteDocuments, validateBulkMoveDocuments } from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { batchId, search, limit, offset } = req.query;
    const docs = await documentsRepository.findAll(
      batchId as string | undefined,
      search as string | undefined,
      limit ? parseInt(limit as string, 10) : undefined,
      offset ? parseInt(offset as string, 10) : undefined
    );
    res.json(docs);
  } catch (error) {
    console.error('[DocumentsRoute] Error fetching documents:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const validation = validateBulkDeleteDocuments(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.errors[0], details: validation.errors });
    }
    const { ids } = validation.data;
    // Coleta paths antes de deletar para limpar storage com baixo consumo de memória
    const paths = await documentsRepository.findRawXmlPathsByIds(ids);
    await documentsRepository.deleteMany(ids);
    for (const p of paths) {
      await storageService.deleteXml(p).catch(() => {});
    }
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[DocumentsRoute] Error bulk deleting documents:', error);
    res.status(500).json({ error: 'Erro ao excluir documentos em massa.' });
  }
});

router.post('/bulk-move', async (req, res) => {
  try {
    const validation = validateBulkMoveDocuments(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.errors[0], details: validation.errors });
    }
    const { ids, folderId } = validation.data;
    await documentsRepository.moveManyToFolder(ids, folderId ?? null);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[DocumentsRoute] Error bulk moving documents:', error);
    res.status(500).json({ error: 'Erro ao mover documentos em massa.' });
  }
});

interface PrintSession {
  ids?: string[];
  batchId?: string;
  createdAt: number;
}

const printSessions = new Map<string, PrintSession>();

// Limpeza de sessões expiradas (TTL: 30 minutos)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ticket, session] of printSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      printSessions.delete(ticket);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export function clearPrintSessions(): void {
  printSessions.clear();
}

async function fetchDocsForPrint(query: any, body: any) {
  let ids: string[] | null = null;
  let batchId: string | null = null;

  if (query?.ticket && typeof query.ticket === 'string') {
    const session = printSessions.get(query.ticket);
    if (session) {
      if (session.ids && session.ids.length > 0) ids = session.ids;
      if (session.batchId) batchId = session.batchId;
    }
  }

  if (!ids && query?.ids && typeof query.ids === 'string') {
    ids = query.ids.split(',').filter(Boolean);
  } else if (!ids && body?.ids && Array.isArray(body.ids)) {
    ids = body.ids.filter(Boolean);
  }
  if (!batchId && query?.batchId && typeof query.batchId === 'string') batchId = query.batchId;
  else if (!batchId && body?.batchId) batchId = String(body.batchId);
  // Limite de segurança: evita URL gigante / payload enorme
  if (ids && ids.length > 500) ids = ids.slice(0, 500);

  if (ids && ids.length > 0) return documentsRepository.findByIds(ids);
  if (batchId) return documentsRepository.findAll(batchId);
  return documentsRepository.findAll();
}

router.post('/batch-print-session', (req, res) => {
  try {
    const { ids, batchId } = req.body || {};
    const ticket = crypto.randomUUID();
    printSessions.set(ticket, {
      ids: Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id.trim().length > 0) : undefined,
      batchId: typeof batchId === 'string' ? batchId : undefined,
      createdAt: Date.now(),
    });
    res.json({ ticket });
  } catch (error) {
    console.error('[DocumentsRoute] Error creating batch print session:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de impressão em lote.' });
  }
});

router.get('/batch-print', async (req, res) => {
  try {
    const docsList = await fetchDocsForPrint(req.query, null);
    if (!docsList || docsList.length === 0) {
      return res.status(404).send('Nenhum documento fiscal encontrado para o lote especificado.');
    }
    const html = generateDanfeBatchHtml(docsList);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[DocumentsRoute] Error generating batch print HTML:', error);
    res.status(500).send('Erro ao gerar visualização de impressão em lote.');
  }
});

router.post('/batch-print', async (req, res) => {
  try {
    const docsList = await fetchDocsForPrint(null, req.body);
    if (!docsList || docsList.length === 0) {
      return res.status(404).json({ error: 'Nenhum documento fiscal encontrado para o lote.' });
    }
    const html = generateDanfeBatchHtml(docsList);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[DocumentsRoute] Error generating batch print HTML (POST):', error);
    res.status(500).json({ error: 'Erro ao gerar visualização de impressão em lote.' });
  }
});

router.patch('/:id/move', async (req, res) => {
  try {
    const { folderId } = req.body;
    const [updated] = await documentsRepository.moveToFolder(req.params.id, folderId || null);
    res.json(updated);
  } catch (error) {
    console.error('[DocumentsRoute] Error moving document:', error);
    res.status(500).json({ error: 'Erro ao mover documento para a pasta.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    await documentsRepository.delete(req.params.id);
    if (doc?.rawXmlPath) await storageService.deleteXml(doc.rawXmlPath).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error('[DocumentsRoute] Error deleting document:', error);
    res.status(500).json({ error: 'Erro ao excluir documento.' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const all = await documentsRepository.findAll();
    await documentsRepository.deleteAll();
    for (const d of all) {
      if ((d as any).rawXmlPath) await storageService.deleteXml((d as any).rawXmlPath).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[DocumentsRoute] Error deleting all documents:', error);
    res.status(500).json({ error: 'Erro ao limpar documentos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const enrichedDoc = await enrichDocumentFromXml(doc);
    res.json(enrichedDoc);
  } catch (error) {
    console.error('[DocumentsRoute] Error fetching document:', error);
    res.status(500).json({ error: 'Erro ao buscar documento.' });
  }
});

router.get('/:id/xml', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    if (!doc || !doc.rawXmlPath) {
      return res.status(404).json({ error: 'Arquivo XML não encontrado para este documento.' });
    }
    const xmlContent = await storageService.readXml(doc.rawXmlPath);
    res.setHeader('Content-Type', 'application/xml');
    res.send(xmlContent);
  } catch (error) {
    console.error('[DocumentsRoute] Error reading XML:', error);
    res.status(500).json({ error: 'Erro ao ler o conteúdo do arquivo XML.' });
  }
});

router.get('/:id/print', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    if (!doc) {
      return res.status(404).send('Documento não encontrado.');
    }

    const html = generateDanfeBatchHtml([doc]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[DocumentsRoute] Error generating print HTML:', error);
    res.status(500).send('Erro ao gerar visualização de impressão.');
  }
});

export default router;
