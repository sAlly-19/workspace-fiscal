# Fase 2: Unificação do Banco de Dados SQLite (IMP-003, IMP-014 e IMP-015) — Especificação de Design

- **Data**: 2026-10-13
- **Status**: Proposta para Validação (Planejamento Arquitetural)
- **Escopo**: IMP-003 (Conexão e Schema Unificados + WAL), IMP-014 (Backup e Restore Atômicos), IMP-015 (Sincronização e Deduplicação de Empresas)
- **Restrições**: Zero quebra de contratos públicos em `src/api/repositories/` e `src/core/buscador/database/repositories/`; 100% de compatibilidade com as 57 suítes (357 testes) existentes; suporte integral a Windows/Electron e desenvolvimento Vite.

---

## 1. Diagnóstico da Bifurcação Atual

A auditoria arquitetural identificou uma bifurcação crítica de persistência no repositório:
1. **Camada Hub / NFView / Depreciação (`src/db/`)**:
   - Utiliza `@libsql/client` com Drizzle ORM conectando-se a `workspace-fiscal.sqlite` (ou `sqlite.db` em dev/testes).
   - Ativa pragmas `WAL`, `synchronous`, `busy_timeout = 5000` e `foreign_keys = ON`.
   - Gerencia tabelas: `companies` (id UUID string), `folders`, `batches`, `import_jobs`, `documents`, `document_items`, `document_taxes`, `document_events`, `categories`, `assets`, `depreciation_entries`, `depreciation_exports`, `application_settings`, `activity_logs`.
2. **Camada Buscador SEFAZ / NFS-e (`src/core/buscador/database/`)**:
   - Utiliza `DatabaseManager` baseado em `sql.js` (WebAssembly SQLite in-memory).
   - Lê e sobrescreve um arquivo separado em disco (`fiscal_storage.db`) via `fs.readFileSync` e `fs.writeFileSync(dbPath, db.export())` em cada query/transação.
   - Gerencia tabelas: `companies` (id integer autoincrement), `certificates`, `distribution_state`, `documents` (com colunas e regras de conflito SEFAZ/NSU), `nfse_events`, `query_history`, `download_history`, `app_settings`.
3. **Riscos e Dívidas Resultantes**:
   - Se os dois módulos tentassem acessar o mesmo arquivo usando `sql.js`, a escrita via `fs.writeFileSync(db.export())` destruiria o arquivo WAL do `@libsql/client` e causaria corrupção imediata.
   - Empresas cadastradas no Buscador não aparecem na Depreciação, e vice-versa.
   - Ambas as camadas possuem uma tabela denominada exatamente `documents`, com modelos de dados e finalidades divergentes.
   - Backups de emergência utilizavam cópia bruta de arquivo (`fs.copyFile`) que não garante consistência em modo WAL se houver transações pendentes no log `-wal`.

---

## 2. IMP-003: Conexão e Schema Unificados com WAL

### 2.1. Arquitetura do Engine de Banco de Dados
Para unificar o banco físico em `workspace-fiscal.sqlite` sem quebrar as assinaturas síncronas dos repositórios do Buscador nem a camada assíncrona do Drizzle ORM:
- **Descoberta Técnica**: O pacote `libsql` (fornecido nativamente pelo `@libsql/client` já instalado no projeto) possui uma classe síncrona `Database` (`new (require('libsql'))(dbPath)`), que suporta a mesma API do `better-sqlite3` (`prepare`, `all`, `get`, `run`, `transaction`, `pragma`, `backup`) e roda perfeitamente em Node.js e no Electron 33.
- **Substituição em `DatabaseManager`**:
  - Eliminar o motor WebAssembly `sql.js` e a rotina de reescrita total `fs.writeFileSync(this.db.export())`.
  - O `DatabaseManager` passa a encapsular a instância nativa síncrona do `libsql`, conectando-se diretamente ao arquivo SQLite físico unificado (`workspace-fiscal.sqlite`).
  - As assinaturas de `queryAll<T>()`, `queryOne<T>()`, `execute()` e `transaction<T>()` são 100% preservadas, mantendo todas as chamadas síncronas existentes nos repositórios do Buscador.
- **Configuração de Pragmas Compartilhados**:
  Ambas as pontas de conexão (`src/db/db-client.ts` e `DatabaseManager`) aplicam deterministicamente:
  ```sql
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;
  ```
- **Resolução Unificada do Arquivo**:
  - `electron/buscador/services.ts` deixa de apontar para `fiscal_storage.db` e passa a utilizar `resolveDbPath()` de `src/db/db-paths.ts`.
  - Ambos os processos (Electron Main / IPC e Express API) operam sobre o mesmo arquivo físico `workspace-fiscal.sqlite` em `%APPDATA%\workspace-fiscal` (ou `sqlite.db` em dev).

### 2.2. Migração Idempotente do Banco Legado do Buscador (`fiscal_storage.db`)
Caso um usuário já possua dados legados no arquivo separado `fiscal_storage.db`:
1. Uma rotina de migração (`migrateBuscadorLegacyDatabase`) é executada no startup do Electron antes de inicializar os serviços do Buscador.
2. Se `fiscal_storage.db` existir:
   - Abre o banco legado em modo somente-leitura.
   - Verifica `PRAGMA integrity_check`. Se íntegro:
     - Migra empresas não existentes (por CNPJ normalizado).
     - Migra certificados digitais vinculados.
     - Migra estados de distribuição (`distribution_state`).
     - Migra documentos capturados para `buscador_documents`.
     - Migra eventos NFS-e (`nfse_events`).
     - Migra histórico de consultas e downloads.
     - Migra configurações da aplicação (`app_settings`).
   - Executa `VACUUM` e renomeia o arquivo legado para `fiscal_storage.db.migrated.<timestamp>.bak` (garantindo idempotência e preservando histórico de segurança).

---

## 3. Resolução Arquitetural das Tabelas `documents`

### 3.1. Análise do Conflito de Nomes
No repositório existem dois domínios distintos de documentos:
- **NFView / Workspace**: Documentos importados via sistema de arquivos local, associados a pastas (`folders`), lotes (`batches`), jobs de importação (`import_jobs`), com quebra relacional de itens (`document_items`) e tributos (`document_taxes`). Identificador UUID string.
- **Buscador SEFAZ / NFS-e**: Documentos fiscais capturados eletronicamente via WebServices (SEFAZ / ADN / Sefin), com controle de NSU (`nsu`), ambiente (`homologation`/`production`), origem (`origin`), status de XML/PDF e uma regra crítica de concorrência com 80 linhas de SQL (`ON CONFLICT(company_id, document_type, environment, access_key) DO UPDATE SET ...`) para mesclar resumos e notas completas.

### 3.2. Trade-Off e Decisão Arquitetural: Coexistência por Domínio
Fundir as duas tabelas em uma única tabela com dezenas de colunas nulas traria alto risco de corrupção de regras fiscais e quebraria queries do Drizzle ORM ou do motor SEFAZ.

**Decisão Proposta**:
1. Manter a tabela `documents` para o módulo NFView / Workspace (gerenciada via Drizzle ORM em `src/db/schema.ts`).
2. Consolidar os documentos do Buscador na tabela `buscador_documents` no mesmo banco físico SQLite.
3. Atualizar as queries internas de `DocumentRepository.ts` e `schema.ts` do Buscador para operar sobre `buscador_documents`.
4. Os métodos públicos do `DocumentRepository` (`upsert`, `findById`, `findByAccessKey`, `search`) mantêm rigorosamente os mesmos contratos e tipos `FiscalDocument`, sem impacto para os chamadores IPC ou services.
5. As chaves estrangeiras em `nfse_events` e `download_history` passam a referenciar `buscador_documents(id)`.

---

## 4. IMP-015: Sincronização e Deduplicação de Empresas (`companies`)

### 4.1. Unificação do Cadastro por CNPJ Canônico (14 dígitos)
A tabela `companies` passa a ser a **fonte única da verdade** para empresas em todo o sistema.

**Estrutura da Tabela Unificada `companies`**:
```sql
CREATE TABLE IF NOT EXISTS "companies" (
  "id" TEXT PRIMARY KEY NOT NULL,             -- UUID canônico ou identificador string
  "numeric_id" INTEGER UNIQUE,                -- Identificador numérico autoincrementado para o Buscador
  "name" TEXT NOT NULL,                       -- Razão social
  "trade_name" TEXT,                          -- Nome fantasia
  "document" TEXT,                            -- Documento formatado original
  "cnpj" TEXT UNIQUE,                         -- CNPJ normalizado com exatos 14 dígitos numéricos
  "uf" TEXT DEFAULT '35',                     -- Código IBGE ou sigla UF (usado pelo Buscador)
  "state" TEXT,                               -- Sigla UF (usada pela Depreciação)
  "city" TEXT,                                -- Município
  "folder_path" TEXT,                         -- Pasta padrão vinculada à empresa no Buscador
  "is_active" INTEGER DEFAULT 0 NOT NULL,     -- Marcação de empresa ativa no Buscador
  "depreciation_rule" TEXT DEFAULT 'PROPORTIONAL', -- Regra contábil de depreciação
  "created_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  "updated_at" INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);
```

### 4.2. Estratégia de Identificadores (Dual-ID Transparente)
- **Depreciação**: Continua utilizando `id: string` (UUID). Rotas HTTP `/api/companies` retornam `id: string`.
- **Buscador**: Continua utilizando `id: number` via `numeric_id` (ou fallback numérico derivado). Em todas as queries do Buscador (`CompanyRepository`), `SELECT numeric_id as id, ...` garante que `Company.id` continue sendo `number`, satisfazendo `requirePositiveInteger`.
- **Chaves Estrangeiras**:
  - As tabelas da Depreciação (`assets`, `categories`, `depreciation_exports`) referenciam `companies(id)`.
  - As tabelas do Buscador (`certificates`, `distribution_state`, `buscador_documents`, `nfse_events`, `query_history`) referenciam `companies(numeric_id)` (ou `companies(id)` via coerção numérica SQLite).

### 4.3. Deduplicação e Compartilhamento Automático
- Sempre que uma empresa for criada na Depreciação (`companies.repository.ts`) ou no Buscador (`CompanyRepository.ts`):
  1. O CNPJ fornecido é sanitizado para 14 dígitos numéricos (`cleanCnpj = cnpj.replace(/\D/g, '')`).
  2. O repositório verifica se já existe uma empresa com esse `cnpj`.
  3. Se existir: atualiza os campos complementares (`name`, `uf`/`state`, `trade_name`, `folder_path`, etc.) sem gerar duplicata, retornando o registro unificado.
  4. Se não existir: gera novo UUID para `id`, novo `numeric_id` sequencial, e insere o registro.
- **Resultado de Negócio**: Cadastrar uma empresa na tela de Depreciação a disponibiliza instantaneamente no Buscador para consulta SEFAZ/NFS-e; cadastrar no Buscador a disponibiliza instantaneamente na Depreciação para controle patrimonial.

---

## 5. IMP-014: Backup e Restore Atômicos em Modo WAL

### 5.1. Eliminação de Cópia Bruta de Arquivo via `VACUUM INTO`
- **Problema Atual**: `createSafetyBackup` realizava `await fs.copyFile(DB_PATH, rawBackupPath)`. Em SQLite no modo WAL, copiar o arquivo principal sem os arquivos `-wal` e `-shm` ativos pode capturar um estado transacional incompleto ou gerar um arquivo corrompido ao ser aberto isoladamente.
- **Solução com `VACUUM INTO`**:
  - `backup-creator.ts` passa a invocar a instrução nativa do SQLite:
    ```sql
    VACUUM INTO ?;
    ```
  - O SQLite gera um arquivo de banco de dados totalmente compactado, transacionalmente perfeito e sem dependência de arquivos `-wal`, mesmo enquanto outras leituras ou escritas estão ocorrendo no processo.

### 5.2. Manifesto de Integridade com Checksum SHA-256
- Ao gerar um arquivo `.wfb` (formato ZIP padrão do sistema):
  1. O payload de cada módulo (`data/depreciation.json`, `data/nf_view.json`, `data/settings.json`, e cada arquivo XML em `storage/documents/`) tem seu hash SHA-256 calculado.
  2. O `manifest.json` passa a incluir o bloco `checksums`:
     ```json
     {
       "format": "workspace-fiscal-backup",
       "formatVersion": "2.0",
       "appVersion": "3.5.1",
       "createdAt": "2026-10-13T18:00:00.000Z",
       "modules": ["NF_VIEW", "DEPRECIATION", "SETTINGS"],
       "checksums": {
         "data/depreciation.json": "sha256:...",
         "data/nf_view.json": "sha256:...",
         "data/settings.json": "sha256:..."
       },
       "stats": { ... }
     }
     ```

### 5.3. Inspeção e Restauração Seguras com `PRAGMA integrity_check`
- **Em `backup-inspector.ts`**:
  - Para arquivos legados `.db` / SQLite: abre conexão temporária e executa `PRAGMA integrity_check;`. Rejeita qualquer arquivo que não retorne `ok`.
  - Para pacotes `.wfb`: verifica se o manifesto possui hashes válidos e confere os hashes das entradas no arquivo ZIP antes de declarar o backup válido.
- **Em `backup-restorer.ts`**:
  - Antes de qualquer alteração, executa `createSafetyBackup` utilizando `VACUUM INTO`.
  - Antes de iniciar a restauração, executa `PRAGMA wal_checkpoint(TRUNCATE);` para garantir que o log de WAL esteja limpo.
  - Para arquivos legados SQLite: após a substituição do arquivo, executa `reconfigureDatabase(DB_PATH)` e `PRAGMA integrity_check;`. Caso falhe, reverte imediatamente para o backup de segurança.
  - Para arquivos `.wfb`: executa a restauração dentro de uma transação explícita `BEGIN IMMEDIATE TRANSACTION;`, finalizando com `COMMIT;` e `PRAGMA wal_checkpoint(TRUNCATE);`.

---

## 6. Matriz de Impacto e Não-Regressão

| Componente | Modificação | Risco | Mitigação |
|---|---|---|---|
| `DatabaseManager` | Migração de `sql.js` para `libsql` nativo síncrono | Baixo | `libsql` já está instalado e verificado em Electron 33 e Node 20+. Assinaturas síncronas 100% preservadas. |
| Repositórios Buscador | Queries direcionadas a `buscador_documents` e `companies` com `numeric_id` | Médio | Testes unitários dedicados em `migration-v3.test.ts` e `nfse-repositories.test.ts`. |
| `CompaniesRepository` (API) | Deduplicação por CNPJ de 14 dígitos e suporte a `numeric_id` | Baixo | Contrato `id: string` mantido para o frontend; compatibilidade total com testes existentes. |
| `backup-creator.ts` | Uso de `VACUUM INTO` e SHA-256 no manifesto | Muito Baixo | Garante snapshots válidos em WAL sem bloquear transações. |
| `backup-restorer.ts` | `integrity_check` mandatória e checkpoint TRUNCATE | Muito Baixo | Elimina falsos sucessos em arquivos corrompidos. |

---

## 7. Critérios de Aceite para Aprovação

1. O comando `npm test` deve passar com 100% de sucesso nas 57 suítes existentes.
2. Nenhuma tabela duplicada ou arquivo `.db` bifurcado em execução normal.
3. Uma empresa criada via IPC do Buscador é listada em `GET /api/companies` e pode receber ativos na Depreciação.
4. Uma empresa criada via `POST /api/companies` na Depreciação é listada em `companies:list` no Buscador e pode associar certificados digitais.
5. Backups gerados em `.wfb` contêm checksums SHA-256 e passam pela verificação de integridade no inspetor e no restaurador.

