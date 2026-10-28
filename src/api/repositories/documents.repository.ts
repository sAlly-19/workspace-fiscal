import { db } from '../../db';
import { documents, documentItems, documentTaxes, folders, type DocumentType, type DocumentStatus } from '../../db/schema';
import { eq, inArray, sql, and, or, like, gte, lte } from 'drizzle-orm';

export interface CreateDocumentInput {
  id: string;
  type: DocumentType;
  accessKey?: string | null;
  number?: string | null;
  series?: string | null;
  issueDate?: Date | null;
  status: DocumentStatus;
  issuerName?: string | null;
  issuerDocument?: string | null;
  recipientName?: string | null;
  recipientDocument?: string | null;
  totalAmount?: number | null;
  rawXmlPath: string;
  batchId?: string | null;
  importJobId?: string | null;
}

export class DocumentsRepository {
  async create(data: CreateDocumentInput) {
    return db.insert(documents).values(data).returning();
  }

  async findById(id: string) {
    return db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: {
        items: true,
        taxes: true,
      },
    });
  }

  async findByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    return db.query.documents.findMany({
      where: inArray(documents.id, ids),
      with: {
        items: true,
        taxes: true,
      },
      orderBy: (docs, { desc }) => [desc(docs.createdAt)],
    });
  }

  async findAll(batchId?: string, search?: string, searchType?: string, limit?: number, offset?: number) {
    const conditions: any[] = [];
    if (batchId && batchId !== 'all') {
      const { workspaceRepository } = await import('./workspace.repository');
      const descendants = await workspaceRepository.getFolderDescendantIds(batchId);
      const targetFolderIds = [batchId, ...descendants];
      conditions.push(inArray(documents.batchId, targetFolderIds));
    }
    if (search && search.trim()) {
      const trimmed = search.trim();
      const term = `%${trimmed}%`;

      if (searchType === 'number') {
        conditions.push(like(documents.number, term));
      } else if (searchType === 'type') {
        const cleanType = trimmed.toUpperCase().replace(/[^A-Z]/g, '');
        conditions.push(eq(documents.type, cleanType as any));
      } else if (searchType === 'issuer') {
        conditions.push(like(documents.issuerName, term));
      } else if (searchType === 'date') {
        const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const monthYearMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
        const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const month = parseInt(dateMatch[2], 10) - 1;
          const year = parseInt(dateMatch[3], 10);
          const start = new Date(year, month, day, 0, 0, 0, 0);
          const end = new Date(year, month, day, 23, 59, 59, 999);
          conditions.push(and(gte(documents.issueDate, start), lte(documents.issueDate, end)));
        } else if (isoMatch) {
          const year = parseInt(isoMatch[1], 10);
          const month = parseInt(isoMatch[2], 10) - 1;
          const day = parseInt(isoMatch[3], 10);
          const start = new Date(year, month, day, 0, 0, 0, 0);
          const end = new Date(year, month, day, 23, 59, 59, 999);
          conditions.push(and(gte(documents.issueDate, start), lte(documents.issueDate, end)));
        } else if (monthYearMatch) {
          const month = parseInt(monthYearMatch[1], 10) - 1;
          const year = parseInt(monthYearMatch[2], 10);
          const start = new Date(year, month, 1, 0, 0, 0, 0);
          const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
          conditions.push(and(gte(documents.issueDate, start), lte(documents.issueDate, end)));
        } else {
          conditions.push(like(documents.number, term));
        }
      } else if (searchType === 'value') {
        const numericStr = trimmed.replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(numericStr);
        if (!isNaN(num)) {
          conditions.push(and(gte(documents.totalAmount, num - 0.01), lte(documents.totalAmount, num + 0.01)));
        }
      } else {
        conditions.push(
          or(
            like(documents.number, term),
            like(documents.issuerName, term),
            like(documents.recipientName, term),
            like(documents.accessKey, term)
          )
        );
      }
    }
    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    // Nota: limit/offset opcionais para paginação futura; por enquanto retorna tudo compatível com frontend atual
    const queryOpts: any = {
      where: whereClause,
      orderBy: (docs: any, { desc }: any) => [desc(docs.createdAt)],
    };
    if (limit) {
      queryOpts.limit = limit;
      if (offset) queryOpts.offset = offset;
    }
    return db.query.documents.findMany(queryOpts);
  }

  async findAllByBatch(batchId: string) {
    return this.findAll(batchId);
  }

  async moveToFolder(documentId: string, folderId: string | null) {
    let targetFolder: string | null = null;
    if (folderId && folderId !== 'all' && folderId !== 'null') {
      const folderExists = await db.query.folders.findFirst({
        where: eq(folders.id, folderId),
      });
      if (folderExists) {
        targetFolder = folderId;
      }
    }

    return db.update(documents).set({
      batchId: targetFolder,
      updatedAt: new Date(),
    }).where(eq(documents.id, documentId)).returning();
  }

  async moveManyToFolder(documentIds: string[], folderId: string | null) {
    if (!documentIds || documentIds.length === 0) return [];
    let targetFolder: string | null = null;
    if (folderId && folderId !== 'all' && folderId !== 'null') {
      const folderExists = await db.query.folders.findFirst({
        where: eq(folders.id, folderId),
      });
      if (folderExists) {
        targetFolder = folderId;
      }
    }

    return db.update(documents).set({
      batchId: targetFolder,
      updatedAt: new Date(),
    }).where(inArray(documents.id, documentIds)).returning();
  }

  async findRawXmlPathsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    const CHUNK = 400;
    const paths: string[] = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const rows = await db
        .select({ rawXmlPath: documents.rawXmlPath })
        .from(documents)
        .where(inArray(documents.id, slice));
      for (const r of rows) {
        if (r.rawXmlPath) paths.push(r.rawXmlPath);
      }
    }
    return paths;
  }

  async delete(id: string) {
    return db.delete(documents).where(eq(documents.id, id));
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) return;
    const CHUNK = 400;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      await db.delete(documents).where(inArray(documents.id, slice));
    }
  }

  async deleteAll() {
    return db.delete(documents);
  }
}

export const documentsRepository = new DocumentsRepository();
