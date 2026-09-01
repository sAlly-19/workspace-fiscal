import { db } from '../../db';
import { categories } from '../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class CategoriesRepository {
  async findAll(companyId?: string) {
    const all = await db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
    if (!companyId) return all;
    return all.filter((cat) => cat.companyId === null || cat.companyId === companyId);
  }

  async findById(id: string) {
    return db.query.categories.findFirst({ where: eq(categories.id, id) });
  }

  async create(data: { name: string; defaultRate: number; companyId?: string | null }) {
    const id = crypto.randomUUID();
    const [row] = await db.insert(categories).values({
      id,
      name: data.name.trim(),
      defaultRate: data.defaultRate,
      companyId: data.companyId || null,
    }).returning();
    return row;
  }

  async update(id: string, data: { name?: string; defaultRate?: number }) {
    const [row] = await db.update(categories).set({
      name: data.name?.trim(),
      defaultRate: data.defaultRate,
    }).where(eq(categories.id, id)).returning();
    return row;
  }

  async delete(id: string) {
    return db.delete(categories).where(eq(categories.id, id));
  }
}

export const categoriesRepository = new CategoriesRepository();
