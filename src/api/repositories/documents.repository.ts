import { db } from '../../db';
import { documents, documentItems, documentTaxes, folders, type DocumentType, type DocumentStatus } from '../../db/schema';
import { eq, inArray, sql, and, or, like } from 'drizzle-orm';

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

  async findAll(batchId?: string, search?: string, limit?: number, offset?: number) {
    const conditions: any[] = [];
    if (batchId && batchId !== 'all') {
      conditions.push(eq(documents.batchId, batchId));
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          like(documents.number, term),
          like(documents.issuerName, term),
          like(documents.recipientName, term),
          like(documents.accessKey, term)
        )
      );
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

  async delete(id: string) {
    return db.delete(documents).where(eq(documents.id, id));
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) return;
    return db.delete(documents).where(inArray(documents.id, ids));
  }

  async deleteAll() {
    return db.delete(documents);
  }
}

export const documentsRepository = new DocumentsRepository();
