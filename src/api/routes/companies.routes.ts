import { Router } from 'express';
import { companiesRepository } from '../repositories/companies.repository';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const list = await companiesRepository.findAll();
    res.json(list);
  } catch (e) {
    console.error('[Companies]', e);
    res.status(500).json({ error: 'Erro ao buscar empresas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const c = await companiesRepository.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(c);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, tradeName, document, cnpj, state, city, depreciationRule } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Razão social obrigatória' });
    const doc = document || cnpj;
    if (doc && doc.replace(/\D/g, '').length < 11) return res.status(400).json({ error: 'CNPJ/CPF inválido' });
    if (depreciationRule && !['MONTH_OF_ACQUISITION','NEXT_MONTH','PROPORTIONAL'].includes(depreciationRule)) {
      return res.status(400).json({ error: 'Regra de depreciação inválida' });
    }
    const created = await companiesRepository.create({ name, tradeName, document: doc, cnpj, state, city, depreciationRule });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await companiesRepository.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await companiesRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
});

export default router;
