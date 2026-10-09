# Plano de Componentização: workspace.store.ts

> **Meta:** Reduzir a complexidade de `src/web/stores/workspace.store.ts` (503 linhas) através de separação em slices coesos do Zustand e submódulos utilitários, com **zero alteração de comportamento, sincronização com URL, persistência no localStorage e integridade de chamadas de API**.

---

## 1. Diagnóstico Estrutural

O arquivo `workspace.store.ts` gerencia o estado global do workspace fiscal:
1. **Tipos e Contratos:** `FolderNode`, `DocumentItem`, `ImportProgress`, `AppSettings`, `WorkspaceState`.
2. **Sincronização com URL e HTTP:** `readUrlParams`, `writeUrlParams`, `safeFetchJson` com retry automático e validação de `content-type`.
3. **Gestão de Configurações (Settings):** Leitura e persistência de preferências de impressão e tema no `localStorage`.
4. **Slice de Pastas:** Hierarquia de diretórios (`FolderNode`), expansão recursiva, criação, renomeação, exclusão e seleção de pastas.
5. **Slice de Documentos:** Listagem com filtro e paginação por lote (`batchId`), movimentação individual/em lote, exclusão individual/em lote e reset do banco.
6. **Slice de Seleção & Busca:** Seleção múltipla de documentos (`selectedDocIds`), pesquisa (`searchQuery`), controle de modais de progresso e configurações.

---

## 2. Divisão de Submódulos

Diretório alvo: `src/web/stores/workspace/`

1. `workspace.types.ts`:
   - Definições de interfaces (`FolderNode`, `DocumentItem`, `ImportProgress`, `AppSettings`, `WorkspaceState`).
2. `workspace.utils.ts`:
   - Helpers de URL (`readUrlParams`, `writeUrlParams`), cliente HTTP resiliente (`safeFetchJson`), valores padrão de configuração (`DEFAULT_SETTINGS`, `getStoredSettings`).
3. `slices/folders.slice.ts`:
   - Estado e actions de pastas (`fetchWorkspace`, `createFolder`, `updateFolder`, `deleteFolder`, `toggleFolderExpand`, `selectFolder`).
4. `slices/documents.slice.ts`:
   - Estado e actions de documentos (`fetchDocuments`, `moveDocument`, `bulkMoveDocuments`, `deleteDocument`, `bulkDeleteDocuments`, `clearAllDocuments`, `resetWorkspaceDatabase`, `selectDocument`).
5. `slices/selection.slice.ts`:
   - Estado e actions de seleção múltipla e busca (`toggleDocSelection`, `selectAllDocs`, `clearDocSelection`, `setSearchQuery`, import progress e settings).
6. `index.ts`:
   - Barrel export re-exportando tipos, utilitários e criador da store.
7. `workspace-store.test.ts`:
   - Testes unitários cobrindo o comportamento da store (seleção, filtros, persistência e utilitários).
8. `workspace.store.ts` (refatorado):
   - Fachada limpa instanciando `useWorkspaceStore = create<WorkspaceState>(...)` através dos slices e re-exportando todos os tipos.

---

## 3. Protocolo de Validação
- Vitest: executar com `--fileParallelism=false` confirmando todos os testes verdes.
- Lint: executar `npm run lint` sem erros de tipagem TypeScript.
- Build: executar `npm run build` com saída código 0.
- Auditoria do Agente 5 e commit local (sem `git push`).

