import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '../core/buscador/database/connection';
import { sanitizeCNPJ } from '../core/buscador/domain/cnpj';
import { logger } from '../api/utils/logger';

/**
 * Migra dados de um banco SQLite legado do Buscador (fiscal_storage.db)
 * para a base consolidada do workspace (workspace-fiscal.sqlite).
 * Utiliza SQLite ATTACH/DETACH para garantir atomicidade, alta performance
 * e liberação imediata de file locks no Windows.
 * Idempotente: renomeia o banco de origem para .bak ao término.
 */
export async function migrateLegacyBuscadorDatabase(
  legacyPath: string,
  targetPath: string
): Promise<boolean> {
  if (!fs.existsSync(legacyPath)) {
    return false;
  }

  // Se o caminho de origem e destino forem idênticos, não migra
  if (path.resolve(legacyPath) === path.resolve(targetPath)) {
    return false;
  }

  const stat = fs.statSync(legacyPath);
  if (stat.size === 0) {
    try {
      fs.renameSync(legacyPath, `${legacyPath}.bak`);
    } catch {}
    return false;
  }

  logger.info({ from: legacyPath, to: targetPath }, 'legacy_buscador_migration_start');

  const targetDb = await DatabaseManager.create(targetPath);

  try {
    const escapedLegacyPath = path.resolve(legacyPath).replace(/'/g, "''");
    targetDb.execute(`ATTACH DATABASE '${escapedLegacyPath}' AS legacy;`);

    try {
      // 1. Migração de Empresas (com dedup por CNPJ)
      const hasLegacyCompanies = targetDb.queryOne<{ name: string }>(
        "SELECT name FROM legacy.sqlite_master WHERE type = 'table' AND name = 'companies';"
      ) !== null;

      if (hasLegacyCompanies) {
        const legacyCompanies = targetDb.queryAll<any>('SELECT * FROM legacy.companies ORDER BY id ASC;');
        for (const comp of legacyCompanies) {
          const cleanCnpj = sanitizeCNPJ(comp.cnpj);
          const existing = targetDb.queryOne<any>('SELECT * FROM companies WHERE cnpj = ?;', [cleanCnpj]);
          let targetNumericId: number;

          if (existing) {
            targetNumericId = Number(existing.numeric_id || existing.id);
            targetDb.execute(
              `UPDATE companies 
               SET uf = COALESCE(uf, ?), state = COALESCE(state, ?), folder_path = COALESCE(folder_path, ?)
               WHERE numeric_id = ? OR id = ?;`,
              [comp.uf || '35', comp.uf || 'SP', comp.folder_path, targetNumericId, existing.id]
            );
          } else {
            const maxRes = targetDb.queryOne<{ maxId: number }>(
              'SELECT COALESCE(MAX(numeric_id), 0) as maxId FROM companies;'
            );
            targetNumericId = Number(maxRes?.maxId || 0) + 1;
            const uuid = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            targetDb.execute(
              `INSERT INTO companies (id, numeric_id, name, cnpj, uf, state, folder_path, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                uuid,
                targetNumericId,
                comp.name?.trim() || 'Empresa',
                cleanCnpj,
                comp.uf || '35',
                comp.uf || 'SP',
                comp.folder_path || null,
                comp.is_active ? 1 : 0,
              ]
            );
          }
        }
      }

      // 2. Certificados
      const hasLegacyCertificates = targetDb.queryOne<{ name: string }>(
        "SELECT name FROM legacy.sqlite_master WHERE type = 'table' AND name = 'certificates';"
      ) !== null;
      if (hasLegacyCertificates) {
        const certCols = targetDb.queryAll<{ name: string }>('PRAGMA legacy.table_info(certificates);').map((r) => r.name);
        const certCol = (colName: string, fb = 'NULL') => (certCols.includes(colName) ? `lc.${colName}` : fb);
        targetDb.execute(`
          INSERT OR REPLACE INTO certificates (
            company_id, subject, issuer, serial_number, thumbprint, valid_from, valid_to,
            provider, has_private_key, extracted_cnpj, extracted_cpf
          )
          SELECT 
            COALESCE(tc.numeric_id, CAST(lc.company_id AS INTEGER)),
            lc.subject, lc.issuer, ${certCol('serial_number')}, lc.thumbprint, lc.valid_from, lc.valid_to,
            ${certCol('provider', "'windows_store'")},
            ${certCol('has_private_key', '1')},
            ${certCol('extracted_cnpj')},
            ${certCol('extracted_cpf')}
          FROM legacy.certificates lc
          LEFT JOIN legacy.companies lcomp ON lcomp.id = lc.company_id
          LEFT JOIN companies tc ON tc.cnpj = lcomp.cnpj;
        `);
      }

      // 3. Distribution State
      const hasLegacyDistState = targetDb.queryOne<{ name: string }>(
        "SELECT name FROM legacy.sqlite_master WHERE type = 'table' AND name = 'distribution_state';"
      ) !== null;
      if (hasLegacyDistState) {
        const dsCols = targetDb.queryAll<{ name: string }>('PRAGMA legacy.table_info(distribution_state);').map((r) => r.name);
        const dsCol = (colName: string, fb = 'NULL') => (dsCols.includes(colName) ? `lds.${colName}` : fb);
        targetDb.execute(`
          INSERT OR REPLACE INTO distribution_state (
            company_id, document_type, environment, last_nsu, max_nsu, last_query_at,
            status, last_error, last_cstat, next_query_at
          )
          SELECT 
            COALESCE(tc.numeric_id, CAST(lds.company_id AS INTEGER)),
            lds.document_type,
            ${dsCol('environment', "'homologation'")},
            lds.last_nsu, lds.max_nsu,
            ${dsCol('last_query_at')},
            ${dsCol('status', "'IDLE'")},
            ${dsCol('last_error')},
            ${dsCol('last_cstat')},
            ${dsCol('next_query_at')}
          FROM legacy.distribution_state lds
          LEFT JOIN legacy.companies lcomp ON lcomp.id = lds.company_id
          LEFT JOIN companies tc ON tc.cnpj = lcomp.cnpj;
        `);
      }

      // 4. Documentos
      const targetDocTable = targetDb.hasTable('buscador_documents') ? 'buscador_documents' : 'documents';
      const hasLegacyDocs = targetDb.queryOne<{ name: string }>(
        "SELECT name FROM legacy.sqlite_master WHERE type = 'table' AND (name = 'buscador_documents' OR name = 'documents' OR name = 'documents_v3') ORDER BY CASE name WHEN 'buscador_documents' THEN 1 WHEN 'documents' THEN 2 ELSE 3 END ASC;"
      )?.name;

      if (hasLegacyDocs) {
        const docCols = targetDb.queryAll<{ name: string }>(`PRAGMA legacy.table_info(${hasLegacyDocs});`).map((r) => r.name);
        const docCol = (colName: string, fb = 'NULL') => (docCols.includes(colName) ? `ld.${colName}` : fb);
        targetDb.execute(`
          INSERT OR IGNORE INTO ${targetDocTable} (
            company_id, document_type, environment, origin, nsu, schema_type, access_key,
            content_hash, document_number, series, issue_date, received_at,
            issuer_cnpj, issuer_name, recipient_cnpj, recipient_name,
            total_value, xml_path, pdf_path, xml_status, pdf_status, situacao_fiscal
          )
          SELECT 
            COALESCE(tc.numeric_id, CAST(ld.company_id AS INTEGER)),
            ld.document_type,
            ${docCol('environment', "'homologation'")},
            ${docCol('origin', "'SEFAZ_DISTRIBUTION'")},
            ld.nsu,
            ld.schema_type,
            ld.access_key,
            ${docCol('content_hash')},
            ${docCol('document_number')},
            ${docCol('series')},
            ${docCol('issue_date')},
            ${docCol('received_at', "datetime('now', 'localtime')")},
            ${docCol('issuer_cnpj')},
            ${docCol('issuer_name')},
            ${docCol('recipient_cnpj')},
            ${docCol('recipient_name')},
            ${docCol('total_value', '0')},
            ${docCol('xml_path')},
            ${docCol('pdf_path')},
            ${docCol('xml_status', "'XML_DISPONIVEL'")},
            ${docCol('pdf_status', "'PDF_INDISPONIVEL'")},
            ${docCol('situacao_fiscal', "'AUTORIZADA'")}
          FROM legacy.${hasLegacyDocs} ld
          LEFT JOIN legacy.companies lcomp ON lcomp.id = ld.company_id
          LEFT JOIN companies tc ON tc.cnpj = lcomp.cnpj;
        `);
      }

      // 5. NFS-e Eventos
      const hasLegacyEvents = targetDb.queryOne<{ name: string }>(
        "SELECT name FROM legacy.sqlite_master WHERE type = 'table' AND name = 'nfse_events';"
      ) !== null;
      if (hasLegacyEvents) {
        targetDb.execute(`
          INSERT OR IGNORE INTO nfse_events (
            company_id, environment, access_key, nsu, event_identifier,
            event_type, event_sequence, event_date, schema_type, xml_path, content_hash
          )
          SELECT 
            COALESCE(tc.numeric_id, CAST(le.company_id AS INTEGER)),
            le.environment, le.access_key, le.nsu, le.event_identifier,
            le.event_type, le.event_sequence, le.event_date, le.schema_type, le.xml_path, le.content_hash
          FROM legacy.nfse_events le
          LEFT JOIN legacy.companies lcomp ON lcomp.id = le.company_id
          LEFT JOIN companies tc ON tc.cnpj = lcomp.cnpj;
        `);
      }

      // 6. App Settings
      const hasLegacySettings = targetDb.queryOne<{ name: string }>(
        "SELECT name FROM legacy.sqlite_master WHERE type = 'table' AND name = 'app_settings';"
      ) !== null;
      if (hasLegacySettings) {
        targetDb.execute(`
          INSERT OR REPLACE INTO app_settings (key, value)
          SELECT key, value FROM legacy.app_settings;
        `);
      }
    } finally {
      targetDb.execute('DETACH DATABASE legacy;');
    }

    // Renomeia o banco de origem e arquivos auxiliares WAL
    const bakPath = `${legacyPath}.bak`;
    if (fs.existsSync(bakPath)) {
      try {
        fs.unlinkSync(bakPath);
      } catch {}
    }
    fs.renameSync(legacyPath, bakPath);

    for (const suffix of ['-wal', '-shm', '-journal']) {
      const aux = legacyPath + suffix;
      if (fs.existsSync(aux)) {
        try {
          fs.unlinkSync(aux);
        } catch {}
      }
    }

    logger.info({ from: legacyPath, to: targetPath }, 'legacy_buscador_migration_success');
    return true;
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'legacy_buscador_migration_error');
    throw error;
  } finally {
    targetDb.close();
  }
}
