import { desc, eq, and, sql, or, like, gte, lte, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { activityLogs, LogLevel, LogModule } from '../../db/schema';
import crypto from 'crypto';

export interface ActivityLogInput {
  id?: string;
  timestamp?: Date | number;
  level: LogLevel;
  module: LogModule;
  action: string;
  message: string;
  details?: Record<string, any> | string;
  durationMs?: number;
}

export interface ActivityLogItem {
  id: string;
  timestamp: Date;
  level: LogLevel;
  module: LogModule;
  action: string;
  message: string;
  details?: any;
  durationMs?: number | null;
  createdAt: Date;
}

export interface ActivityLogFilter {
  search?: string;
  level?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityLogStats {
  total: number;
  successCount: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
}

export class ActivityLogService {
  /**
   * Grava um novo evento de auditoria no banco SQLite.
   */
  async record(input: ActivityLogInput): Promise<ActivityLogItem> {
    const id = input.id || crypto.randomUUID();
    const timestamp =
      input.timestamp instanceof Date
        ? input.timestamp
        : typeof input.timestamp === 'number'
        ? new Date(input.timestamp)
        : new Date();

    const detailsStr =
      input.details === undefined
        ? null
        : typeof input.details === 'string'
        ? input.details
        : JSON.stringify(input.details);

    const inserted = await db
      .insert(activityLogs)
      .values({
        id,
        timestamp,
        level: input.level,
        module: input.module,
        action: input.action,
        message: input.message,
        details: detailsStr,
        durationMs: input.durationMs ?? null,
      })
      .returning();

    const record = inserted[0];
    return {
      id: record.id,
      timestamp: record.timestamp,
      level: record.level as LogLevel,
      module: record.module as LogModule,
      action: record.action,
      message: record.message,
      details: this.parseDetails(record.details),
      durationMs: record.durationMs,
      createdAt: record.createdAt,
    };
  }

  /**
   * Lista logs aplicando filtros de busca, nível, módulo e paginação.
   */
  async list(filter: ActivityLogFilter = {}): Promise<{ logs: ActivityLogItem[]; total: number }> {
    const conditions: SQL[] = [];

    if (filter.level && filter.level !== 'ALL') {
      conditions.push(eq(activityLogs.level, filter.level));
    }

    if (filter.module && filter.module !== 'ALL') {
      conditions.push(eq(activityLogs.module, filter.module));
    }

    if (filter.startDate) {
      const start = new Date(filter.startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(activityLogs.timestamp, start));
      }
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate);
      if (!isNaN(end.getTime())) {
        conditions.push(lte(activityLogs.timestamp, end));
      }
    }

    if (filter.search && filter.search.trim()) {
      const term = `%${filter.search.trim()}%`;
      const searchCond = or(
        like(activityLogs.message, term),
        like(activityLogs.action, term),
        like(activityLogs.module, term),
        like(activityLogs.details, term)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Contagem total
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(whereClause);
    const total = Number(totalResult[0]?.count || 0);

    // Consulta paginada
    const limit = Math.min(Math.max(filter.limit || 100, 1), 1000);
    const offset = Math.max(filter.offset || 0, 0);

    const rows = await db
      .select()
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const logs: ActivityLogItem[] = rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      level: r.level as LogLevel,
      module: r.module as LogModule,
      action: r.action,
      message: r.message,
      details: this.parseDetails(r.details),
      durationMs: r.durationMs,
      createdAt: r.createdAt,
    }));

    return { logs, total };
  }

  /**
   * Obtém totais consolidados por nível.
   */
  async getStats(): Promise<ActivityLogStats> {
    const rows = await db
      .select({
        level: activityLogs.level,
        count: sql<number>`count(*)`,
      })
      .from(activityLogs)
      .groupBy(activityLogs.level);

    let total = 0;
    let successCount = 0;
    let errorCount = 0;
    let warnCount = 0;
    let infoCount = 0;

    for (const r of rows) {
      const count = Number(r.count || 0);
      total += count;
      if (r.level === 'SUCCESS') successCount = count;
      else if (r.level === 'ERROR') errorCount = count;
      else if (r.level === 'WARN') warnCount = count;
      else if (r.level === 'INFO') infoCount = count;
    }

    return {
      total,
      successCount,
      errorCount,
      warnCount,
      infoCount,
    };
  }

  /**
   * Remove registros mais antigos que o período de retenção especificado (em dias).
   */
  async clearOld(retentionDays = 60): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const deleted = await db
      .delete(activityLogs)
      .where(lte(activityLogs.timestamp, cutoffDate))
      .returning();

    return { deletedCount: deleted.length };
  }

  /**
   * Exporta logs em formato CSV.
   */
  async exportCsv(filter: ActivityLogFilter = {}): Promise<string> {
    const { logs } = await this.list({ ...filter, limit: 10000, offset: 0 });
    const headers = ['Data/Hora', 'Nível', 'Módulo', 'Ação', 'Mensagem', 'Duração (ms)', 'Detalhes'];

    const lines = [headers.join(',')];

    for (const log of logs) {
      const dateStr = log.timestamp instanceof Date ? log.timestamp.toISOString() : String(log.timestamp);
      const detailsStr = log.details ? JSON.stringify(log.details) : '';

      const row = [
        this.escapeCsv(dateStr),
        this.escapeCsv(log.level),
        this.escapeCsv(log.module),
        this.escapeCsv(log.action),
        this.escapeCsv(log.message),
        this.escapeCsv(log.durationMs !== null && log.durationMs !== undefined ? String(log.durationMs) : ''),
        this.escapeCsv(detailsStr),
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Exporta logs em formato JSON.
   */
  async exportJson(filter: ActivityLogFilter = {}): Promise<string> {
    const { logs } = await this.list({ ...filter, limit: 10000, offset: 0 });
    return JSON.stringify(logs, null, 2);
  }

  private escapeCsv(field: string): string {
    if (!field) return '';
    const needsQuotes = field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r');
    if (!needsQuotes) return field;
    return `"${field.replace(/"/g, '""')}"`;
  }

  private parseDetails(detailsStr: string | null): any {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return detailsStr;
    }
  }
}

export const activityLogService = new ActivityLogService();

