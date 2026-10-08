# Componentização Segura: DepreciationApp.tsx

> **Para agentes de execução:** Esta tarefa segue estritamente a diretriz de zero alteração de comportamento. Cada subcomponente e hook reproduz exatamente os mesmos nós JSX, classes Tailwind, ordenações, filtros, cálculos patrimoniais, modais e fluxos originais.

## Checklist de Execução Incremental

- [x] **Step 3.1:** Extrair Hook de Filtros e Ordenação de Bens
  - Criado `src/web/features/depreciation/hooks/useAssetFiltersAndSort.ts` (156 linhas).
  - Criado `src/web/features/depreciation/hooks/useAssetFiltersAndSort.test.ts` (22 testes unitários cobrindo busca, filtros por categoria, status, ano, ordenação asc/desc e reset).
  - Gate de validação: `vitest run` [22 testes verdes].
- [x] **Step 3.2:** Extrair Componentes de Navegação
  - Criado `src/web/features/depreciation/components/navigation/DepreciationTopBar.tsx` (120 linhas).
  - Criado `src/web/features/depreciation/components/navigation/DepreciationSidebar.tsx` (43 linhas).
  - Criado `src/web/features/depreciation/components/navigation/index.ts`.
  - Gate de validação: `tsc --noEmit` [Passou].
- [x] **Step 3.3:** Extrair Orquestrador de Modais e Confirmações
  - Criado `src/web/features/depreciation/components/modals/DepreciationModals.tsx` (491 linhas).
  - Encapsula todos os 11 diálogos do módulo (CompanyModal, AssetModal, CategoryModal, AssetHistoryModal, ExportConflictModal, RetroactivePromptModal, DisposeModal, ConfirmModal delete, ConfirmModal reactivate, RetroactiveBatchModal, CsvLayoutModal).
  - Gate de validação: `tsc --noEmit` [Passou].
- [x] **Step 3.4:** Refatorar `DepreciationApp.tsx` (Orquestrador Principal)
  - Reduzido de 832 linhas para 479 linhas (-42.4%).
  - Conectados: `DepreciationTopBar`, `DepreciationSidebar`, `useAssetFiltersAndSort` e `DepreciationModals`.
  - Gate de validação: `tsc --noEmit` [Passou].
- [x] **Step 3.5:** Validação Geral contra a Baseline
  - `npx vitest run`: 26 suítes, 190 testes passando, 1 ignorado, 0 falhas.
  - `npm run lint`: 0 erros no typecheck Web e Electron.
  - `npm run build`: código 0 (Vite web + Electron empacotados).
