# Plano de Implementação — Fase 6: Performance, CI/CD e Fechamento de Release

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar otimizações de renderização para grandes volumes em DocumentListPane e DadosItemsTable (IMP-013), configurar a esteira de CI/CD via GitHub Actions (IMP-007) e consolidar as notas de lançamento e documentação da versão v3.5.2 (IMP-025).

**Architecture:** Renderização progressiva com chunking adaptativo (50 iniciais + 30 por scroll) e memoização estrita de cartões via `React.memo` para garantir 60 FPS estáveis em pastas com 1.000+ documentos e notas com centenas de itens sem dependências externas; workflow não-interativo de GitHub Actions com cancelamento concorrente e `CI: true`; consolidação da v3.5.2 cobrindo os avanços de segurança, banco unificado WAL, conformidade 2026 e performance.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS 4, Vitest, GitHub Actions, Node.js 20.

**Spec:** [`docs/superpowers/specs/2026-10-14-fase-6-performance-cicd-release-design.md`](file:///c:/Users/alisson.santos/Documents/antigravity/workspace-fiscal/docs/superpowers/specs/2026-10-14-fase-6-performance-cicd-release-design.md)

---

## Global Constraints

- **Sem bibliotecas externas de virtualização:** Toda otimização de renderização deve ser nativa em React (chunking/slice progressivo + memoização).
- **Seleção em lote incondicional:** A ação "Selecionar todos" deve atuar sobre todos os documentos filtrados (`filteredDocuments.length`), nunca apenas sobre os itens renderizados na viewport.
- **Reset de viewport:** O limite visível (`visibleCount`) deve resetar para 50 sempre que a pasta, a busca ou a empresa mudarem.
- **Não-interatividade no CI:** O workflow do GitHub Actions deve definir `CI: true` e controle de `concurrency` com `cancel-in-progress: true`.
- **Sincronização estrita de versão v3.5.2:** `package.json`, `src/api/app.ts`, `whatsNewData.ts`, `whatsNewData.test.ts` e `README.md` devem ter paridade exata.
- **Git estritamente local:** NUNCA executar `git push`. Apenas commits locais por tarefa.

---

## Review Focus

1. **Seleção em lote além do limite visível:** Quando a lista tem 150 itens e apenas 50 estão visíveis, clicar em "Selecionar todos" deve selecionar todos os 150 itens e exibir "150 sel.".
2. **Navegação direta para nota distante:** Quando uma pasta com 200 itens é aberta e o documento ativo selecionado for o de índice 80, o componente deve garantir que o documento ativo seja renderizado.
3. **Reset de scroll em troca de pasta/filtro:** Ao digitar na busca ou trocar de pasta, `renderedCount` deve retornar a 50 itens sem vazamento de estado.
4. **Resiliência de itens da nota:** Em notas com mais de 50 produtos, a tabela deve exibir inicialmente 50 e permitir expansão para ver todos com um clique sem layout shift.
5. **Comportamento em lotes vazios ou pequenos:** Em pastas vazias ou com poucos itens (0 a 10 itens), o comportamento e os testes existentes devem continuar 100% idênticos.

---

### Task 1: IMP-013 — Renderização Progressiva e Memoização em DocumentListPane

**Files:**
- Modify: `src/web/features/documents/workspace/DocumentListPane.tsx`
- Create: `src/web/features/documents/workspace/DocumentListPane.performance.test.ts`
- Verify: `src/web/features/documents/workspace/workspace.test.ts`

**Interfaces:**
- Consumes: `DocumentListPaneProps`
- Produces: `DocumentListPane` otimizado com `DocumentCardItem` memoizado e controle progressivo de exibição.

- [ ] **Red 1.1**: Criar `src/web/features/documents/workspace/DocumentListPane.performance.test.ts` testando:
  - Para 150 documentos, inicialmente renderiza apenas 50 cartões no DOM.
  - O cabeçalho exibe a contagem total `150` no badge da pasta.
  - A ação de "Selecionar todos" passa `allFilteredSelected = true` e o contador de selecionados exibe `150 sel.`.
  - Se `selectedDocumentId` for `'doc-85'`, a fatia renderizada se expande automaticamente para incluir o item ativo.
  - Ao alterar `searchQuery` ou `selectedFolderName`, o limite renderizado reseta para 50.

- [ ] **Red 1.2**: Executar teste para verificar falha:
  `npx vitest run src/web/features/documents/workspace/DocumentListPane.performance.test.ts`

- [ ] **Green 1.3**: Implementar em `src/web/features/documents/workspace/DocumentListPane.tsx`:
  - Constantes `INITIAL_BATCH_SIZE = 50` e `BATCH_INCREMENT = 30`.
  - Estado `renderedCount` com reset em `useEffect` quando `selectedFolderName`, `searchQuery` ou `filteredDocuments` mudarem.
  - Cálculo de índice para auto-expansão quando `selectedDocumentId` estiver além de `renderedCount`.
  - Subcomponente memoizado `DocumentCardItem = React.memo(...)`.
  - Listener `onScroll` passivo no container da lista para incrementar `renderedCount` quando próximo ao final (`scrollHeight - scrollTop - clientHeight < 300`).

- [ ] **Green 1.4**: Executar os testes unitários e de regressão:
  `npx vitest run src/web/features/documents/workspace/DocumentListPane.performance.test.ts src/web/features/documents/workspace/workspace.test.ts`

- [ ] **Commit 1.5**: `feat(perf): implement progressive rendering and card memoization in document list pane`

---

### Task 2: IMP-013 — Chunking e Limite Inteligente em DadosItemsTable

**Files:**
- Modify: `src/web/features/documents/preview/dados/DadosItemsTable.tsx`
- Create: `src/web/features/documents/preview/dados/DadosItemsTable.performance.test.ts`
- Verify: `src/web/features/documents/preview/dados/dados-view.test.ts`

**Interfaces:**
- Consumes: `DadosItemsTableProps` (`items?: any[]`, `isLight: boolean`)
- Produces: `DadosItemsTable` com renderização progressiva dos primeiros 50 itens e expansão sob demanda para notas extensas.

- [ ] **Red 2.1**: Criar `src/web/features/documents/preview/dados/DadosItemsTable.performance.test.ts` testando:
  - Para nota com 120 itens, renderiza inicialmente 50 linhas `<tr>`.
  - Exibe no rodapé da tabela o resumo `"Exibindo 50 de 120 itens"` e o botão de ação.
  - Para nota com 20 itens, renderiza todas as 20 linhas e não exibe rodapé de expansão.
  - Para `items` vazio ou `undefined`, retorna `null`.

- [ ] **Red 2.2**: Executar teste para verificar falha:
  `npx vitest run src/web/features/documents/preview/dados/DadosItemsTable.performance.test.ts`

- [ ] **Green 2.3**: Implementar em `src/web/features/documents/preview/dados/DadosItemsTable.tsx`:
  - Estado local `isExpanded: boolean` (inicial `false`).
  - Constante `INITIAL_ITEMS_LIMIT = 50`.
  - Renderização da fatia `displayedItems = isExpanded ? items : items.slice(0, INITIAL_ITEMS_LIMIT)`.
  - Barra de rodapé discreta com contagem e botão para expandir todos os itens quando `items.length > INITIAL_ITEMS_LIMIT && !isExpanded`.

- [ ] **Green 2.4**: Executar testes da tabela e regressão de DadosView:
  `npx vitest run src/web/features/documents/preview/dados/DadosItemsTable.performance.test.ts src/web/features/documents/preview/dados/dados-view.test.ts`

- [ ] **Commit 2.5**: `feat(perf): add progressive chunking and expansion in dados items table`

---

### Task 3: IMP-007 — Pipeline CI/CD GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `tests/ci-workflow.test.ts`

**Interfaces:**
- Produces: Configuração de integração contínua automática para o repositório GitHub.

- [ ] **Red 3.1**: Criar `tests/ci-workflow.test.ts` verificando:
  - Existência física de `.github/workflows/ci.yml`.
  - Presença dos gatilhos `push` e `pull_request` no branch `main`.
  - Presença do bloco `concurrency` com `cancel-in-progress: true`.
  - Presença de `env: CI: true`.
  - Execução sequencial dos comandos: `npm ci`, `npm run lint`, `npm test`, `npm run build`.

- [ ] **Red 3.2**: Executar teste para verificar falha:
  `npx vitest run tests/ci-workflow.test.ts`

- [ ] **Green 3.3**: Criar `.github/workflows/ci.yml` estruturado conforme especificação.

- [ ] **Green 3.4**: Executar teste para verificar aprovação:
  `npx vitest run tests/ci-workflow.test.ts`

- [ ] **Commit 3.5**: `ci(actions): add automated github actions workflow with lint test and build`

---

### Task 4: IMP-025 — Atualização de Versão v3.5.2 e Release Notes Consolidada

**Files:**
- Modify: `package.json`
- Modify: `src/api/app.ts`
- Modify: `src/web/components/whats-new/whatsNewData.ts`
- Modify: `src/web/components/whats-new/whatsNewData.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: Versão unificada `v3.5.2` em toda a aplicação e no modal What's New.

- [ ] **Red 4.1**: Atualizar `src/web/components/whats-new/whatsNewData.test.ts`:
  - `CURRENT_APP_VERSION` deve ser `'3.5.2'`.
  - `WHATS_NEW_VERSIONS` deve ter 8 versões: `['3.5.2', '3.5.1', '3.5.0', '3.0.0', '2.5.3', '2.5.2', '2.5.1', '2.5.0']`.
  - Versão `3.5.2` deve ter `isCurrent === true`, label `'v3.5.2 (Atual)'`, subtitleText `'Lançamento mais recente'` e 3 cards temáticos.
  - Versão `3.5.1` deve ter `isCurrent === false` e label `'v3.5.1'`.

- [ ] **Red 4.2**: Executar teste para verificar falha:
  `npx vitest run src/web/components/whats-new/whatsNewData.test.ts`

- [ ] **Green 4.3**: Atualizar `src/web/components/whats-new/whatsNewData.ts`:
  - Tipo `AppVersion`: incluir `'3.5.2'`.
  - `CURRENT_APP_VERSION = '3.5.2'`.
  - Adicionar o bloco de versão `v3.5.2` no topo com os 3 cards temáticos (Reforma Tributária 2026/CNPJ Alfanumérico, SQLite Unificado WAL/Supervisor, Performance 60 FPS/LGPD/CI-CD).
  - Atualizar `v3.5.1` para `isCurrent: false` e label `'v3.5.1'`.

- [ ] **Green 4.4**: Atualizar `package.json`:
  - `"version": "3.5.2"`.

- [ ] **Green 4.5**: Atualizar `src/api/app.ts`:
  - Endpoint `/api/health`: `version: '3.5.2'`.

- [ ] **Green 4.6**: Atualizar `README.md`:
  - Versão: `3.5.2`.
  - Inserir seção `### Versão 3.5.2 (Atual)` detalhando as entregas das Fases 1 a 6 e ajustar `3.5.1` para versão anterior.

- [ ] **Green 4.7**: Executar testes de integridade:
  `npx vitest run src/web/components/whats-new/whatsNewData.test.ts src/api/routes/health.test.ts`

- [ ] **Commit 4.8**: `chore(release): update version to 3.5.2 with consolidated release notes and docs`

---

### Task 5: Verificação Final, Regressão Completa e Fechamento das 6 Fases

**Files:**
- Verify: Todas as suítes de teste do repositório.

- [ ] **5.1**: Executar `npm test` confirmando 100% de aprovação (esperado: 86+ suítes de testes passando).
- [ ] **5.2**: Executar `npm run lint` (`tsc --noEmit` na Web e no Electron).
- [ ] **5.3**: Executar `npm run build` (build Web via Vite e build Electron via esbuild).
- [ ] **5.4**: Commit local de release:
  `chore(release): complete phase 6 verification with clean lint test and build`
- [ ] **5.5**: Elaborar o Relatório Final de Encerramento das 6 Fases para o usuário.
