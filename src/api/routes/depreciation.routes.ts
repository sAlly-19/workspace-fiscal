import { Router } from 'express';
import { depreciationService } from '../services/depreciation.service';

const router = Router();

// GET /api/depreciation/monthly?companyId=xxx&competence=2026-08
router.get('/monthly', async (req, res) => {
  try {
    const { companyId, competence } = req.query;
    if (!companyId || !competence) return res.status(400).json({ error: 'companyId e competence obrigatórios (YYYY-MM)' });
    if (!/^\d{4}-\d{2}$/.test(competence as string)) return res.status(400).json({ error: 'Competência inválida (use YYYY-MM)' });
    const data = await depreciationService.getMonthlyDepreciation(companyId as string, competence as string);
    res.json(data);
  } catch (e: any) {
    console.error('[Depreciation/monthly]', e);
    res.status(500).json({ error: e.message || 'Erro ao calcular depreciação mensal' });
  }
});

// GET /api/depreciation/asset/:id/history
router.get('/asset/:id/history', async (req, res) => {
  try {
    const data = await depreciationService.getAssetHistory(req.params.id);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/depreciation/export  { companyId, competence, separator, numericFormat }
router.post('/export', async (req, res) => {
  try {
    const { companyId, competence, separator, numericFormat, force } = req.body;
    if (!companyId || !competence) return res.status(400).json({ error: 'companyId e competence obrigatórios' });
    // Verifica se já exportado
    const existing = await depreciationService.getMonthlyDepreciation(companyId, competence);
    if (existing.isExported && !force) {
      return res.status(409).json({
        error: 'Competência já exportada',
        alreadyExported: true,
        exportInfo: existing.exportInfo,
        total: existing.total,
        count: existing.count,
      });
    }
    const result = await depreciationService.generateCsv(companyId, competence, { separator, numericFormat });
    res.json(result);
  } catch (e: any) {
    console.error('[Depreciation/export]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/depreciation/export/csv?companyId=xxx&competence=2026-08  -> download direto
router.get('/export/csv', async (req, res) => {
  try {
    const { companyId, competence } = req.query;
    if (!companyId || !competence) return res.status(400).json({ error: 'companyId e competence obrigatórios' });
    const result = await depreciationService.generateCsv(companyId as string, competence as string, { separator: ';', numericFormat: 'RAW' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${result.filename}\"`);
    res.send(result.csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/depreciation/retroactive  { companyId, assetId }
router.post('/retroactive', async (req, res) => {
  try {
    const { companyId, assetId } = req.body;
    if (!companyId || !assetId) return res.status(400).json({ error: 'companyId e assetId obrigatórios' });
    const result = await depreciationService.generateRetroactiveForAsset(companyId, assetId);
    res.json(result);
  } catch (e: any) {
    // Se nada a gerar, retorna 204 com mensagem
    if (e.message && e.message.includes('nada a gerar')) {
      return res.status(204).json({ message: e.message });
    }
    if (e.message && e.message.includes('após último mês fechado')) {
      return res.status(400).json({ error: e.message });
    }
    console.error('[Depreciation/retroactive]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/depreciation/retroactive/csv?companyId=xxx&assetId=yyy -> download direto
router.get('/retroactive/csv', async (req, res) => {
  try {
    const { companyId, assetId } = req.query;
    if (!companyId || !assetId) return res.status(400).json({ error: 'companyId e assetId obrigatórios' });
    const result = await depreciationService.generateRetroactiveForAsset(companyId as string, assetId as string);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/depreciation/retroactive/batch  { companyId, assetIds, startCompetence, endCompetence }
router.post('/retroactive/batch', async (req, res) => {
  try {
    const { companyId, assetIds, startCompetence, endCompetence } = req.body;
    if (!companyId || !Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'companyId e assetIds são obrigatórios' });
    }
    if (!startCompetence || !endCompetence) {
      return res.status(400).json({ error: 'startCompetence e endCompetence são obrigatórios' });
    }
    const result = await depreciationService.generateRetroactiveBatch({
      companyId,
      assetIds,
      startCompetence,
      endCompetence,
    });
    res.json(result);
  } catch (e: any) {
    if (e.message?.includes('devem ser')) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// POST /api/depreciation/asset/:id/recalculate { force?: boolean }
router.post('/asset/:id/recalculate', async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await depreciationService.recalculateAsset(req.params.id, { force });
    res.json(result);
  } catch (e: any) {
    if (e.message?.includes('exportadas')) {
      return res.status(409).json({ error: e.message, requiresForce: true });
    }
    res.status(500).json({ error: e.message });
  }
});

// GET /api/depreciation/dashboard?companyId=xxx
router.get('/dashboard', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId obrigatório' });
    const data = await depreciationService.getDashboard(companyId as string);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
