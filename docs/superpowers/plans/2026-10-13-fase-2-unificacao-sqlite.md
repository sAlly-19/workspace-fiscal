# Fase 2: Unificação do Banco de Dados SQLite (IMP-003, IMP-014, IMP-015) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar as camadas de persistência do Buscador e do Hub/Depreciação em um único banco físico SQLite (`workspace-fiscal.sqlite`) em modo WAL com driver nativo síncrono `libsql`, compartilhamento bidirecional de empresas por CNPJ (14 dígitos) com Dual-ID (`numeric_id` / `id`), segregação entre `documents` (NFView) e `buscador_documents` (SEFAZ), e backups atômicos com `VACUUM INTO`, manifesto SHA-256 e `PRAGMA integrity_check`.

**Architecture:** Substituição do motor WebAssembly `sql.js` no `DatabaseManager` pelo driver síncrono nativo `libsql` mantendo 100% dos contratos públicos de repositórios; consolidação dos caminhos de banco no `resolveDbPath()`; introdução de `numeric_id` autoincrementado com trigger em `companies` para suportar tanto IDs textuais da Depreciação quanto numéricos do Buscador; resolução da colisão de tabelas através de `buscador_documents`; e migração do `createSafetyBackup` para `VACUUM INTO` com deleção prévia de arquivo existente e manifesto com checksums SHA-256.

**Tech Stack:** Node.js, Electron 33, `libsql` (nativo síncrono), `@libsql/client` (Drizzle ORM), SQLite (WAL mode), AdmZip, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-fase-2-unificacao-sqlite-design.md`

## Global Constraints
- Zero quebra de contratos públicos em `src/api/repositories/` e `src/core/buscador/database/repositories/`.
- 100% de compatibilidade e aprovação em todas as 57 suítes (357 testes) existentes.
- Modo WAL ativo com `PRAGMA busy_timeout = 5000` e `PRAGMA foreign_keys = ON`.
- `VACUUM INTO` não pode falhar por arquivo existente (remover destino antes do comando).
- `numeric_id` em `companies` deve ser preenchido de forma determinística e única.

## Review Focus
1. Concorrência e bloqueio: verificar se `DatabaseManager` e `@libsql/client` podem ler/escrever no mesmo arquivo simultaneamente sem travar (`PRAGMA busy_timeout = 5000`).
2. Foreign Keys com Dual-ID: verificar se tabelas filhas do Buscador (`certificates`, `distribution_state`, etc.) associam corretamente a `companies(numeric_id)` mesmo com `companies.id` sendo textual.
3. Deduplicação por CNPJ: verificar se uma empresa criada com CNPJ formatado ou não formatado é unificada no mesmo registro de 14 dígitos.
4. Falha de `VACUUM INTO`: verificar que se o arquivo de destino já existir em disco, ele é excluído previamente para evitar erro `SQLITE_ERROR: destination database already exists`.
5. Integridade no Restore: verificar que restores inválidos ou corrompidos falham no `PRAGMA integrity_check` e revertem sem deixar lixo no banco ativo.

---

### Task 1: Engine de Banco de Dados — Libsql Síncrono no `DatabaseManager` (IMP-003)

**Files:**
- Modify: `src/core/buscador/database/connection.ts`
- Test: `src/core/buscador/database/migration-v3.test.ts`
- Test: `src/core/buscador/database/repositories/nfse-repositories.test.ts`

**Interfaces:**
- Produces: `DatabaseManager` operando sobre `libsql` nativo, com métodos síncronos `queryAll<T>(sql, params): T[]`, `queryOne<T>(sql, params): T | null`, `execute(sql, params): { changes: number; lastInsertRowid: number }`, `transaction<T>(cb): T`, `close(): void`. Pragmas: `WAL`, `foreign_keys = ON`, `busy_timeout = 5000`.

- [ ] **Step 1: Escrever teste de regressão e concorrência para o DatabaseManager nativo**
Criar `src/core/buscador/database/connection.test.ts` validando que `DatabaseManager.create()` inicializa com `libsql`, executa transações com rollback automático em caso de erro, aplica pragmas WAL e `foreign_keys = ON`, e persiste diretamente sem `db.export()`.

- [ ] **Step 2: Executar teste para verificar falha (RED)**
Run: `npm.cmd test -- src/core/buscador/database/connection.test.ts`
Expected: FAIL se `connection.test.ts` apontar comportamento do novo driver.

- [ ] **Step 3: Implementar `DatabaseManager` usando driver síncrono `libsql` em `src/core/buscador/database/connection.ts`**
Substituir a dependência `sql.js` por `require('libsql')`. Implementar:
- `constructor(dbPath)` com `new (require('libsql'))(dbPath)`.
- `queryAll`: `this.db.prepare(sql).all(...params)`.
- `queryOne`: `this.db.prepare(sql).get(...params) ?? null`.
- `execute`: `const res = this.db.prepare(sql).run(...params); return { changes: res.changes, lastInsertRowid: Number(res.lastInsertRowid) };`.
- `transaction`: `this.db.transaction(callback)()`.
- Configurar pragmas no boot: `WAL`, `busy_timeout = 5000`, `foreign_keys = ON`, `synchronous = NORMAL`.

- [ ] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/core/buscador/database/connection.test.ts src/core/buscador/database/migration-v3.test.ts src/core/buscador/database/repositories/nfse-repositories.test.ts`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit local da Task 1**
Commit: `feat(db): replace sql.js with synchronous native libsql in DatabaseManager`

---

### Task 2: Schema Unificado, Dual-ID em `companies` e Segregação `buscador_documents` (IMP-003, IMP-015)

**Files:**
- Modify: `src/db/db-schema-init.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/core/buscador/database/schema.ts`
- Modify: `src/core/buscador/database/repositories/CompanyRepository.ts`
- Modify: `src/core/buscador/database/repositories/DocumentRepository.ts`
- Modify: `src/core/buscador/database/repositories/DistributionStateRepository.ts`
- Modify: `src/core/buscador/database/repositories/CertificateRepository.ts`
- Modify: `src/core/buscador/database/repositories/NfseEventRepository.ts`
- Modify: `src/api/repositories/companies.repository.ts`
- Test: `src/api/repositories/companies.repository.test.ts`
- Test: `src/core/buscador/database/CompanyRepository.test.ts`

**Interfaces:**
- Consumes: `DatabaseManager` com `libsql`.
- Produces:
  - Tabela `companies` com `id TEXT PRIMARY KEY`, `numeric_id INTEGER UNIQUE`, `cnpj TEXT UNIQUE`, trigger `trg_companies_numeric_id`.
  - Tabela `buscador_documents` para captura SEFAZ/NSU isolada de `documents`.
  - `CompaniesRepository.create` e `CompanyRepository.create` deduplicando e compartilhando empresas por CNPJ de 14 dígitos.

- [x] **Step 1: Escrever testes unitários de deduplicação e Dual-ID de empresas (RED)**
Criar `src/api/repositories/companies.repository.test.ts` testando:
1. Criação de empresa na Depreciação com CNPJ formatado gera `numeric_id` e normaliza CNPJ para 14 dígitos.
2. Inserção de empresa existente por CNPJ atualiza dados sem duplicar.
3. Leitura por `id` textual ou numérico funciona.
Criar `src/core/buscador/database/CompanyRepository.test.ts` testando:
1. Criação no Buscador popula `numeric_id` e `id`.
2. `findById(numericId)` recupera a empresa com `id: number`.
3. Empresa criada na Depreciação é encontrada pelo Buscador via `findByCNPJ`.

- [x] **Step 2: Executar testes para verificar falha (RED)**
Run: `npm.cmd test -- src/api/repositories/companies.repository.test.ts src/core/buscador/database/CompanyRepository.test.ts`
Expected: FAIL (métodos e colunas ainda não integrados).

- [x] **Step 3: Atualizar DDL e Migrações em `src/db/db-schema-init.ts` e `src/core/buscador/database/schema.ts`**
1. Em `src/db/db-schema-init.ts`:
   - Adicionar colunas em `companies`: `numeric_id`, `uf`, `folder_path`, `is_active`.
   - Adicionar trigger `trg_companies_numeric_id` para garantir geração sequencial de `numeric_id` quando nulo.
   - Criar tabela `buscador_documents` com as colunas SEFAZ/NSU e constraints de unicidade `(company_id, document_type, environment, access_key)`.
   - Criar tabelas do Buscador no banco principal: `certificates`, `distribution_state`, `nfse_events`, `query_history`, `download_history`, `app_settings`.
2. Em `src/core/buscador/database/repositories/`:
   - `DocumentRepository.ts`: Alterar referências de `documents` para `buscador_documents`.
   - Apontar FKs das tabelas do Buscador para `companies(numeric_id)`.
   - `CompanyRepository.ts`: Mapear `numeric_id` para `id: number`.
   - `companies.repository.ts`: Garantir geração de `numeric_id`, deduplicação por CNPJ de 14 dígitos e retorno harmonizado.

- [x] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/api/repositories/companies.repository.test.ts src/core/buscador/database/CompanyRepository.test.ts src/core/buscador/database/repositories/nfse-repositories.test.ts`
Expected: PASS com 100% de sucesso.

- [x] **Step 5: Commit local da Task 2**
Commit: `feat(db): unify companies schema with dual-id, deduplication and buscador_documents segregation`

---

### Task 3: Unificação de Caminhos e Migração Idempotente de Legado (`fiscal_storage.db`) (IMP-003)

**Files:**
- Create: `src/db/legacy-buscador-migration.ts`
- Create: `src/db/legacy-buscador-migration.test.ts`
- Modify: `electron/buscador/services.ts`
- Modify: `src/db/db-paths.ts`

**Interfaces:**
- Consumes: `resolveDbPath()` de `src/db/db-paths.ts`.
- Produces: `migrateLegacyBuscadorDatabase(legacyPath, targetPath): Promise<boolean>` que executa migração segura e renomeia o arquivo legado para `.bak`.

- [x] **Step 1: Escrever teste para a migração de banco legado do Buscador (RED)**
Criar `src/db/legacy-buscador-migration.test.ts` gerando um banco legado simulado `fiscal_storage.db` com empresas, certificados, NSUs e documentos, e afirmando que após a migração:
1. Os dados foram incorporados em `workspace-fiscal.sqlite`.
2. O arquivo legado foi renomeado para `fiscal_storage.db.migrated.<ts>.bak`.
3. Execuções subsequentes são no-ops idempotentes.

- [x] **Step 2: Executar teste para verificar falha (RED)**
Run: `npm.cmd test -- src/db/legacy-buscador-migration.test.ts`
Expected: FAIL (módulo ainda não existe).

- [x] **Step 3: Implementar `legacy-buscador-migration.ts` e integrar em `electron/buscador/services.ts`**
1. Implementar a rotina em `src/db/legacy-buscador-migration.ts` lendo tabelas legadas com `PRAGMA integrity_check` e inserindo em `companies` (com deduplicação por CNPJ), `certificates`, `distribution_state`, `buscador_documents`, `nfse_events` e `app_settings`.
2. Em `electron/buscador/services.ts`, chamar `migrateLegacyBuscadorDatabase` e passar `resolveDbPath()` para `getDatabase()`.

- [x] **Step 4: Executar teste para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/db/legacy-buscador-migration.test.ts`
Expected: PASS com 100% de sucesso.

- [x] **Step 5: Commit local da Task 3**
Commit: `feat(buscador): unify sqlite path and add idempotent legacy migration`

---

### Task 4: Backup Atômico com `VACUUM INTO` e Manifesto com SHA-256 (IMP-014)

**Files:**
- Modify: `src/api/services/backup/backup-creator.ts`
- Modify: `src/api/services/backup/backup.types.ts`
- Test: `src/api/services/backup.service.test.ts`

**Interfaces:**
- Produces: `createSafetyBackup` usando `VACUUM INTO` com deleção de arquivo prévio; `createBackup` gerando `checksums: Record<string, string>` no `manifest.json`.

- [ ] **Step 1: Escrever teste para snapshot `VACUUM INTO` e SHA-256 no manifesto (RED)**
Adicionar testes em `src/api/services/backup.service.test.ts`:
1. `createSafetyBackup` gera snapshot válido com `PRAGMA integrity_check = 'ok'` mesmo se o arquivo de destino já existir antes da execução.
2. `createBackup` inclui bloco `checksums` no manifesto com hashes SHA-256 válidos.

- [ ] **Step 2: Executar teste para verificar falha (RED)**
Run: `npm.cmd test -- src/api/services/backup.service.test.ts`
Expected: FAIL (comportamento atual usa `fs.copyFile` e não inclui `checksums`).

- [ ] **Step 3: Implementar `VACUUM INTO` e checksums SHA-256 em `backup-creator.ts`**
1. Em `createSafetyBackup`:
   - Checar se o destino existe: `if (existsSync(rawBackupPath)) await fs.unlink(rawBackupPath);`.
   - Executar `await rawClient.execute({ sql: 'VACUUM INTO ?', args: [rawBackupPath] });`.
2. Em `createBackup`:
   - Calcular `crypto.createHash('sha256').update(content).digest('hex')` para cada arquivo adicionado ao ZIP.
   - Adicionar o mapa `checksums` no `BackupManifest`.

- [ ] **Step 4: Executar teste para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/api/services/backup.service.test.ts`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit local da Task 4**
Commit: `feat(backup): atomic WAL snapshot via VACUUM INTO and SHA-256 manifest integrity`

---

### Task 5: Restauração Segura, Validação de Checksums e Integridade (IMP-014)

**Files:**
- Modify: `src/api/services/backup/backup-inspector.ts`
- Modify: `src/api/services/backup/backup-restorer.ts`
- Test: `src/api/services/backup.service.test.ts`
- Test: `src/api/services/backup/backup-modules.test.ts`

**Interfaces:**
- Consumes: Manifestos com `checksums`, snapshots `VACUUM INTO`.
- Produces: `inspectBackup` e `restoreBackup` validando integridade SHA-256, `PRAGMA integrity_check` e `PRAGMA wal_checkpoint(TRUNCATE)`.

- [ ] **Step 1: Escrever teste para rejeição de backups corrompidos ou com hash divergente (RED)**
Adicionar testes em `src/api/services/backup.service.test.ts` validando que se o arquivo `.wfb` tiver seu conteúdo adulterado (hash SHA-256 inválido) ou o arquivo SQLite estiver corrompido, `inspectBackup` e `restoreBackup` abortam com erro claro e não tocam nos dados ativos.

- [ ] **Step 2: Executar teste para verificar falha (RED)**
Run: `npm.cmd test -- src/api/services/backup.service.test.ts`
Expected: FAIL (validação de checksum ainda não estava ativa).

- [ ] **Step 3: Implementar validação de SHA-256 e `integrity_check` em `backup-inspector.ts` e `backup-restorer.ts`**
1. Em `backup-inspector.ts`:
   - Validar `checksums` no manifesto de arquivos `.wfb`.
   - Executar `PRAGMA integrity_check` em SQLite legado.
2. Em `backup-restorer.ts`:
   - Executar `createSafetyBackup` com `VACUUM INTO` antes de alterar qualquer dado.
   - Executar `PRAGMA wal_checkpoint(TRUNCATE);` antes e depois da restauração.
   - Executar `PRAGMA integrity_check;` no banco restaurado.

- [ ] **Step 4: Executar teste para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/api/services/backup.service.test.ts src/api/services/backup/backup-modules.test.ts`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit local da Task 5**
Commit: `feat(backup): enforce SHA-256 verification and atomic wal checkpointing on restore`

---

### Task 6: Verificação de Não-Regressão Completa, Lint e Build

**Files:**
- Test: Suíte completa do repositório (`npm test`)
- Verify: `npm run lint`
- Verify: `npm run build`

- [ ] **Step 1: Executar suíte completa de testes**
Run: `npm.cmd test`
Expected: Todas as suítes passam sem erros (100% PASS).

- [ ] **Step 2: Executar checagem de tipos e lint**
Run: `npm.cmd run lint`
Expected: 0 erros de TypeScript nos projetos web e electron.

- [ ] **Step 3: Executar build web e build electron**
Run: `npm.cmd run build`
Expected: Builds concluídos com sucesso sem erros.

- [ ] **Step 4: Commit local da Task 6**
Commit: `chore: complete phase 2 sqlite unification verification and build validation`

