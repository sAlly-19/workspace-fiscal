# Relatório 02: Catálogo de Bugs, Problemas e Dívidas Técnicas (Consolidado v3.5.2)

**Projeto:** `workspace-fiscal`  
**Versão:** v3.5.2  
**Status Geral:** Todos os 6 Problemas Estruturais e 9 Itens de Hardening estão **RESOLVIDOS** e **HOMOLOGADOS**.

---

## 1. Resumo do Status dos Problemas Confirmados

| ID | Título | Severidade Original | Status v3.5.2 | Evidência de Resolução |
| :--- | :--- | :--- | :--- | :--- |
| **PROB-01** | Bifurcação de Bancos de Dados SQLite | Crítica | **RESOLVIDO** | Banco único `workspace-fiscal.sqlite`, Drizzle ORM, WAL ativo, migração legado automática em `src/db/legacy-buscador-migration.ts`. |
| **PROB-02** | Duplicação de Parsers Fiscais XML | Alta | **RESOLVIDO** | Parsers unificados em `src/core/parsers/`, detector unificado, suporte a RTC 2026 e guarda de 25 MB (IMP-T02). |
| **PROB-03** | Duplicação de Motores de Layout DANFE | Média | **RESOLVIDO** | ViewModels compartilhados em `src/core/danfe/view-models/`, escape XSS rigoroso e paridade visual entre tela e impressão. |
| **PROB-04** | Hibridismo de Transporte (HTTP vs. IPC) | Alta | **RESOLVIDO** | Handshake de segurança via `X-Workspace-Token` em `src/api/middleware/localAuth.ts`, porta dinâmica e fallback transparente. |
| **PROB-05** | Dependência Frágil de Processos PowerShell | Alta | **RESOLVIDO** | Streaming em memória via `stdin` em `windows-bridge.ps1`, zero arquivos temporários em disco. |
| **PROB-06** | Ausência de Manifestação SEFAZ Automática | Alta | **RESOLVIDO** | Emissão automática de Ciência da Operação (210210) e busca subsequente do `procNFe` completo. |

---

## 2. Detalhamento das Resoluções Estruturais

### PROB-01: Resolução da Bifurcação de Bancos de Dados SQLite
- **Diagnóstico:** Havia duas instâncias de SQLite (`workspace-fiscal.sqlite` e `fiscal_storage.db`).
- **Implementação Realizada:** O Drizzle ORM passou a gerenciar um schema único centralizado (`src/db/schema.ts`), contemplando tabelas de empresas (`companies`), documentos (`documents`), impostos (`document_taxes`), eventos (`document_events`), ativo imobilizado (`assets`), certificados (`certificates`), estado de distribuição (`distribution_state`) e documentos do buscador (`buscador_documents`).
- **Resiliência e Migração:** Criado o serviço `src/db/legacy-buscador-migration.ts` que identifica bancos legados de versões anteriores e executa a transposição atômica de dados sem perda de registros. Modo WAL (`journal_mode = WAL`) e `busy_timeout = 5000` ativados por padrão.
- **Testes de Validação:** `src/db/db-modules.test.ts`, `src/db/legacy-buscador-migration.test.ts`, `CompanyRepository.test.ts`.

### PROB-02: Resolução da Duplicação de Parsers Fiscais
- **Diagnóstico:** Parsers XML duplicados entre NFView e Buscador Fiscal.
- **Implementação Realizada:** Módulo único em `src/core/parsers/` (`nfe.parser.ts`, `cte.parser.ts`, `nfse.parser.ts`), utilizando `fast-xml-parser` de forma padronizada. Foi adicionada a guarda defensiva contra ataques de exaustão de memória XML (limite de 25 MB por XML em `BaseParser.parseXml` - IMP-T02) e o parser utilitário de tributos da Reforma Tributária 2026 (`rtc-taxes.utils.ts`).
- **Testes de Validação:** `src/core/parsers/parsers.test.ts`, `src/core/parsers/detector.test.ts`.

### PROB-03: Resolução da Duplicação de Motores de Layout DANFE/DACTE
- **Diagnóstico:** Divergências visuais e lógicas entre renderizadores estáticos HTML e telas interativas React.
- **Implementação Realizada:** Camada centralizada de ViewModels (`src/core/danfe/view-models/`) desacoplada da camada de apresentação, combinada com sanitização preventiva contra injeções de HTML/XSS em chaves e campos textuais (`escapeHtml.ts`).
- **Testes de Validação:** `src/core/danfe/danfe-xss.test.ts`, `src/web/features/documents/preview/document-search.test.ts`.

### PROB-04: Blindagem do Transporte HTTP Local
- **Diagnóstico:** API Express exposta em porta local sem autenticação, com risco de invasão por outros processos do SO.
- **Implementação Realizada:** Implementado o middleware `src/api/middleware/localAuth.ts`, gerando no ciclo de vida do Electron um token criptográfico (`X-Workspace-Token`) injetado via IPC no frontend e exigido em todas as rotas da API REST. Adicionalmente, todas as rotas principais (workspace, documents, settings) receberam validadores tipados com retorno HTTP 400 padronizado (`{ error, details }` - IMP-T03).
- **Testes de Validação:** `src/api/routes/validation-routes.test.ts`, `src/api/validators/validators.test.ts`.

### PROB-05: Eliminação de Arquivos Temporários na Ponte mTLS
- **Diagnóstico:** O script PowerShell criava arquivos em `%TEMP%` para entrada e saída de dados.
- **Implementação Realizada:** A comunicação com o runtime do PowerShell foi migrada para canal `stdin` em memória, enviando o envelope JSON criptografado/estruturado e recebendo a resposta via `stdout`, sem nunca tocar o disco rígido, eliminando falsos-positivos em antivírus/EDR.
- **Testes de Validação:** `src/core/buscador/certificates/` e testes de integração do Buscador.

### PROB-06: Manifestação do Destinatário SEFAZ Automática
- **Diagnóstico:** Documentos da SEFAZ eram retidos em resumo sem download de XML completo.
- **Implementação Realizada:** A engine de distribuição (`DistributionEngine.ts`) detecta payloads do tipo `resNFe` e dispara automaticamente o evento de Ciência da Operação (`210210`), requisitando em seguida o pacote `procNFe` completo.
- **Testes de Validação:** `OfficialNfseWireContract.test.ts`, `BuscadorModals.test.ts`.

---

## 3. Resolução dos Itens de Hardening Pós-Auditoria (IMP-T01 a IMP-T09)

1. **IMP-T01 (Gzip Bomb Guard):** Parâmetro `{ maxOutputLength: 15 * 1024 * 1024 }` em `decompressDocZip` (`src/core/buscador/fiscal/utils/compression.ts`) bloqueando payloads descompactados maiores que 15 MB. Validado em `compression.test.ts`.
2. **IMP-T02 (XML Bomb Guard):** Guarda de 25 MB em `parseXml` (`src/core/parsers/base.parser.ts`). Validado em `parsers.test.ts`.
3. **IMP-T03 (REST Validators):** Validadores tipados criados para `workspace`, `documents` e `settings` em `src/api/validators/` com contrato padronizado de erro HTTP 400. Validado em `validators.test.ts` e `validation-routes.test.ts`.
4. **IMP-T04 (Composite Indexes):** Criação dos índices `idx_documents_batch_type` e `idx_documents_batch_issue_date` no schema SQLite (`db-schema-init.ts`). Validado em `db-modules.test.ts`.
5. **IMP-T05 (Backup BUSCADOR):** Suíte unitária expandida em `backup-modules.test.ts` testando métricas, criação de arquivo .wfb, integridade SHA-256 e restauração completa das tabelas do Buscador.
6. **IMP-T06 (Event Loop Yielding):** Inclusão de `setImmediate` a cada lote de 25 arquivos processados nas rotas de importação (`import.routes.ts`) para prevenir bloqueios de concorrência em lotes de +1.000 notas.
7. **IMP-T07 (Tree Node Memoization):** Memoização do componente `WorkspaceTreeNode` via `React.memo` para alta performance em árvores com centenas de subpastas. Validado em `workspace-tree.test.ts`.
8. **IMP-T08 (Accessibility ConfirmDialog):** Alinhamento completo com `useDialogFocus`, `role="dialog"`, `aria-modal="true"`, `aria-describedby` e contenção de foco com tecla Escape. Validado em `ConfirmDialog.test.ts`.
9. **IMP-T09 (Zero High/Critical CVEs):** Configuração de `overrides` no `package.json` para `adm-zip`, `multer`, `proxy-addr`, `source-map-js`, `qs` e `ip-address`, atingindo 0 vulnerabilidades no `npm audit --omit=dev --audit-level=high` e integrando validação contínua no `.github/workflows/ci.yml`.
