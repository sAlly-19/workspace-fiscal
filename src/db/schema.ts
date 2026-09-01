import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// --- Shared Constants & Types ---
export const documentTypes = ['NFE', 'NFCE', 'NFSE', 'CTE', 'UNKNOWN'] as const;
export const documentStatuses = ['VALID', 'WARNING', 'INVALID', 'UNKNOWN', 'UNSUPPORTED'] as const;

export type DocumentType = typeof documentTypes[number];
export type DocumentStatus = typeof documentStatuses[number];

// --- Tables ---

export const applicationSettings = sqliteTable('application_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull(),
});

export const documentEvents = sqliteTable(
  'document_events',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(), // 'CCE' = 110110, 'CANCEL' = 110111, 'OTHER'
    sequence: integer('sequence').notNull().default(1),
    eventDate: integer('event_date', { mode: 'timestamp' }),
    protocol: text('protocol'),
    rawXmlPath: text('raw_xml_path'),
    correctionText: text('correction_text'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .default(sql`(strftime('%s', 'now'))`)
      .notNull(),
  },
  (table) => ({
    docIdx: index('idx_events_document').on(table.documentId),
  })
);

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(), // Razão social
  tradeName: text('trade_name'), // Nome fantasia
  document: text('document'), // CNPJ/CPF - mantido para compatibilidade
  cnpj: text('cnpj'), // CNPJ normalizado (apenas dígitos)
  state: text('state'), // UF
  city: text('city'),
  // Regra de início da depreciação: MONTH_OF_ACQUISITION | NEXT_MONTH | PROPORTIONAL
  depreciationRule: text('depreciation_rule').default('PROPORTIONAL'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  parentId: text('parent_id'), // Self-referencing UUID for hierarchy
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => {
  return {
    parentIdx: index('idx_folders_parent').on(table.parentId),
  };
});

export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  folderId: text('folder_id').references(() => folders.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => {
  return {
    folderIdx: index('idx_batches_folder').on(table.folderId),
  };
});

export const importJobs = sqliteTable('import_jobs', {
  id: text('id').primaryKey(), // UUID
  status: text('status').notNull(), // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  totalFiles: integer('total_files').notNull().default(0),
  processedFiles: integer('processed_files').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(), // UUID
  type: text('type').$type<DocumentType>().notNull(),
  accessKey: text('access_key'),
  number: text('number'),
  series: text('series'),
  issueDate: integer('issue_date', { mode: 'timestamp' }),
  status: text('status').$type<DocumentStatus>().notNull(),
  
  issuerName: text('issuer_name'),
  issuerDocument: text('issuer_document'), // CNPJ/CPF
  
  recipientName: text('recipient_name'),
  recipientDocument: text('recipient_document'), // CNPJ/CPF
  
  totalAmount: real('total_amount'),
  billing: text('billing', { mode: 'json' }),
  
  rawXmlPath: text('raw_xml_path').notNull(),
  batchId: text('batch_id').references(() => folders.id, { onDelete: 'set null' }),
  importJobId: text('import_job_id').references(() => importJobs.id, { onDelete: 'set null' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => {
  return {
    batchIdx: index('idx_docs_batch').on(table.batchId),
    accessKeyIdx: index('idx_docs_access_key').on(table.accessKey),
    typeIdx: index('idx_docs_type').on(table.type),
    issuerIdx: index('idx_docs_issuer').on(table.issuerDocument),
    numberIdx: index('idx_docs_number').on(table.number),
  };
});

export const documentItems = sqliteTable('document_items', {
  id: text('id').primaryKey(), // UUID
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  code: text('code'),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
}, (table) => {
  return {
    docIdx: index('idx_items_document').on(table.documentId),
  };
});

export const documentTaxes = sqliteTable('document_taxes', {
  id: text('id').primaryKey(), // UUID
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  taxType: text('tax_type').notNull(), // 'ICMS', 'IPI', 'PIS', 'COFINS', 'ISS', etc.
  amount: real('amount').notNull(),
  base: real('base'),
}, (table) => {
  return {
    docIdx: index('idx_taxes_document').on(table.documentId),
  };
});

// --- Depreciação: Categorias, Bens e Controle ---

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  defaultRate: real('default_rate').notNull(), // % anual
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  companyIdx: index('idx_categories_company').on(table.companyId),
  nameIdx: index('idx_categories_name').on(table.name),
}));

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  supplier: text('supplier').notNull(),
  acquisitionDate: integer('acquisition_date', { mode: 'timestamp' }).notNull(),
  documentNumber: text('document_number').notNull(),
  description: text('description').notNull(),
  acquisitionValue: integer('acquisition_value').notNull(), // centavos
  ncm: text('ncm'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  categoryName: text('category_name'), // snapshot
  annualRate: real('annual_rate').notNull(), // % anual efetiva do bem
  status: text('status').notNull().default('ACTIVE'), // ACTIVE | DISPOSED
  disposedAt: integer('disposed_at', { mode: 'timestamp' }),
  disposedReason: text('disposed_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  companyIdx: index('idx_assets_company').on(table.companyId),
  categoryIdx: index('idx_assets_category').on(table.categoryId),
  dateIdx: index('idx_assets_date').on(table.acquisitionDate),
  statusIdx: index('idx_assets_status').on(table.status),
}));

export const depreciationEntries = sqliteTable('depreciation_entries', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  competence: text('competence').notNull(), // YYYY-MM
  depreciationValue: integer('depreciation_value').notNull(), // centavos do mês
  accumulatedValue: integer('accumulated_value').notNull(), // centavos acumulados até este mês
  currentValue: integer('current_value').notNull(), // centavos valor contábil
  exported: integer('exported', { mode: 'boolean' }).default(false).notNull(),
  exportedAt: integer('exported_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  assetIdx: index('idx_dep_asset').on(table.assetId),
  compIdx: index('idx_dep_competence').on(table.competence),
  uniq: index('idx_dep_asset_comp').on(table.assetId, table.competence),
}));

export const depreciationExports = sqliteTable('depreciation_exports', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  competence: text('competence').notNull(), // YYYY-MM
  filename: text('filename').notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
  totalValue: integer('total_value').notNull(), // centavos
  status: text('status').notNull().default('EXPORTED'), // EXPORTED
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull(),
}, (table) => ({
  companyIdx: index('idx_exports_company').on(table.companyId),
  compIdx: index('idx_exports_competence').on(table.competence),
  uniq: index('idx_exports_company_comp').on(table.companyId, table.competence),
}));

// --- Relations ---

export const companiesRelations = relations(companies, ({ many }) => ({
  categories: many(categories),
  assets: many(assets),
  exports: many(depreciationExports),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  company: one(companies, { fields: [categories.companyId], references: [companies.id] }),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  company: one(companies, { fields: [assets.companyId], references: [companies.id] }),
  category: one(categories, { fields: [assets.categoryId], references: [categories.id] }),
  entries: many(depreciationEntries),
}));

export const depreciationEntriesRelations = relations(depreciationEntries, ({ one }) => ({
  asset: one(assets, { fields: [depreciationEntries.assetId], references: [assets.id] }),
}));

export const depreciationExportsRelations = relations(depreciationExports, ({ one }) => ({
  company: one(companies, { fields: [depreciationExports.companyId], references: [companies.id] }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: 'folderHierarchy'
  }),
  children: many(folders, { relationName: 'folderHierarchy' }),
  documents: many(documents),
  batches: many(batches),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  folder: one(folders, {
    fields: [batches.folderId],
    references: [folders.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  folder: one(folders, {
    fields: [documents.batchId],
    references: [folders.id],
  }),
  batch: one(batches, {
    fields: [documents.batchId],
    references: [batches.id],
  }),
  importJob: one(importJobs, {
    fields: [documents.importJobId],
    references: [importJobs.id],
  }),
  items: many(documentItems),
  taxes: many(documentTaxes),
}));

export const documentItemsRelations = relations(documentItems, ({ one }) => ({
  document: one(documents, {
    fields: [documentItems.documentId],
    references: [documents.id],
  }),
}));

export const documentTaxesRelations = relations(documentTaxes, ({ one }) => ({
  document: one(documents, {
    fields: [documentTaxes.documentId],
    references: [documents.id],
  }),
}));

export const importJobsRelations = relations(importJobs, ({ many }) => ({
  documents: many(documents),
}));

