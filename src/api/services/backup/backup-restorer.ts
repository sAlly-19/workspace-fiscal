import { promises as fs, existsSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { DB_PATH, rawClient, db, reconfigureDatabase } from '../../../db';
import {
  applicationSettings,
  companies,
  categories,
  assets,
  depreciationEntries,
  depreciationExports,
  folders,
  batches,
  importJobs,
  documents,
  documentItems,
  documentTaxes,
  documentEvents,
} from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { storageService } from '../storage.service';
import { logger } from '../../utils/logger';
import { activityLogService } from '../activity-log.service';
import type { BackupModule, BackupInspectionResult } from './backup.types';

export interface RestoreBackupOptions {
  filePath: string;
  modulesToRestore: BackupModule[];
}

export interface RestoreBackupResult {
  success: boolean;
  message: string;
  restoredModules: string[];
  safetyBackupFile: string;
}

export async function restoreBackup(
  options: RestoreBackupOptions,
  createSafetyBackupFn: () => Promise<{ filename: string; path: string }>,
  inspectBackupFn: (filePath: string) => Promise<BackupInspectionResult>
): Promise<RestoreBackupResult> {
  const inspection = await inspectBackupFn(options.filePath);
  if (!inspection.valid) {
    throw new Error(inspection.error || 'Arquivo de backup inválido.');
  }

  // 1. Cria obrigatoriamente um backup de segurança antes de qualquer modificação
  let safety: { filename: string; path: string };
  try {
    safety = await createSafetyBackupFn();
    logger.info({ safety }, 'restore_safety_backup_created_successfully');
  } catch (safetyErr) {
    throw new Error(`Falha ao criar o backup de emergência: ${(safetyErr as Error).message}. Restauração abortada.`);
  }

  // 2. Restauração de banco legado SQLite (.db)
  if (inspection.isLegacy) {
    try {
      await rawClient.execute('PRAGMA wal_checkpoint(TRUNCATE);');
      await fs.copyFile(options.filePath, DB_PATH);
      for (const suffix of ['-wal', '-shm', '-journal']) {
        const aux = DB_PATH + suffix;
        if (existsSync(aux)) {
          try {
            await fs.unlink(aux);
          } catch {}
        }
      }
      reconfigureDatabase(DB_PATH);
      const check = await rawClient.execute('PRAGMA integrity_check;');
      const checkRes = check.rows?.[0]?.[0] ?? (check.rows?.[0] as any)?.integrity_check;
      if (checkRes !== 'ok') {
        throw new Error('Integridade do banco SQLite restaurado inválida.');
      }
      return {
        success: true,
        message: 'Banco de dados legado restaurado com sucesso.',
        restoredModules: ['FULL_DATABASE'],
        safetyBackupFile: safety.filename,
      };
    } catch (legacyErr) {
      logger.error({ err: (legacyErr as Error).message }, 'restore_legacy_failed_reverting');
      // Reverte com o arquivo raw de segurança se existir
      reconfigureDatabase(DB_PATH);
      throw new Error(`Erro na restauração do arquivo legado: ${(legacyErr as Error).message}`);
    }
  }

  // 3. Restauração de arquivo estruturado (.wfb)
  const zip = new AdmZip(options.filePath);
  const availableModules = (inspection.modules as any[]) || [];
  const modules = options.modulesToRestore.filter((m) => availableModules.includes(m));

  if (modules.length === 0) {
    throw new Error('Nenhum módulo válido foi selecionado para restauração.');
  }

  try {
    // Força flush e truncamento do log WAL antes da restauração
    await rawClient.execute('PRAGMA wal_checkpoint(TRUNCATE);').catch(() => {});

    // Inicia transação atômica no SQLite
    await rawClient.execute('BEGIN IMMEDIATE TRANSACTION;');

    // RESTAURAÇÃO: DEPRECIAÇÃO
    if (modules.includes('DEPRECIATION')) {
      const depEntry = zip.getEntry('data/depreciation.json');
      if (!depEntry) throw new Error('Dados de Depreciação não encontrados no arquivo de backup.');
      const depData = JSON.parse(depEntry.getData().toString('utf-8'));

      // Limpa dados de depreciação na ordem reversa das foreign keys
      await rawClient.execute('DELETE FROM "depreciation_entries";');
      await rawClient.execute('DELETE FROM "depreciation_exports";');
      await rawClient.execute('DELETE FROM "assets";');
      await rawClient.execute('DELETE FROM "categories";');
      await rawClient.execute('DELETE FROM "companies";');

      // Insere empresas
      if (Array.isArray(depData.companies)) {
        for (const c of depData.companies) {
          await db.insert(companies).values({
            id: c.id,
            name: c.name,
            tradeName: c.tradeName || null,
            document: c.document || null,
            cnpj: c.cnpj || null,
            state: c.state || null,
            city: c.city || null,
            depreciationRule: c.depreciationRule || 'PROPORTIONAL',
            createdAt: new Date(c.createdAt || Date.now()),
            updatedAt: new Date(c.updatedAt || Date.now()),
          });
        }
      }

      // Insere categorias
      if (Array.isArray(depData.categories)) {
        for (const cat of depData.categories) {
          await db.insert(categories).values({
            id: cat.id,
            companyId: cat.companyId || null,
            name: cat.name,
            defaultRate: Number(cat.defaultRate),
            createdAt: new Date(cat.createdAt || Date.now()),
          });
        }
      }

      // Insere bens / ativos
      if (Array.isArray(depData.assets)) {
        for (const a of depData.assets) {
          await db.insert(assets).values({
            id: a.id,
            companyId: a.companyId,
            supplier: a.supplier,
            acquisitionDate: new Date(a.acquisitionDate),
            documentNumber: a.documentNumber,
            description: a.description,
            acquisitionValue: Number(a.acquisitionValue),
            ncm: a.ncm || null,
            categoryId: a.categoryId || null,
            categoryName: a.categoryName || null,
            annualRate: Number(a.annualRate),
            status: a.status || 'ACTIVE',
            disposedAt: a.disposedAt ? new Date(a.disposedAt) : null,
            disposedReason: a.disposedReason || null,
            createdAt: new Date(a.createdAt || Date.now()),
            updatedAt: new Date(a.updatedAt || Date.now()),
          });
        }
      }

      // Insere exportações registradas
      if (Array.isArray(depData.depreciationExports)) {
        for (const exp of depData.depreciationExports) {
          await db.insert(depreciationExports).values({
            id: exp.id,
            companyId: exp.companyId,
            competence: exp.competence,
            filename: exp.filename,
            generatedAt: new Date(exp.generatedAt || Date.now()),
            totalValue: Number(exp.totalValue),
            status: exp.status || 'EXPORTED',
            createdAt: new Date(exp.createdAt || Date.now()),
          });
        }
      }

      // Insere lançamentos mensais
      if (Array.isArray(depData.depreciationEntries)) {
        for (const en of depData.depreciationEntries) {
          await db.insert(depreciationEntries).values({
            id: en.id,
            assetId: en.assetId,
            competence: en.competence,
            depreciationValue: Number(en.depreciationValue),
            accumulatedValue: Number(en.accumulatedValue),
            currentValue: Number(en.currentValue),
            exported: Boolean(en.exported),
            exportedAt: en.exportedAt ? new Date(en.exportedAt) : null,
            createdAt: new Date(en.createdAt || Date.now()),
          });
        }
      }
    }

    // RESTAURAÇÃO: NF VIEW (com restauração dos XMLs físicos no storage local)
    if (modules.includes('NF_VIEW')) {
      const nfEntry = zip.getEntry('data/nf_view.json');
      if (!nfEntry) throw new Error('Dados de NF View não encontrados no arquivo de backup.');
      const nfData = JSON.parse(nfEntry.getData().toString('utf-8'));

      // 1. Extrai os arquivos XML físicos contidos no pacote para o diretório de storage da máquina atual
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (!entry.isDirectory && entry.entryName.startsWith('storage/documents/')) {
          const fileName = path.basename(entry.entryName);
          const content = entry.getData();
          await storageService.saveXml(fileName, content);
        }
      }

      // 2. Limpa dados de notas fiscais na ordem reversa das foreign keys
      await rawClient.execute('DELETE FROM "document_events";');
      await rawClient.execute('DELETE FROM "document_taxes";');
      await rawClient.execute('DELETE FROM "document_items";');
      await rawClient.execute('DELETE FROM "documents";');
      await rawClient.execute('DELETE FROM "batches";');
      await rawClient.execute('DELETE FROM "folders";');
      await rawClient.execute('DELETE FROM "import_jobs";');

      // 3. Insere pastas mantendo hierarquia (pais antes de filhos)
      if (Array.isArray(nfData.folders)) {
        const rootFolders = nfData.folders.filter((f: any) => !f.parentId);
        const subFolders = nfData.folders.filter((f: any) => !!f.parentId);
        for (const f of [...rootFolders, ...subFolders]) {
          await db.insert(folders).values({
            id: f.id,
            name: f.name,
            parentId: f.parentId || null,
            createdAt: new Date(f.createdAt || Date.now()),
            updatedAt: new Date(f.updatedAt || Date.now()),
          });
        }
      }

      // Insere lotes
      if (Array.isArray(nfData.batches)) {
        for (const b of nfData.batches) {
          await db.insert(batches).values({
            id: b.id,
            name: b.name,
            folderId: b.folderId || null,
            createdAt: new Date(b.createdAt || Date.now()),
            updatedAt: new Date(b.updatedAt || Date.now()),
          });
        }
      }

      // Insere import jobs
      if (Array.isArray(nfData.importJobs)) {
        for (const ij of nfData.importJobs) {
          await db.insert(importJobs).values({
            id: ij.id,
            status: ij.status || 'COMPLETED',
            totalFiles: Number(ij.totalFiles || 0),
            processedFiles: Number(ij.processedFiles || 0),
            createdAt: new Date(ij.createdAt || Date.now()),
            updatedAt: new Date(ij.updatedAt || Date.now()),
          });
        }
      }

      // Insere documentos reconstruindo rawXmlPath apontando para a máquina local
      if (Array.isArray(nfData.documents)) {
        for (const doc of nfData.documents) {
          const xmlBase = doc.xmlFileName || path.basename(doc.rawXmlPath || '');
          const localRawXmlPath = xmlBase ? storageService.getDocumentPath('xml', xmlBase) : doc.rawXmlPath;

          await db.insert(documents).values({
            id: doc.id,
            type: doc.type,
            accessKey: doc.accessKey || null,
            number: doc.number || null,
            series: doc.series || null,
            issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
            status: doc.status || 'VALID',
            issuerName: doc.issuerName || null,
            issuerDocument: doc.issuerDocument || null,
            recipientName: doc.recipientName || null,
            recipientDocument: doc.recipientDocument || null,
            totalAmount: doc.totalAmount !== undefined && doc.totalAmount !== null ? Number(doc.totalAmount) : null,
            billing: doc.billing || null,
            rawXmlPath: localRawXmlPath,
            batchId: doc.batchId || null,
            importJobId: doc.importJobId || null,
            createdAt: new Date(doc.createdAt || Date.now()),
            updatedAt: new Date(doc.updatedAt || Date.now()),
          });
        }
      }

      // Insere itens
      if (Array.isArray(nfData.documentItems)) {
        for (const it of nfData.documentItems) {
          await db.insert(documentItems).values({
            id: it.id,
            documentId: it.documentId,
            code: it.code || null,
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            totalPrice: Number(it.totalPrice),
            cfop: it.cfop || null,
            ncm: it.ncm || null,
            unit: it.unit || null,
          });
        }
      }

      // Insere impostos
      if (Array.isArray(nfData.documentTaxes)) {
        for (const tx of nfData.documentTaxes) {
          await db.insert(documentTaxes).values({
            id: tx.id,
            documentId: tx.documentId,
            taxType: tx.taxType,
            amount: Number(tx.amount),
            base: tx.base !== null && tx.base !== undefined ? Number(tx.base) : null,
            rate: tx.rate !== null && tx.rate !== undefined ? Number(tx.rate) : null,
          });
        }
      }

      // Insere eventos reconstruindo rawXmlPath
      if (Array.isArray(nfData.documentEvents)) {
        for (const ev of nfData.documentEvents) {
          const xmlBase = ev.xmlFileName || path.basename(ev.rawXmlPath || '');
          const localRawXmlPath = xmlBase ? storageService.getDocumentPath('xml', xmlBase) : ev.rawXmlPath;

          await db.insert(documentEvents).values({
            id: ev.id,
            documentId: ev.documentId,
            eventType: ev.eventType,
            sequence: Number(ev.sequence || 1),
            eventDate: ev.eventDate ? new Date(ev.eventDate) : null,
            protocol: ev.protocol || null,
            rawXmlPath: localRawXmlPath,
            correctionText: ev.correctionText || null,
            createdAt: new Date(ev.createdAt || Date.now()),
          });
        }
      }
    }

    // RESTAURAÇÃO: BUSCADOR
    if (modules.includes('BUSCADOR')) {
      const buscEntry = zip.getEntry('data/buscador.json');
      if (!buscEntry) throw new Error('Dados do Buscador não encontrados no arquivo de backup.');
      const buscData = JSON.parse(buscEntry.getData().toString('utf-8'));

      const tableRes = await rawClient.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('buscador_documents', 'certificates', 'distribution_state', 'nfse_events', 'query_history', 'app_settings', 'companies');"
      );
      const existingTables = new Set(tableRes.rows.map((r: any) => r.name));

      // Se DEPRECIATION não foi restaurado, garante que as empresas do Buscador existam no banco
      if (!modules.includes('DEPRECIATION') && Array.isArray(buscData.companies)) {
        for (const c of buscData.companies) {
          const compCheck = await rawClient.execute({
            sql: 'SELECT id, numeric_id FROM "companies" WHERE cnpj = ? OR numeric_id = ? OR id = ?;',
            args: [c.cnpj || '', c.numeric_id || 0, c.id || ''],
          });
          if (compCheck.rows.length === 0) {
            await rawClient.execute({
              sql: 'INSERT INTO "companies" (id, numeric_id, name, cnpj, uf, state, is_active) VALUES (?, ?, ?, ?, ?, ?, ?);',
              args: [c.id, c.numeric_id || null, c.name || 'Empresa', c.cnpj || null, c.uf || '35', c.state || 'SP', c.is_active ? 1 : 0],
            });
          }
        }
      }

      // Limpa tabelas do Buscador
      if (existingTables.has('buscador_documents')) {
        await rawClient.execute('DELETE FROM "buscador_documents";');
      }
      if (existingTables.has('certificates')) {
        await rawClient.execute('DELETE FROM "certificates";');
      }
      if (existingTables.has('distribution_state')) {
        await rawClient.execute('DELETE FROM "distribution_state";');
      }
      if (existingTables.has('nfse_events')) {
        await rawClient.execute('DELETE FROM "nfse_events";');
      }
      if (existingTables.has('query_history')) {
        await rawClient.execute('DELETE FROM "query_history";');
      }

      // Restaura certificates
      if (existingTables.has('certificates') && Array.isArray(buscData.certificates)) {
        for (const cert of buscData.certificates) {
          await rawClient.execute({
            sql: `INSERT OR REPLACE INTO "certificates" (
              id, company_id, subject, issuer, serial_number, thumbprint, valid_from, valid_to,
              provider, has_private_key, extracted_cnpj, extracted_cpf
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              cert.id, cert.company_id, cert.subject, cert.issuer, cert.serial_number || null,
              cert.thumbprint, cert.valid_from, cert.valid_to, cert.provider || 'windows_store',
              cert.has_private_key !== undefined ? cert.has_private_key : 1,
              cert.extracted_cnpj || null, cert.extracted_cpf || null,
            ],
          });
        }
      }

      // Restaura distribution_state
      if (existingTables.has('distribution_state') && Array.isArray(buscData.distributionStates)) {
        for (const ds of buscData.distributionStates) {
          await rawClient.execute({
            sql: `INSERT OR REPLACE INTO "distribution_state" (
              id, company_id, document_type, environment, last_nsu, max_nsu,
              last_query_at, status, last_error, last_cstat, next_query_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              ds.id, ds.company_id, ds.document_type, ds.environment || 'homologation',
              ds.last_nsu || '000000000000000', ds.max_nsu || '000000000000000',
              ds.last_query_at || null, ds.status || 'IDLE', ds.last_error || null,
              ds.last_cstat || null, ds.next_query_at || null,
            ],
          });
        }
      }

      // Restaura buscador_documents e arquivos XML se inclusos
      if (existingTables.has('buscador_documents') && Array.isArray(buscData.documents)) {
        for (const doc of buscData.documents) {
          let resolvedXmlPath = doc.xml_path || null;
          let resolvedPdfPath = doc.pdf_path || null;

          if (doc._backup_xml_entry) {
            const entry = zip.getEntry(doc._backup_xml_entry);
            if (entry) {
              const targetPath = doc.xml_path || path.join(process.cwd(), 'data', 'documents', path.basename(doc._backup_xml_entry));
              await fs.mkdir(path.dirname(targetPath), { recursive: true });
              await fs.writeFile(targetPath, entry.getData());
              resolvedXmlPath = targetPath;
            }
          }
          if (doc._backup_pdf_entry) {
            const entry = zip.getEntry(doc._backup_pdf_entry);
            if (entry) {
              const targetPath = doc.pdf_path || path.join(process.cwd(), 'data', 'documents', path.basename(doc._backup_pdf_entry));
              await fs.mkdir(path.dirname(targetPath), { recursive: true });
              await fs.writeFile(targetPath, entry.getData());
              resolvedPdfPath = targetPath;
            }
          }

          await rawClient.execute({
            sql: `INSERT INTO "buscador_documents" (
              id, company_id, document_type, environment, origin, nsu, schema_type, access_key,
              content_hash, document_number, series, issue_date, received_at,
              issuer_cnpj, issuer_name, recipient_cnpj, recipient_name, total_value,
              xml_path, pdf_path, xml_status, pdf_status, situacao_fiscal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              doc.id, doc.company_id, doc.document_type, doc.environment || 'homologation',
              doc.origin || 'SEFAZ_DISTRIBUTION', doc.nsu, doc.schema_type, doc.access_key,
              doc.content_hash || null, doc.document_number || null, doc.series || null,
              doc.issue_date || null, doc.received_at || new Date().toISOString(),
              doc.issuer_cnpj || null, doc.issuer_name || null, doc.recipient_cnpj || null, doc.recipient_name || null,
              doc.total_value !== undefined ? doc.total_value : 0,
              resolvedXmlPath, resolvedPdfPath,
              doc.xml_status || 'XML_DISPONIVEL', doc.pdf_status || 'PDF_INDISPONIVEL',
              doc.situacao_fiscal || 'AUTORIZADA',
            ],
          });
        }
      }

      // Restaura nfse_events
      if (existingTables.has('nfse_events') && Array.isArray(buscData.nfseEvents)) {
        for (const ev of buscData.nfseEvents) {
          let resolvedXmlPath = ev.xml_path;
          if (ev._backup_xml_entry) {
            const entry = zip.getEntry(ev._backup_xml_entry);
            if (entry) {
              const targetPath = ev.xml_path || path.join(process.cwd(), 'data', 'documents', path.basename(ev._backup_xml_entry));
              await fs.mkdir(path.dirname(targetPath), { recursive: true });
              await fs.writeFile(targetPath, entry.getData());
              resolvedXmlPath = targetPath;
            }
          }
          await rawClient.execute({
            sql: `INSERT OR REPLACE INTO "nfse_events" (
              id, company_id, document_id, environment, access_key, nsu, event_identifier,
              event_type, event_sequence, event_date, schema_type, xml_path, content_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              ev.id, ev.company_id, ev.document_id || null, ev.environment || 'homologation',
              ev.access_key, ev.nsu || null, ev.event_identifier || null, ev.event_type,
              ev.event_sequence || null, ev.event_date || null, ev.schema_type,
              resolvedXmlPath, ev.content_hash,
            ],
          });
        }
      }

      // Restaura query_history
      if (existingTables.has('query_history') && Array.isArray(buscData.queryHistory)) {
        for (const qh of buscData.queryHistory) {
          await rawClient.execute({
            sql: `INSERT OR REPLACE INTO "query_history" (
              id, company_id, document_type, environment, query_type,
              last_nsu_before, last_nsu_after, max_nsu, documents_received,
              status, cstat, xmotivo, error_message, queried_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              qh.id, qh.company_id, qh.document_type, qh.environment || 'homologation', qh.query_type,
              qh.last_nsu_before, qh.last_nsu_after, qh.max_nsu, qh.documents_received,
              qh.status, qh.cstat || null, qh.xmotivo || null, qh.error_message || null,
              qh.queried_at || new Date().toISOString(),
            ],
          });
        }
      }

      // Restaura app_settings do Buscador
      if (existingTables.has('app_settings') && Array.isArray(buscData.appSettings)) {
        for (const s of buscData.appSettings) {
          await rawClient.execute({
            sql: 'INSERT OR REPLACE INTO "app_settings" (key, value, updated_at) VALUES (?, ?, datetime(\'now\', \'localtime\'));',
            args: [s.key, s.value],
          });
        }
      }
    }

    // RESTAURAÇÃO: CONFIGURAÇÕES
    if (modules.includes('SETTINGS')) {
      const setEntry = zip.getEntry('data/settings.json');
      if (setEntry) {
        const setData = JSON.parse(setEntry.getData().toString('utf-8'));
        if (Array.isArray(setData.applicationSettings)) {
          for (const s of setData.applicationSettings) {
            const existing = await db.query.applicationSettings.findFirst({
              where: eq(applicationSettings.key, s.key),
            });
            if (existing) {
              await db
                .update(applicationSettings)
                .set({ value: s.value, updatedAt: new Date() })
                .where(eq(applicationSettings.key, s.key));
            } else {
              await db.insert(applicationSettings).values({
                key: s.key,
                value: s.value,
                updatedAt: new Date(),
              });
            }
          }
        }
      }
    }

    // 4. Verificação de integridade referencial antes do commit
    const fkCheck = await rawClient.execute('PRAGMA foreign_key_check;');
    if (fkCheck.rows && fkCheck.rows.length > 0) {
      throw new Error(`Inconsistência de chave estrangeira após restauração: ${JSON.stringify(fkCheck.rows)}`);
    }

    // 5. Verificação de integridade do arquivo de banco
    const intCheck = await rawClient.execute('PRAGMA integrity_check;');
    const checkRes = intCheck.rows?.[0]?.[0] ?? (intCheck.rows?.[0] as any)?.integrity_check;
    if (checkRes !== 'ok') {
      throw new Error(`Integridade do banco após restauração inválida: ${checkRes}`);
    }

    await rawClient.execute('COMMIT;');
    await rawClient.execute('PRAGMA wal_checkpoint(TRUNCATE);').catch(() => {});
    logger.info({ modules, safetyBackup: safety.filename }, 'restore_completed_successfully');
    activityLogService
      .record({
        level: 'SUCCESS',
        module: 'BACKUP',
        action: 'BACKUP_RESTORE',
        message: `Restauração concluída com sucesso para os módulos: ${modules.join(', ')}.`,
        details: { modules, safetyBackup: safety.filename },
      })
      .catch(() => {});

    return {
      success: true,
      message: 'Módulos restaurados com sucesso com integridade verificada.',
      restoredModules: modules,
      safetyBackupFile: safety.filename,
    };
  } catch (restoreErr) {
    await rawClient.execute('ROLLBACK;').catch(() => {});
    logger.error({ err: (restoreErr as Error).message }, 'restore_transaction_failed_rolled_back');
    activityLogService
      .record({
        level: 'ERROR',
        module: 'BACKUP',
        action: 'BACKUP_RESTORE_ERROR',
        message: `Falha na restauração do backup: ${(restoreErr as Error).message}`,
        details: { error: (restoreErr as Error).message },
      })
      .catch(() => {});
    throw new Error(`Falha na restauração: ${(restoreErr as Error).message}. Nenhuma alteração foi gravada.`);
  }
}

