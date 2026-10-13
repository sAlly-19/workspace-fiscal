import { describe, it, expect, beforeEach } from 'vitest';
import { companiesRepository } from './companies.repository';
import { db, rawClient, initDatabase } from '../../db';
import { companies } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('CompaniesRepository Dual-ID & Deduplication', () => {
  beforeEach(async () => {
    await initDatabase();
    await rawClient.execute('DELETE FROM "companies";');
  });

  it('generates numeric_id automatically and normalizes 14-digit CNPJ', async () => {
    const created = await companiesRepository.create({
      name: 'Empresa Teste Alpha',
      document: '12.345.678/0001-90',
      state: 'SP',
      city: 'São Paulo',
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe('string');
    expect(created.cnpj).toBe('12345678000190');
    expect((created as any).numericId).toBeDefined();
    expect(Number((created as any).numericId)).toBeGreaterThanOrEqual(1);
  });

  it('deduplicates when creating company with same CNPJ', async () => {
    const first = await companiesRepository.create({
      name: 'Empresa Original',
      cnpj: '98765432000109',
      tradeName: 'Original LTDA',
      state: 'RJ',
    });

    const second = await companiesRepository.create({
      name: 'Empresa Atualizada',
      cnpj: '98.765.432/0001-09',
      tradeName: 'Novo Nome Fantasia',
      city: 'Rio de Janeiro',
    });

    // Same id and numeric_id
    expect(second.id).toBe(first.id);
    expect((second as any).numericId).toBe((first as any).numericId);

    // Total rows in DB is still 1
    const all = await companiesRepository.findAll();
    expect(all).toHaveLength(1);
  });

  it('finds company by string ID or numeric_id', async () => {
    const created = await companiesRepository.create({
      name: 'Empresa Dual ID',
      cnpj: '11222333000144',
      state: 'MG',
    });

    const byUuid = await companiesRepository.findById(created.id);
    expect(byUuid?.id).toBe(created.id);

    const numericId = (created as any).numericId;
    if (numericId) {
      const byNum = await companiesRepository.findById(String(numericId));
      expect(byNum?.id).toBe(created.id);
    }
  });
});

