import { db } from '../../db';
import { companies } from '../../db/schema';
import { eq, or, sql } from 'drizzle-orm';
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
    const num = Number(id);
    const condition = !isNaN(num) && Number.isInteger(num) && num > 0
      ? or(eq(companies.id, id), eq(companies.numericId, num))
      : eq(companies.id, id);
    return db.query.companies.findFirst({ where: condition });
  }

  async findByCnpj(cnpj: string) {
    const clean = cnpj.replace(/\D/g, '');
    if (!clean) return null;
    return db.query.companies.findFirst({ where: eq(companies.cnpj, clean) });
  }

  async create(data: CreateCompanyInput) {
    const cleanCnpj = data.cnpj
      ? data.cnpj.replace(/\D/g, '')
      : data.document
      ? data.document.replace(/\D/g, '')
      : null;

    if (cleanCnpj) {
      const existing = await this.findByCnpj(cleanCnpj);
      if (existing) {
        const [updated] = await db
          .update(companies)
          .set({
            name: data.name ? data.name.trim() : existing.name,
            tradeName: data.tradeName ? data.tradeName.trim() : existing.tradeName,
            state: data.state || existing.state,
            city: data.city || existing.city,
            depreciationRule: data.depreciationRule || existing.depreciationRule,
            updatedAt: new Date(),
          })
          .where(eq(companies.id, existing.id))
          .returning();
        return updated || existing;
      }
    }

    const id = crypto.randomUUID();
    const maxRes = await db
      .select({ maxId: sql<number>`COALESCE(MAX(numeric_id), 0)` })
      .from(companies);
    const nextNumericId = Number(maxRes[0]?.maxId || 0) + 1;

    const [row] = await db
      .insert(companies)
      .values({
        id,
        numericId: nextNumericId,
        name: data.name.trim(),
        tradeName: data.tradeName?.trim() || null,
        document: data.document || cleanCnpj,
        cnpj: cleanCnpj,
        uf: data.state || '35',
        state: data.state || null,
        city: data.city || null,
        depreciationRule: data.depreciationRule || 'PROPORTIONAL',
      })
      .returning();
    return row;
  }

  async update(id: string, data: Partial<CreateCompanyInput>) {
    const normalizedCnpj = data.cnpj ? data.cnpj.replace(/\D/g, '') : data.document ? data.document.replace(/\D/g, '') : undefined;
    const existing = await this.findById(id);
    if (!existing) return null;

    const [row] = await db
      .update(companies)
      .set({
        name: data.name?.trim(),
        tradeName: data.tradeName?.trim(),
        document: data.document || normalizedCnpj,
        cnpj: normalizedCnpj,
        state: data.state,
        city: data.city,
        depreciationRule: data.depreciationRule,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, existing.id))
      .returning();
    return row;
  }

  async delete(id: string) {
    const existing = await this.findById(id);
    if (!existing) return { changes: 0 };
    return db.delete(companies).where(eq(companies.id, existing.id));
  }
}

export const companiesRepository = new CompaniesRepository();
