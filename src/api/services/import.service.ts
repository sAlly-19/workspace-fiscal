import { storageService } from './storage.service';
import { detectFiscalDocument } from '../../core/detector';
import { parseFiscalDocument } from '../../core/parsers';
import { db } from '../../db';
import { importJobs, documents, documentItems, documentTaxes, folders, applicationSettings } from '../../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import crypto from 'crypto';
import { FiscalDocument } from '../../core/fiscal.types';

export type DedupePolicy = 'IGNORE' | 'OVERWRITE' | 'CREATE_VERSION';

interface DedupeSettings {
  policy: DedupePolicy;
  updatedAt: number;
}

const DEFAULT_DEDUPE: DedupeSettings = { policy: 'IGNORE', updatedAt: 0 };

async function loadDedupeSettings(): Promise<DedupeSettings> {
  try {
    const row = await db.query.applicationSettings.findFirst({
      where: eq(applicationSettings.key, 'import_dedupe_policy'),
    });
    if (!row) return DEFAULT_DEDUPE;
    const parsed = JSON.parse(row.value);
    return {
      policy: ['IGNORE', 'OVERWRITE', 'CREATE_VERSION'].includes(parsed.policy)
        ? parsed.policy
        : 'IGNORE',
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : 0,
    };
  } catch {
    return DEFAULT_DEDUPE;
  }
}

export class ImportService {
  private jobDuplicates = new Map<string, number>();
  private jobTimers = new Map<string, ReturnType<typeof setTimeout>>();

  async createImportJob(totalFiles: number) {
    const id = crypto.randomUUID();
    this.jobDuplicates.set(id, 0);
    // Limpa contador após 30 min para evitar leak
    const timer = setTimeout(() => {
      this.jobDuplicates.delete(id);
      this.jobTimers.delete(id);
    }, 30 * 60 * 1000);
    // Permite processo encerrar sem esperar timer
    if ((timer as any)?.unref) (timer as any).unref();
    this.jobTimers.set(id, timer);
    const [job] = await db.insert(importJobs).values({
      id,
      status: 'PROCESSING',
      totalFiles,
      processedFiles: 0
    }).returning();
    
    return job;
  }

  async getImportJobStatus(jobId: string) {
    const job = await db.query.importJobs.findFirst({
      where: eq(importJobs.id, jobId)
    });
    return job;
  }

  getJobDuplicatesCount(jobId: string): number {
    return this.jobDuplicates.get(jobId) || 0;
  }

  private decodeXmlBuffer(buffer: Buffer): string {
    // Tenta UTF-8, fallback ISO-8859-1 (comum em XMLs SEFAZ antigos)
    const utf8 = buffer.toString('utf-8');
    // Se contém � (replacement char) tenta latin1
    if (utf8.includes('\uFFFD')) {
      try {
        return buffer.toString('latin1');
      } catch {}
    }
    return utf8;
  }

  async processFile(jobId: string, file: Express.Multer.File, batchId?: string) {
    let parsedDoc: FiscalDocument | null = null;
    let docType = 'UNKNOWN' as any;
    let rawXmlPath = '';

    try {
      // 1. Read XML (com fallback de encoding)
      const xmlContent = this.decodeXmlBuffer(file.buffer);

      // 2. Detect Document Type
      docType = detectFiscalDocument(xmlContent);

      // Check if folder exists
      let validFolderId: string | null = null;
      if (batchId && batchId !== 'all' && batchId !== 'null' && batchId !== 'undefined') {
        const folderExists = await db.query.folders.findFirst({
          where: eq(folders.id, batchId),
        });
        if (folderExists) {
          validFolderId = batchId;
        }
      }

      // 3. Try parsing if supported
      let status: 'VALID' | 'WARNING' | 'INVALID' | 'UNKNOWN' | 'UNSUPPORTED' = docType === 'UNKNOWN' ? 'UNKNOWN' : 'VALID';
      
      if (docType !== 'UNKNOWN') {
        try {
          parsedDoc = parseFiscalDocument(xmlContent, docType, '', validFolderId || undefined);
        } catch (err) {
          console.error(`[ImportService] Warning: Parsing failed for ${file.originalname}`, err);
          status = 'WARNING';
        }
      }

      // 4. PREVENT DUPLICATES: Check if document already exists in DB
      let existingDocId: string | null = null;
      if (parsedDoc?.accessKey) {
        const existingByAccessKey = await db.query.documents.findFirst({
          where: eq(documents.accessKey, parsedDoc.accessKey),
        });
        if (existingByAccessKey) existingDocId = existingByAccessKey.id;
      } else if (parsedDoc?.number && parsedDoc?.issuer?.document) {
        const conditions = [
          eq(documents.number, parsedDoc.number),
          eq(documents.issuerDocument, parsedDoc.issuer.document),
        ];
        if (parsedDoc.series) conditions.push(eq(documents.series, parsedDoc.series));
        const whereClause = conditions.length === 2 ? and(conditions[0], conditions[1]) : and(...conditions);
        const existingByNumber = await db.query.documents.findFirst({
          where: whereClause,
        });
        if (existingByNumber) existingDocId = existingByNumber.id;
      }

      if (existingDocId) {
        const policy = await loadDedupeSettings();
        if (policy.policy === 'IGNORE') {
          const currentDupes = this.jobDuplicates.get(jobId) || 0;
          this.jobDuplicates.set(jobId, currentDupes + 1);
          console.log(`[ImportService] Política IGNORE: ignorando duplicado ${parsedDoc?.accessKey || parsedDoc?.number || file.originalname}`);
          return { duplicate: true, skipped: 'ignore' };
        }
        if (policy.policy === 'OVERWRITE') {
          // Remove o existente para reinserir com dados novos
          await db.delete(documents).where(eq(documents.id, existingDocId)).catch(() => {});
        }
        // CREATE_VERSION: mantém o existente; este será inserido com id novo (comportamento padrão abaixo)
      }

      // 5. Save raw XML securely only if not duplicate
      const filename = `${crypto.randomUUID()}.xml`;
      rawXmlPath = await storageService.saveXml(filename, xmlContent);

      // 6. Save Document + items/taxes em transação atômica
      const docId = parsedDoc?.id || crypto.randomUUID();

      // Usa transação via libsql (drizzle não expõe transaction em libsql de forma estável, então fallback sequencial com cleanup)
      // Se inserir documento falhar, não tenta items. Se items falharem, remove documento para não deixar órfão.
      let insertedDoc = false;
      try {
        await db.insert(documents).values({
          id: docId,
          type: docType,
          status,
          accessKey: parsedDoc?.accessKey,
          number: parsedDoc?.number,
          series: parsedDoc?.series,
          issueDate: parsedDoc?.issueDate,
          issuerName: parsedDoc?.issuer?.name,
          issuerDocument: parsedDoc?.issuer?.document,
          recipientName: parsedDoc?.recipient?.name,
          recipientDocument: parsedDoc?.recipient?.document,
          totalAmount: parsedDoc?.totals?.total,
          billing: (parsedDoc?.billing as any) || null,
          rawXmlPath,
          importJobId: jobId,
          batchId: validFolderId
        });
        insertedDoc = true;

        // 7. Save items and taxes if parsed
        if (parsedDoc && status === 'VALID') {
          if (parsedDoc.items && parsedDoc.items.length > 0) {
            const itemsToInsert = parsedDoc.items.map(item => ({
              id: crypto.randomUUID(),
              documentId: docId,
              code: item.code,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }));
            await db.insert(documentItems).values(itemsToInsert);
          }

          if (parsedDoc.totals?.taxes) {
            const taxesToInsert: Array<{ id: string; documentId: string; taxType: string; amount: number }> = [];
            for (const [taxType, amount] of Object.entries(parsedDoc.totals.taxes)) {
              if (amount && amount > 0) {
                taxesToInsert.push({
                  id: crypto.randomUUID(),
                  documentId: docId,
                  taxType: taxType.toUpperCase(),
                  amount: amount
                });
              }
            }
            if (taxesToInsert.length > 0) {
              await db.insert(documentTaxes).values(taxesToInsert);
            }
          }
        }
      } catch (txErr) {
        // Rollback manual: remove doc se items falharam
        if (insertedDoc) {
          await db.delete(documents).where(eq(documents.id, docId)).catch(() => {});
          // Remove XML salvo para não deixar órfão
          if (rawXmlPath) await storageService.deleteXml(rawXmlPath).catch(() => {});
        }
        throw txErr;
      }

    } catch (err) {
      console.error(`[ImportService] Critical error processing file ${file.originalname}:`, err);
    } finally {
      // 8. Update progress atomically
      await db.update(importJobs)
        .set({ processedFiles: sql`${importJobs.processedFiles} + 1` })
        .where(eq(importJobs.id, jobId));
    }
  }

  async markJobCompleted(jobId: string) {
    await db.update(importJobs)
      .set({ status: 'COMPLETED' })
      .where(eq(importJobs.id, jobId));
    // Mantém contador por mais 5 min para polling final, depois limpa
    const existingTimer = this.jobTimers.get(jobId);
    if (existingTimer) clearTimeout(existingTimer);
    const t = setTimeout(() => {
      this.jobDuplicates.delete(jobId);
      this.jobTimers.delete(jobId);
    }, 5 * 60 * 1000);
    if ((t as any)?.unref) (t as any).unref();
    this.jobTimers.set(jobId, t);
  }

  async getJobDocuments(jobId: string) {
    return await db.query.documents.findMany({
      where: eq(documents.importJobId, jobId)
    });
  }

  async incrementProcessed(jobId: string) {
    await db.update(importJobs)
      .set({ processedFiles: sql`${importJobs.processedFiles} + 1` })
      .where(eq(importJobs.id, jobId));
  }
}

export const importService = new ImportService();
