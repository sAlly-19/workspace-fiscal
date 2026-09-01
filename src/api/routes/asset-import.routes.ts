import { Router } from 'express';
import multer from 'multer';
import { detectFiscalDocument } from '../../core/detector';
import { parseFiscalDocument } from '../../core/parsers';
import { logger } from '../utils/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

interface AssetSuggestion {
  source: 'NFE';
  supplier: string;
  supplierDocument: string | null;
  documentNumber: string | null;
  series: string | null;
  issueDate: string | null;
  total: number; // centavos
  items: Array<{
    code: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    ncm: string | null;
  }>;
}

/**
 * Recebe um XML de NF-e e devolve sugestões de campos para o form de cadastro de ativo.
 * Apenas NF-e de aquisição de produto (não serviço) é sugerido; o usuário revisa antes de salvar.
 */
router.post('/from-xml', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo XML não enviado' });
    const xml = req.file.buffer.toString('utf-8');
    const docType = detectFiscalDocument(xml);
    if (docType !== 'NFE') {
      return res.status(400).json({ error: 'Apenas NF-e de produto é aceita para sugestão de ativo.' });
    }
    const parsed = parseFiscalDocument(xml, docType, '', undefined);
    if (!parsed.issuer?.name) {
      return res.status(400).json({ error: 'Não foi possível extrair dados do XML.' });
    }

    const suggestion: AssetSuggestion = {
      source: 'NFE',
      supplier: parsed.issuer.name,
      supplierDocument: parsed.issuer.document || null,
      documentNumber: parsed.number || null,
      series: parsed.series || null,
      issueDate: parsed.issueDate ? new Date(parsed.issueDate).toISOString() : null,
      total: Math.round(parsed.totals?.total ?? 0),
      items: (parsed.items || []).map((it) => ({
        code: it.code || null,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
        ncm: it.ncm || null,
      })),
    };

    res.json(suggestion);
  } catch (e) {
    logger.error({ err: (e as Error).message }, 'asset_suggestion_failed');
    res.status(500).json({ error: 'Erro ao extrair dados do XML' });
  }
});

export default router;