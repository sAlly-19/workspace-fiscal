import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { db } from '../../db';
import { documents, documentEvents } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { CartaCorrecaoParser } from '../../core/parsers/cce.parser';
import { storageService } from '../services/storage.service';
import { logger } from '../utils/logger';

const router = Router();
const cceParser = new CartaCorrecaoParser();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/documents/:id/events — lista todos os eventos do documento
router.get('/:id/events', async (req, res) => {
  try {
    const list = await db.query.documentEvents.findMany({
      where: eq(documentEvents.documentId, req.params.id),
      orderBy: [desc(documentEvents.sequence)],
    });
    res.json(list);
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'events_list_failed');
    res.status(500).json({ error: 'Erro ao listar eventos' });
  }
});

// POST /api/documents/:id/events/cce — upload de XML de CC-e
router.post('/:id/events/cce', upload.single('file'), async (req, res) => {
  try {
    const doc = await db.query.documents.findFirst({ where: eq(documents.id, req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado' });
    if (!req.file) return res.status(400).json({ error: 'Arquivo XML não enviado' });

    const xml = req.file.buffer.toString('utf-8');
    const parsed = cceParser.parse(xml);
    if (parsed.length === 0) {
      return res.status(400).json({ error: 'Nenhuma CC-e encontrada no XML (esperado evento tpEvento=110110)' });
    }

    // Salva o XML original
    const xmlFilename = `${crypto.randomUUID()}.xml`;
    const rawXmlPath = await storageService.saveXml(xmlFilename, xml);

    const inserted: Array<{ id: string; sequence: number; text: string }> = [];
    for (const cce of parsed) {
      const id = crypto.randomUUID();
      const eventDate = cce.dataHoraEvento ? new Date(cce.dataHoraEvento) : new Date();
      await db.insert(documentEvents).values({
        id,
        documentId: req.params.id,
        eventType: 'CCE',
        sequence: cce.sequencia,
        eventDate,
        protocol: cce.protocolo,
        rawXmlPath,
        correctionText: cce.textoCorrecao,
      });
      inserted.push({ id, sequence: cce.sequencia, text: cce.textoCorrecao });
    }

    logger.info({ documentId: req.params.id, count: inserted.length }, 'cce_uploaded');
    res.status(201).json({ events: inserted, count: inserted.length });
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'cce_upload_failed');
    res.status(500).json({ error: 'Erro ao registrar CC-e' });
  }
});

export default router;