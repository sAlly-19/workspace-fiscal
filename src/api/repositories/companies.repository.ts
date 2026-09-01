import { db } from '../../db';
import { companies } from '../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface CreateCompanyInput {
  name: string; // razão social
  tradeName?: string;
  document?: string; // CNPJ
  cnpj?: string;
  state?: string;
  city?: string;
  depreciationRule?: 'MONTH_OF_ACQUISITION' | 'NEXT_MONTH' | 'PROPORTIONAL';
}

export class CompaniesRepository {
  async findAll() {
    return db.query.companies.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
  }

  async findById(id: string) {
    return db.query.companies.findFirst({ where: eq(companies.id, id) });
  }

  async create(data: CreateCompanyInput) {
    const id = crypto.randomUUID();
    const normalizedCnpj = data.cnpj || data.document?.replace(/\D/g, '') || null;
    const [row] = await db.insert(companies).values({
      id,
      name: data.name.trim(),
      tradeName: data.tradeName?.trim() || null,
      document: data.document || normalizedCnpj,
      cnpj: normalizedCnpj,
      state: data.state || null,
      city: data.city || null,
      depreciationRule: data.depreciationRule || 'PROPORTIONAL',
    }).returning();
    return row;
  }

  async update(id: string, data: Partial<CreateCompanyInput>) {
    const normalizedCnpj = data.cnpj || data.document?.replace(/\D/g, '') || undefined;
    const [row] = await db.update(companies).set({
      name: data.name?.trim(),
      tradeName: data.tradeName?.trim(),
      document: data.document || normalizedCnpj,
      cnpj: normalizedCnpj,
      state: data.state,
      city: data.city,
      depreciationRule: data.depreciationRule,
      updatedAt: new Date(),
    }).where(eq(companies.id, id)).returning();
    return row;
  }

  async delete(id: string) {
    return db.delete(companies).where(eq(companies.id, id));
  }
}

export const companiesRepository = new CompaniesRepository();
