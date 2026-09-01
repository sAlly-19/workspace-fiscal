import { db } from '../../db';
import { documents, documentItems } from '../../db/schema';
import { eq, sql, count, sum } from 'drizzle-orm';

export class AnalyticsRepository {
  async getDashboardStats(batchId?: string) {
    let whereClause = batchId ? eq(documents.batchId, batchId) : undefined;
    
    // Total stats
    const [totals] = await db
      .select({
        totalDocuments: count(documents.id),
        totalAmount: sum(documents.totalAmount),
      })
      .from(documents)
      .where(whereClause);

    // Stats by Type
    const byType = await db
      .select({
        type: documents.type,
        count: count(documents.id),
        amount: sum(documents.totalAmount),
      })
      .from(documents)
      .where(whereClause)
      .groupBy(documents.type);

    // Stats by Status
    const byStatus = await db
      .select({
        status: documents.status,
        count: count(documents.id),
      })
      .from(documents)
      .where(whereClause)
      .groupBy(documents.status);

    // Top Issuers
    const topIssuers = await db
      .select({
        name: documents.issuerName,
        amount: sum(documents.totalAmount),
      })
      .from(documents)
      .where(whereClause)
      .groupBy(documents.issuerName)
      .orderBy(sql`${sum(documents.totalAmount)} DESC`)
      .limit(5);

    const toNumber = (v: unknown) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v));
      return isNaN(n) ? 0 : n;
    };
    return {
      totals: {
        documents: totals.totalDocuments || 0,
        amount: toNumber(totals.totalAmount),
      },
      byType: byType.map((r) => ({ ...r, amount: toNumber(r.amount) })),
      byStatus,
      topIssuers: topIssuers.filter(i => i.name).map((r) => ({ ...r, amount: toNumber(r.amount) })),
    };
  }
}

export const analyticsRepository = new AnalyticsRepository();
