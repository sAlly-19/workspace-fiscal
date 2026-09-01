import { db } from '../../db';
import { assets } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface CreateAssetInput {
  companyId: string;
  supplier: string;
  acquisitionDate: Date;
  documentNumber: string;
  description: string;
  acquisitionValue: number; // centavos
  ncm?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  annualRate: number;
  status?: 'ACTIVE' | 'DISPOSED';
  disposedAt?: Date | null;
  disposedReason?: string | null;
}

export class AssetsRepository {
  async findAll(companyId: string) {
    return db.query.assets.findMany({
      where: eq(assets.companyId, companyId),
      with: { category: true },
      orderBy: (a, { desc }) => [desc(a.acquisitionDate)],
    });
  }

  async findById(id: string) {
    return db.query.assets.findFirst({
      where: eq(assets.id, id),
      with: { category: true, entries: true },
    });
  }

  async create(data: CreateAssetInput) {
    const id = crypto.randomUUID();
    const [row] = await db.insert(assets).values({
      id,
      companyId: data.companyId,
      supplier: data.supplier.trim(),
      acquisitionDate: data.acquisitionDate,
      documentNumber: data.documentNumber.trim(),
      description: data.description.trim(),
      acquisitionValue: data.acquisitionValue,
      ncm: data.ncm || null,
      categoryId: data.categoryId || null,
      categoryName: data.categoryName || null,
      annualRate: data.annualRate,
      status: data.status || 'ACTIVE',
      disposedAt: data.disposedAt || null,
      disposedReason: data.disposedReason || null,
    }).returning();
    return row;
  }

  async update(id: string, data: Partial<CreateAssetInput & { status?: string; disposedAt?: Date | null; disposedReason?: string | null }>) {
    const [row] = await db.update(assets).set({
      supplier: data.supplier?.trim(),
      acquisitionDate: data.acquisitionDate,
      documentNumber: data.documentNumber?.trim(),
      description: data.description?.trim(),
      acquisitionValue: data.acquisitionValue,
      ncm: data.ncm,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      annualRate: data.annualRate,
      status: (data as any).status,
      disposedAt: (data as any).disposedAt,
      disposedReason: (data as any).disposedReason,
      updatedAt: new Date(),
    }).where(eq(assets.id, id)).returning();
    return row;
  }

  async delete(id: string) {
    return db.delete(assets).where(eq(assets.id, id));
  }

  async dispose(id: string, disposedAt: Date, reason?: string) {
    const [row] = await db.update(assets).set({
      status: 'DISPOSED',
      disposedAt,
      disposedReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(assets.id, id)).returning();
    return row;
  }

  async reactivate(id: string) {
    const [row] = await db.update(assets).set({
      status: 'ACTIVE',
      disposedAt: null,
      disposedReason: null,
      updatedAt: new Date(),
    }).where(eq(assets.id, id)).returning();
    return row;
  }

  async findByCompanyAndCompetence(companyId: string, competence: string) {
    // Gera lista de assets que têm depreciação na competência (via cálculo, não via tabela)
    // Apenas retorna assets da empresa; cálculo será feito em serviço
    return this.findAll(companyId);
  }
}

export const assetsRepository = new AssetsRepository();
