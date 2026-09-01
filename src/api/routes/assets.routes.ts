import { Router } from 'express';
import { assetsRepository } from '../repositories/assets.repository';
import { categoriesRepository } from '../repositories/categories.repository';
import { depreciationService } from '../services/depreciation.service';
import { db } from '../../db';
import { depreciationEntries } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { generateSchedule, parseBRLToCents } from '../../core/depreciation/calculate';
import crypto from 'crypto';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId obrigatório' });
    const list = await assetsRepository.findAll(companyId as string);
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar bens' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const asset = await assetsRepository.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Bem não encontrado' });
    res.json(asset);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar bem' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { companyId, supplier, acquisitionDate, documentNumber, description, acquisitionValue, ncm, categoryId, annualRate } = req.body;
    if (!companyId) return res.status(400).json({ error: 'Empresa obrigatória' });
    if (!supplier || !supplier.trim()) return res.status(400).json({ error: 'Fornecedor obrigatório' });
    if (!acquisitionDate) return res.status(400).json({ error: 'Data de aquisição obrigatória' });
    if (!documentNumber || !documentNumber.trim()) return res.status(400).json({ error: 'Nº da Nota obrigatório' });
    if (!description || !description.trim()) return res.status(400).json({ error: 'Descrição obrigatória' });
    if (acquisitionValue === undefined || acquisitionValue === null) return res.status(400).json({ error: 'Valor de aquisição obrigatório' });
    const cents = typeof acquisitionValue === 'number' && acquisitionValue > 1000 ? acquisitionValue : parseBRLToCents(String(acquisitionValue));
    // Se valor vier como "5000.00" => parseBRL vai converter correto. Se já for centavos int, detecta?
    // Heurística: se string contém , ou . e valor < 1e6, usa parse. Se number > 100000 (centavos) mantém.
    let finalCents: number;
    if (typeof acquisitionValue === 'string') finalCents = parseBRLToCents(acquisitionValue);
    else if (typeof acquisitionValue === 'number' && acquisitionValue < 1000000 && String(acquisitionValue).includes('.')) finalCents = Math.round(acquisitionValue*100);
    else finalCents = Number(acquisitionValue);

    if (isNaN(finalCents) || finalCents <=0) return res.status(400).json({ error: 'Valor inválido' });
    if (!annualRate || isNaN(Number(annualRate)) || Number(annualRate)<=0 || Number(annualRate)>100) return res.status(400).json({ error: 'Taxa anual inválida' });

    let categoryName: string | null = null;
    if (categoryId) {
      const cat = await categoriesRepository.findById(categoryId);
      if (cat) categoryName = cat.name;
    }

    const created = await assetsRepository.create({
      companyId,
      supplier,
      acquisitionDate: new Date(acquisitionDate),
      documentNumber,
      description,
      acquisitionValue: finalCents,
      ncm: ncm || null,
      categoryId: categoryId || null,
      categoryName,
      annualRate: Number(annualRate),
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar bem' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const data: any = {};
    if (req.body.supplier) data.supplier = req.body.supplier;
    if (req.body.acquisitionDate) data.acquisitionDate = new Date(req.body.acquisitionDate);
    if (req.body.documentNumber) data.documentNumber = req.body.documentNumber;
    if (req.body.description) data.description = req.body.description;
    if (req.body.acquisitionValue !== undefined) {
      const v = req.body.acquisitionValue;
      if (typeof v === 'string') data.acquisitionValue = parseBRLToCents(v);
      else data.acquisitionValue = Math.round(Number(v)*100) > 100000 ? Number(v) : Math.round(Number(v)*100);
    }
    if (req.body.ncm !== undefined) data.ncm = req.body.ncm;
    if (req.body.categoryId !== undefined) {
      data.categoryId = req.body.categoryId;
      if (req.body.categoryId) {
        const cat = await categoriesRepository.findById(req.body.categoryId);
        data.categoryName = cat?.name || null;
      } else {
        data.categoryName = req.body.categoryName || null;
      }
    }
    if (req.body.annualRate !== undefined) data.annualRate = Number(req.body.annualRate);

    const updated = await assetsRepository.update(req.params.id, data);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao atualizar bem' });
  }
});

router.post('/:id/dispose', async (req, res) => {
  try {
    const { disposedAt, reason, generateResidual } = req.body;
    const asset = await assetsRepository.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Bem não encontrado' });
    if ((asset as any).status === 'DISPOSED') return res.status(400).json({ error: 'Bem já baixado' });
    const date = disposedAt ? new Date(disposedAt) : new Date();
    if (isNaN(date.getTime())) return res.status(400).json({ error: 'Data de baixa inválida' });
    // Não permite baixa antes da aquisição
    if (date < new Date((asset as any).acquisitionDate)) return res.status(400).json({ error: 'Data de baixa não pode ser anterior à aquisição' });
    const updated = await assetsRepository.dispose(req.params.id, date, reason || null);

    // F11: Gera entry residual final na competência da baixa, se solicitado e se a regra da empresa permitir
    let residualEntry: { competence: string; depreciationValue: number; accumulatedValue: number; currentValue: number } | null = null;
    if (generateResidual !== false) {
      // Calcula competência da baixa (YYYY-MM)
      const comp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      try {
        const result = await depreciationService.recalculateAsset(req.params.id, { force: false });
        // Aplica baixa + gera residual via chamada dedicada
        residualEntry = await applyDisposeResidual(req.params.id, comp);
        // 'result' foi calculado mas aqui estamos gerando apenas residual; recalculateAsset preservou exportadas
        void result;
      } catch (err) {
        // Não falhamos a baixa se residual falhar; apenas logamos
        console.warn(`[Assets/dispose] Falha ao gerar residual:`, err);
      }
    }

    res.json({ ...updated, residualEntry });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao dar baixa' });
  }
});

/**
 * Gera (ou atualiza) a entry de depreciação residual na competência da baixa,
 * igualando accumulatedValue a acquisitionValue e currentValue a 0.
 * Bloqueia entries de competências futuras.
 */
async function applyDisposeResidual(assetId: string, competence: string): Promise<{ competence: string; depreciationValue: number; accumulatedValue: number; currentValue: number } | null> {
  const asset = await assetsRepository.findById(assetId);
  if (!asset) return null;

  // Calcula o acumulado até a competência da baixa
  const schedule = generateSchedule({
    acquisitionValue: asset.acquisitionValue,
    annualRate: asset.annualRate,
    acquisitionDate: asset.acquisitionDate,
    depreciationRule: 'PROPORTIONAL',
  });
  // Encontra entry equivalente no schedule
  const month = schedule.find((m) => m.competence === competence);
  const fullAccumulated = month ? month.accumulatedValue : asset.acquisitionValue;
  // Residual = acquisition - acumulado
  const residualValue = Math.max(0, asset.acquisitionValue - fullAccumulated);

  // Remove entries futuras (competências após a baixa)
  const futureEntries = await db.query.depreciationEntries.findMany({
    where: eq(depreciationEntries.assetId, assetId),
  });
  for (const e of futureEntries) {
    if (e.competence > competence) {
      await db.delete(depreciationEntries).where(eq(depreciationEntries.id, e.id));
    }
  }

  // Garante entry na competência da baixa com o valor residual
  const existingAtCompetence = futureEntries.find((e) => e.competence === competence);
  const newDepreciationValue = fullAccumulated - (schedule.find((m) => m.competence < competence)?.accumulatedValue ?? 0) + residualValue;
  if (existingAtCompetence) {
    if (!existingAtCompetence.exported) {
      await db.update(depreciationEntries).set({
        depreciationValue: newDepreciationValue,
        accumulatedValue: asset.acquisitionValue,
        currentValue: 0,
      }).where(eq(depreciationEntries.id, existingAtCompetence.id));
    }
    // Se já estava exportada, não alteramos (compliance contábil)
  } else {
    await db.insert(depreciationEntries).values({
      id: crypto.randomUUID(),
      assetId,
      competence,
      depreciationValue: newDepreciationValue,
      accumulatedValue: asset.acquisitionValue,
      currentValue: 0,
      exported: false,
    });
  }

  return {
    competence,
    depreciationValue: newDepreciationValue,
    accumulatedValue: asset.acquisitionValue,
    currentValue: 0,
  };
}

router.post('/:id/reactivate', async (req, res) => {
  try {
    const asset = await assetsRepository.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Bem não encontrado' });
    if ((asset as any).status !== 'DISPOSED') return res.status(400).json({ error: 'Bem não está baixado' });
    const updated = await assetsRepository.reactivate(req.params.id);
    // Limpa entries geradas pela baixa (apenas as não-exportadas)
    const entries = await db.query.depreciationEntries.findMany({
      where: eq(depreciationEntries.assetId, req.params.id),
    });
    for (const e of entries) {
      if (!e.exported) await db.delete(depreciationEntries).where(eq(depreciationEntries.id, e.id));
    }
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao reativar bem' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await assetsRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir bem' });
  }
});

export default router;
