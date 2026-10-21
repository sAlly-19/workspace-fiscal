# Auto-Reconciliação Global Inteligente do Monitor de Pastas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar falsos positivos e notificações repetitivas de XMLs já importados nas pastas monitoradas, verificando a existência de documentos globalmente no workspace (independente de pasta/batchId) e persistindo arquivos reconciliados em lote.

**Architecture:** 
1. Adicionar `getExistingDocumentIdentifiers()` em `WorkspaceRepository` para retornar chaves de acesso (`accessKey`), pares emissor/número e nomes de arquivo de todo o banco de dados.
2. Criar `sniffXmlIdentifier` lendo até 4 KB (1 página de disco) com suporte a namespaces (`<(?:\w+:)?...>`) para capturar com precisão a chave da nota (NFe/CTe/NFCe) ou o número e CNPJ do prestador (NFS-e), sem confundir com tags de endereço ou tomador.
3. Atualizar `scanDirectory` em `FolderWatcherService` para checagem global O(1). Arquivos com nomes genéricos (ex: `nota.xml`, `danfe.xml`) passam obrigatoriamente pelo sniffer; arquivos já existentes no banco são salvos em lote via `recordWatchFilesBatch` em chunks de 500 para proteger o limite de parâmetros do SQLite.
4. Integrar registro em `folder_watch_files` nas rotas de importação manual por caminho local (`/api/import/paths`).
5. Suprimir emissão de `WATCH_PROMPT_IMPORT` e badge caso o número de novos arquivos reais seja zero.

**Tech Stack:** TypeScript, Node.js (fs.promises), Express, SQLite / Drizzle ORM, Vitest.

---

## Global Constraints
- Zero alterações em schemas do SQLite (utiliza as tabelas existentes `documents`, `folder_watch_files`, `folders`).
- Desempenho crítico: leitura de até 4 KB de cabeçalho apenas como fallback quando o nome do arquivo não possuir a chave de 44 dígitos ou for nome genérico.
- Nomes de arquivo genéricos (ex: `nota.xml`, `danfe.xml`, `documento.xml`, `nfe.xml`, `nfse.xml`) nunca dão match apenas por nome de arquivo — passam sempre pelo sniffer.
- Em `recordWatchFilesBatch`, realizar inserts em chunks de 500 registros em transação para evitar o limite de variáveis do SQLite.
- Preservar compatibilidade total com os testes existentes do `folderWatcherService` e `workspaceRepository`.
- Nenhuma dependência externa nova.

---

## Review Focus
1. **NFS-e sem chave de 44 dígitos:** Devem ser reconhecidas como já importadas via CNPJ do emitente e número da nota lidos do cabeçalho rápido (sem confundir com tomador ou endereço).
2. **Nomes genéricos:** `nota.xml` em pasta diferente não pode ser falsamente ignorado sem ler o cabeçalho.
3. **Arquivos em subpastas:** Arquivos pertencentes a `SUPREMEFERTIL/05-2026` não podem reaparecer como pendentes na pasta pai `SUPREME`.
4. **Chunks no SQLite:** `recordWatchFilesBatch` com 5.000+ arquivos não pode disparar erro de limite de variáveis no SQLite.
5. **Zero novos arquivos:** Se todos os XMLs de uma pasta monitorada já existirem no banco, nenhum evento `WATCH_PROMPT_IMPORT` deve ser emitido.

---

## Tarefas de Implementação

### Task 1: Identificadores Globais e Inserção em Chunks em WorkspaceRepository
**Files:**
- Modify: `src/api/repositories/workspace.repository.ts`
- Test: `src/api/repositories/workspace.repository.test.ts`

- [ ] **Passo 1: Escrever teste unitário para `getExistingDocumentIdentifiers` e `recordWatchFilesBatch` em chunks**
  - No arquivo `src/api/repositories/workspace.repository.test.ts`, adicionar teste para `getExistingDocumentIdentifiers()` com documentos em pastas distintas e sem pasta.
  - Adicionar teste para `recordWatchFilesBatch` com mais de 500 itens garantindo que a inserção em chunks funciona sem estourar limites do SQLite.
- [ ] **Passo 2: Rodar teste para confirmar falha (Red)**
  - Executar: `npx vitest run src/api/repositories/workspace.repository.test.ts`
- [ ] **Passo 3: Implementar `getExistingDocumentIdentifiers` e refatorar `recordWatchFilesBatch` com chunks**
  - Adicionar `getExistingDocumentIdentifiers` retornando `accessKeys`, `numbersByIssuer` e `rawXmlFileNames`.
  - Refatorar `recordWatchFilesBatch` para fatiar o array em blocos de até 500 registros em transação.
- [ ] **Passo 4: Rodar teste para confirmar sucesso (Green)**
  - Executar: `npx vitest run src/api/repositories/workspace.repository.test.ts`
- [ ] **Passo 5: Commit local**
  - `git commit -m "feat(workspace-repo): add getExistingDocumentIdentifiers and chunked recordWatchFilesBatch"`

---

### Task 2: Extração Rápida de Identificador de XML (Header Sniffer até 4 KB)
**Files:**
- Create: `src/core/parsers/utils/fast-xml-identifier.ts`
- Test: `src/core/parsers/utils/fast-xml-identifier.test.ts`

- [ ] **Passo 1: Escrever teste unitário para `sniffXmlIdentifier`**
  - Testar detecção de chave NFe/CTe/NFCe (com e sem namespaces como `<nfe:chNFe>`, `<cte:infCte Id="CTe..."`).
  - Testar detecção de NFS-e (número da nota e CNPJ do prestador), garantindo que NÃO captura número de endereço nem CNPJ do tomador.
  - Testar tolerância a buffer malformado ou truncado.
- [ ] **Passo 2: Rodar teste para confirmar falha (Red)**
  - Executar: `npx vitest run src/core/parsers/utils/fast-xml-identifier.test.ts`
- [ ] **Passo 3: Implementar `sniffXmlIdentifier(buffer: Buffer | string)` e `sniffXmlFile(filePath: string)`**
  - Leitura de até 4 KB (4096 bytes) usando `fs.promises.open` com file descriptor e buffer limitado.
  - Extração com suporte a namespaces opcionais `<(?:\w+:)?...>`.
- [ ] **Passo 4: Rodar teste para confirmar sucesso (Green)**
  - Executar: `npx vitest run src/core/parsers/utils/fast-xml-identifier.test.ts`
- [ ] **Passo 5: Commit local**
  - `git commit -m "feat(parsers): add resilient 4kb header sniffer with namespace support"`

---

### Task 3: Auto-Reconciliação e Deduplicação Global no FolderWatcherService
**Files:**
- Modify: `src/api/services/folder-watcher.service.ts`
- Test: `src/api/services/folder-watcher.service.test.ts`

- [ ] **Passo 1: Escrever testes unitários em `folder-watcher.service.test.ts`**
  - Teste 1: Arquivo XML com chave de acesso de documento que está em OUTRA pasta deve ser reconhecido como já importado e NÃO entrar em `pendingFiles`.
  - Teste 2: Arquivo com nome genérico (`nota.xml`) deve passar pelo sniffer e não ser ignorado apenas por ter nome repetido.
  - Teste 3: Quando todos os arquivos da pasta já existem no banco, `WATCH_PROMPT_IMPORT` NÃO deve ser disparado.
- [ ] **Passo 2: Rodar testes para verificar falha (Red)**
  - Executar: `npx vitest run src/api/services/folder-watcher.service.test.ts`
- [ ] **Passo 3: Atualizar `scanDirectory` em `FolderWatcherService`**
  - Obter identificadores globais via `getExistingDocumentIdentifiers()`.
  - Diferenciar nomes genéricos de nomes únicos (se for genérico como `nota.xml`, passa pelo `sniffXmlFile`).
  - Gravar `newlyIdentifiedAsImported` em lote via `recordWatchFilesBatch`.
  - Se `foundXmls.length === 0`: emitir apenas `phase: completed` e **NÃO** emitir `WATCH_PROMPT_IMPORT`.
- [ ] **Passo 4: Rodar testes para confirmar aprovação (Green)**
  - Executar: `npx vitest run src/api/services/folder-watcher.service.test.ts`
- [ ] **Passo 5: Commit local**
  - `git commit -m "fix(folder-watcher): globally reconcile existing documents and silence false positives"`

---

### Task 4: Atualização de `folder_watch_files` em Importações Manuais
**Files:**
- Modify: `src/api/routes/import.routes.ts`
- Test: `src/api/routes/import.routes.test.ts`

- [ ] **Passo 1: Atualizar rota `/paths` em `import.routes.ts`**
  - Ao concluir a importação de caminhos locais onde `batchId` foi fornecido, registrar em lote os caminhos em `folder_watch_files` via `recordWatchFilesBatch`.
- [ ] **Passo 2: Rodar testes de importação**
  - Executar: `npx vitest run src/api/routes/import.routes.test.ts`
- [ ] **Passo 3: Commit local**
  - `git commit -m "feat(import): record imported disk paths in folder watch files"`

---

### Task 5: Verificação Global e Regressão
- [ ] **Passo 1: Executar `npm run lint`**
- [ ] **Passo 2: Executar suíte completa de testes (`npm test`)**
- [ ] **Passo 3: Validar que 100% dos testes passam sem erros**
