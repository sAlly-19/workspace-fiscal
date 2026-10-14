import { Router } from 'express';
import { companiesRepository } from '../repositories/companies.repository';
import { validateCreateCompany, validateUpdateCompany } from '../validators';

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
    const validation = validateCreateCompany(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados de entrada inválidos', details: validation.errors });
    }
    const created = await companiesRepository.create(validation.data);
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const validation = validateUpdateCompany(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Dados de entrada inválidos', details: validation.errors });
    }
    const updated = await companiesRepository.update(req.params.id, validation.data);
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
