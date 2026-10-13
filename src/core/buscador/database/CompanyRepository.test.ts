import { beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from './connection';
import { CompanyRepository } from './repositories/CompanyRepository';

describe('Buscador CompanyRepository Dual-ID & Deduplication', () => {
  let db: DatabaseManager;
  let repo: CompanyRepository;

  beforeEach(async () => {
    db = await DatabaseManager.create(':memory:');
    repo = new CompanyRepository(db);
  });

  it('creates company and assigns numeric id, setting first as active', () => {
    const created = repo.create({
      name: 'Empresa Buscador 1',
      cnpj: '12.345.678/0001-90',
      uf: 'SP',
    });

    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe('number');
    expect(created.cnpj).toBe('12345678000190');
    expect(created.is_active).toBe(true);

    const found = repo.findById(created.id);
    expect(found?.name).toBe('Empresa Buscador 1');
    expect(found?.id).toBe(created.id);
  });

  it('finds company by clean or formatted CNPJ', () => {
    const created = repo.create({
      name: 'Empresa CNPJ Test',
      cnpj: '22334455000166',
      uf: 'RJ',
    });

    const found1 = repo.findByCNPJ('22334455000166');
    expect(found1?.id).toBe(created.id);

    const found2 = repo.findByCNPJ('22.334.455/0001-66');
    expect(found2?.id).toBe(created.id);
  });

  it('updates company preserving numeric id and clean CNPJ', () => {
    const created = repo.create({
      name: 'Nome Antigo',
      cnpj: '33445566000177',
      uf: 'MG',
    });

    const updated = repo.update({
      id: created.id,
      name: 'Nome Novo',
      uf: 'SP',
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Nome Novo');
    expect(updated.uf).toBe('SP');
  });
});

