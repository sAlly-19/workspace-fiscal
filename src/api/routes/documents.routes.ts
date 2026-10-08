import { Router } from 'express';
import { documentsRepository } from '../repositories/documents.repository';
import { storageService } from '../services/storage.service';
import { enrichDocumentFromXml } from '../services/document-enricher.service';
import { generateDanfeBatchHtml } from '../../core/danfe';

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
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida para exclusão.' });
    }
    // Coleta paths antes de deletar para limpar storage
    const docs = await documentsRepository.findByIds(ids);
    await documentsRepository.deleteMany(ids);
    for (const d of docs) {
      if ((d as any).rawXmlPath) await storageService.deleteXml((d as any).rawXmlPath).catch(() => {});
    }
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[DocumentsRoute] Error bulk deleting documents:', error);
    res.status(500).json({ error: 'Erro ao excluir documentos em massa.' });
  }
});

router.post('/bulk-move', async (req, res) => {
  try {
    const { ids, folderId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida para mover.' });
    }
    await documentsRepository.moveManyToFolder(ids, folderId || null);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[DocumentsRoute] Error bulk moving documents:', error);
    res.status(500).json({ error: 'Erro ao mover documentos em massa.' });
  }
});

async function fetchDocsForPrint(query: any, body: any) {
  let ids: string[] | null = null;
  let batchId: string | null = null;
  if (query?.ids && typeof query.ids === 'string') {
    ids = query.ids.split(',').filter(Boolean);
  } else if (body?.ids && Array.isArray(body.ids)) {
    ids = body.ids.filter(Boolean);
  }
  if (query?.batchId && typeof query.batchId === 'string') batchId = query.batchId;
  else if (body?.batchId) batchId = String(body.batchId);
  // Limite de segurança: evita URL gigante / payload enorme
  if (ids && ids.length > 500) ids = ids.slice(0, 500);

  if (ids && ids.length > 0) return documentsRepository.findByIds(ids);
  if (batchId) return documentsRepository.findAll(batchId);
  return documentsRepository.findAll();
}

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
