import { DatabaseManager } from '../connection';
import { FiscalDocument, DocumentSearchFilters, PaginatedResult } from '../../domain/types';
import { sanitizeAccessKey } from '../../domain/access-key';
import { formatNSU } from '../../domain/nsu';
import { deriveDocumentPresentation } from '../../domain/document-presentation';
import { normalizePageSize } from '../../domain/page-size';
import { normalizeNfseAccessKey } from '../../nfse/domain/access-key';
import { normalizeNfseNsu } from '../../nfse/domain/nsu';

export class DocumentRepository {
  constructor(private db: DatabaseManager) {}

  private get table(): string {
    return this.db.hasTable('buscador_documents') ? 'buscador_documents' : 'documents';
  }

  public upsert(doc: Omit<FiscalDocument, 'id' | 'created_at' | 'updated_at'>): FiscalDocument {
    const cleanKey = doc.document_type === 'NFSE'
      ? normalizeNfseAccessKey(doc.access_key)
      : sanitizeAccessKey(doc.access_key);
    const cleanNSU = doc.document_type === 'NFSE' ? normalizeNfseNsu(doc.nsu) : formatNSU(doc.nsu);
    const t = this.table;

    this.db.execute(
      `INSERT INTO ${t} (
        company_id, document_type, environment, origin, nsu, schema_type, access_key, content_hash,
        document_number, series, issue_date, received_at,
        issuer_cnpj, issuer_name, recipient_cnpj, recipient_name,
        total_value, xml_path, pdf_path, xml_status, pdf_status,
        situacao_fiscal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(company_id, document_type, environment, access_key) DO UPDATE SET
        nsu = CASE
          WHEN excluded.document_type = 'NFSE' AND length(excluded.nsu) > length(${t}.nsu) THEN excluded.nsu
          WHEN excluded.document_type = 'NFSE' AND length(excluded.nsu) = length(${t}.nsu) AND excluded.nsu > ${t}.nsu THEN excluded.nsu
          WHEN excluded.document_type <> 'NFSE' AND excluded.nsu > ${t}.nsu THEN excluded.nsu
          ELSE ${t}.nsu
        END,
        origin = CASE
          WHEN ${t}.origin = 'NFSE_ADN_DISTRIBUTION' OR excluded.origin = 'NFSE_ADN_DISTRIBUTION'
            THEN 'NFSE_ADN_DISTRIBUTION'
          ELSE ${t}.origin
        END,
        content_hash = COALESCE(excluded.content_hash, ${t}.content_hash),
        schema_type = CASE
          WHEN ${t}.schema_type LIKE 'procNFe%' OR ${t}.schema_type LIKE 'procCTe%' THEN ${t}.schema_type
          WHEN excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%' THEN excluded.schema_type
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' THEN excluded.schema_type
          ELSE COALESCE(${t}.schema_type, excluded.schema_type)
        END,
        document_number = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.document_number IS NOT NULL THEN excluded.document_number
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.document_number IS NOT NULL THEN excluded.document_number
          ELSE COALESCE(NULLIF(${t}.document_number, ''), NULLIF(excluded.document_number, ''))
        END,
        series = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.series IS NOT NULL THEN excluded.series
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.series IS NOT NULL THEN excluded.series
          ELSE COALESCE(NULLIF(${t}.series, ''), NULLIF(excluded.series, ''))
        END,
        issue_date = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issue_date IS NOT NULL THEN excluded.issue_date
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issue_date IS NOT NULL THEN excluded.issue_date
          ELSE COALESCE(NULLIF(${t}.issue_date, ''), NULLIF(excluded.issue_date, ''))
        END,
        issuer_cnpj = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_cnpj IS NOT NULL THEN excluded.issuer_cnpj
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_cnpj IS NOT NULL THEN excluded.issuer_cnpj
          ELSE COALESCE(NULLIF(${t}.issuer_cnpj, ''), NULLIF(excluded.issuer_cnpj, ''))
        END,
        issuer_name = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_name IS NOT NULL THEN excluded.issuer_name
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.issuer_name IS NOT NULL THEN excluded.issuer_name
          ELSE COALESCE(NULLIF(${t}.issuer_name, ''), NULLIF(excluded.issuer_name, ''))
        END,
        recipient_cnpj = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_cnpj IS NOT NULL THEN excluded.recipient_cnpj
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_cnpj IS NOT NULL THEN excluded.recipient_cnpj
          ELSE COALESCE(NULLIF(${t}.recipient_cnpj, ''), NULLIF(excluded.recipient_cnpj, ''))
        END,
        recipient_name = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_name IS NOT NULL THEN excluded.recipient_name
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.recipient_name IS NOT NULL THEN excluded.recipient_name
          ELSE COALESCE(NULLIF(${t}.recipient_name, ''), NULLIF(excluded.recipient_name, ''))
        END,
        total_value = CASE
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.total_value > 0 THEN excluded.total_value
          WHEN excluded.total_value > 0 THEN excluded.total_value
          ELSE ${t}.total_value
        END,
        xml_path = CASE
          WHEN (${t}.schema_type LIKE 'procNFe%' OR ${t}.schema_type LIKE 'procCTe%') AND ${t}.schema_type NOT LIKE '%Evento%' AND ${t}.xml_path IS NOT NULL THEN ${t}.xml_path
          WHEN (excluded.schema_type LIKE 'procNFe%' OR excluded.schema_type LIKE 'procCTe%') AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.xml_path IS NOT NULL THEN excluded.xml_path
          WHEN ${t}.schema_type LIKE '%Evento%' AND excluded.schema_type NOT LIKE '%Evento%' AND excluded.xml_path IS NOT NULL THEN excluded.xml_path
          ELSE COALESCE(${t}.xml_path, excluded.xml_path)
        END,
        pdf_path = COALESCE(excluded.pdf_path, ${t}.pdf_path),
        xml_status = CASE
          WHEN ${t}.xml_status = 'XML_DISPONIVEL' OR excluded.xml_status = 'XML_DISPONIVEL' THEN 'XML_DISPONIVEL'
          ELSE 'XML_INDISPONIVEL'
        END,
        pdf_status = CASE
          WHEN ${t}.pdf_path IS NOT NULL OR excluded.pdf_path IS NOT NULL THEN 'PDF_DISPONIVEL'
          ELSE 'PDF_INDISPONIVEL'
        END,
        situacao_fiscal = CASE
          WHEN excluded.situacao_fiscal = 'CANCELADA' OR ${t}.situacao_fiscal = 'CANCELADA' THEN 'CANCELADA'
          WHEN excluded.situacao_fiscal = 'DENEGADA' OR ${t}.situacao_fiscal = 'DENEGADA' THEN 'DENEGADA'
          ELSE COALESCE(excluded.situacao_fiscal, ${t}.situacao_fiscal)
        END,
        updated_at = datetime('now', 'localtime');`,
      [
        doc.company_id,
        doc.document_type,
        doc.environment,
        doc.origin,
        cleanNSU,
        doc.schema_type,
        cleanKey,
        doc.content_hash || null,
        doc.document_number || null,
        doc.series || null,
        doc.issue_date || null,
        doc.received_at || new Date().toISOString(),
        doc.issuer_cnpj || null,
        doc.issuer_name || null,
        doc.recipient_cnpj || null,
        doc.recipient_name || null,
        doc.total_value || 0,
        doc.xml_path || null,
        doc.pdf_path || null,
        doc.xml_status || 'XML_INDISPONIVEL',
        doc.pdf_status || 'PDF_INDISPONIVEL',
        doc.situacao_fiscal || 'AUTORIZADA',
      ]
    );

    const saved = this.findByAccessKey(cleanKey, doc.company_id, doc.document_type, doc.environment);
    if (!saved) throw new Error('Não foi possível localizar o documento após a persistência.');
    if (doc.document_type === 'NFSE') {
      this.db.execute(
        `UPDATE nfse_events SET document_id = ?, updated_at = datetime('now', 'localtime')
         WHERE company_id = ? AND environment = ? AND access_key = ? AND document_id IS NULL;`,
        [saved.id, doc.company_id, doc.environment, cleanKey]
      );
    }
    return saved;
  }

  public findById(id: number, companyId: number): FiscalDocument | null {
    return this.db.queryOne<FiscalDocument>(
      `SELECT * FROM ${this.table} WHERE id = ? AND company_id = ?;`,
      [id, companyId]
    );
  }

  public findByAccessKey(
    accessKey: string,
    companyId?: number,
    documentType?: FiscalDocument['document_type'],
    environment?: FiscalDocument['environment']
  ): FiscalDocument | null {
    const cleanKey = sanitizeAccessKey(accessKey);
    if (companyId !== undefined && documentType && environment) {
      return this.db.queryOne<FiscalDocument>(
        `SELECT * FROM ${this.table}
         WHERE company_id = ? AND document_type = ? AND environment = ? AND access_key = ?;`,
        [companyId, documentType, environment, cleanKey]
      );
    }
    return companyId === undefined
      ? this.db.queryOne<FiscalDocument>(
          `SELECT * FROM ${this.table} WHERE access_key = ? ORDER BY id LIMIT 1;`,
          [cleanKey]
        )
      : this.db.queryOne<FiscalDocument>(
          `SELECT * FROM ${this.table} WHERE company_id = ? AND access_key = ?;`,
          [companyId, cleanKey]
        );
  }

  public search(filters: DocumentSearchFilters): PaginatedResult<FiscalDocument> {
    const ownIssuedEventPredicate = `(d.document_type = 'NFE'
      AND d.schema_type LIKE '%Evento%'
      AND length(d.access_key) = 44
      AND substr(d.access_key, 7, 14) = c.cnpj)`;
    const visibilityPredicate = `(d.schema_type NOT LIKE '%Evento%' OR ${ownIssuedEventPredicate})`;
    const effectiveIssuerCnpj = `(CASE WHEN ${ownIssuedEventPredicate} THEN c.cnpj ELSE d.issuer_cnpj END)`;
    const effectiveIssuerName = `(CASE WHEN ${ownIssuedEventPredicate} THEN c.name ELSE d.issuer_name END)`;
    const conditions: string[] = ['d.company_id = ?', visibilityPredicate];
    const params: any[] = [filters.company_id];

    if (filters.document_types && filters.document_types.length > 0) {
      const placeholders = filters.document_types.map(() => '?').join(',');
      conditions.push(`d.document_type IN (${placeholders})`);
      params.push(...filters.document_types);
    }

    if (filters.environment) {
      conditions.push('d.environment = ?');
      params.push(filters.environment);
    }

    if (filters.start_date) {
      conditions.push('substr(d.issue_date, 1, 10) >= ?');
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push('substr(d.issue_date, 1, 10) <= ?');
      params.push(filters.end_date);
    }

    if (filters.direction) {
      if (filters.direction === 'INBOUND') {
        conditions.push(`(d.recipient_cnpj = c.cnpj OR (d.recipient_cnpj IS NULL AND ${effectiveIssuerCnpj} <> c.cnpj))`);
      } else if (filters.direction === 'OUTBOUND') {
        conditions.push(`${effectiveIssuerCnpj} = c.cnpj`);
      }
    }

    if (filters.access_key) {
      conditions.push('d.access_key = ?');
      params.push(sanitizeAccessKey(filters.access_key));
    }

    if (filters.document_number) {
      conditions.push('d.document_number = ?');
      params.push(filters.document_number.trim());
    }

    if (filters.issuer_cnpj_or_name?.trim()) {
      conditions.push(`(${effectiveIssuerCnpj} LIKE ? OR ${effectiveIssuerName} LIKE ?)`);
      const term = `%${filters.issuer_cnpj_or_name.trim()}%`;
      params.push(term, term);
    }

    if (filters.search_query?.trim()) {
      const raw = filters.search_query.trim();
      const digits = sanitizeAccessKey(raw);
      const likeRaw = `%${raw}%`;
      const clauses = [
        'd.document_number LIKE ?',
        'd.series LIKE ?',
        `${effectiveIssuerCnpj} LIKE ?`,
        `${effectiveIssuerName} LIKE ?`,
        'd.recipient_cnpj LIKE ?',
        'd.recipient_name LIKE ?',
      ];
      params.push(likeRaw, likeRaw, likeRaw, likeRaw, likeRaw, likeRaw);
      if (digits) {
        clauses.push('d.access_key LIKE ?');
        params.push(`%${digits}%`);
      }
      conditions.push(`(${clauses.join(' OR ')})`);
    }

    if (filters.series) {
      conditions.push('d.series = ?');
      params.push(filters.series.trim());
    }
    if (filters.xml_status) {
      conditions.push('d.xml_status = ?');
      params.push(filters.xml_status);
    }
    if (filters.pdf_status) {
      conditions.push('d.pdf_status = ?');
      params.push(filters.pdf_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Contagem total
    const fromClause = `FROM ${this.table} d JOIN companies c ON (c.numeric_id = d.company_id OR (c.numeric_id IS NULL AND c.id = CAST(d.company_id AS TEXT)))`;
    const countSql = `SELECT COUNT(*) as total ${fromClause} ${whereClause};`;
    const countRow = this.db.queryOne<{ total: number }>(countSql, params);
    const total = countRow?.total || 0;

    // Paginação
    const page = Math.max(1, filters.page || 1);
    const pageSize = normalizePageSize(filters.page_size);
    const offset = (page - 1) * pageSize;

    const dataSql = `
      SELECT d.*, c.name AS company_name, c.cnpj AS company_cnpj ${fromClause}
      ${whereClause} 
      ORDER BY d.issue_date DESC, d.id DESC
      LIMIT ? OFFSET ?;
    `;
    const rows = this.db.queryAll<FiscalDocument & { company_name: string; company_cnpj: string }>(
      dataSql,
      [...params, pageSize, offset],
    );
    const items = rows.map(({ company_name, company_cnpj, ...document }) =>
      deriveDocumentPresentation(document, { name: company_name, cnpj: company_cnpj })
    );

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize) || 1,
    };
  }

  public updateStoragePaths(id: number, xmlPath?: string, pdfPath?: string): void {
    this.db.execute(
      `UPDATE ${this.table} 
       SET xml_path = COALESCE(?, xml_path),
           pdf_path = COALESCE(?, pdf_path),
           xml_status = CASE WHEN ? IS NOT NULL THEN 'XML_DISPONIVEL' ELSE xml_status END,
           pdf_status = CASE WHEN ? IS NOT NULL THEN 'PDF_DISPONIVEL' ELSE pdf_status END,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?;`,
      [xmlPath || null, pdfPath || null, xmlPath || null, pdfPath || null, id]
    );
  }

  public isKnownStoragePath(filePath: string, companyId: number): boolean {
    return Boolean(
      this.db.queryOne(`SELECT id FROM ${this.table} WHERE company_id = ? AND (xml_path = ? OR pdf_path = ?) LIMIT 1;`, [
        companyId,
        filePath,
        filePath,
      ])
    );
  }
}
