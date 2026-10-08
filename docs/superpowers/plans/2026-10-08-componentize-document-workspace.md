# Componentização Segura: MainLayout.tsx (Document Workspace do NF View)

> **Regra Principal:** Zero alteração de comportamento. Preservação estrita de toda a lógica de negócio, atalhos de teclado, drag-and-drop, polling de upload, redimensionamento de painéis, seleção em lote, classes Tailwind, estilos e acessibilidade.

## Diagnóstico Arquitetural
- **Arquivo:** `src/web/layouts/MainLayout.tsx` (1.467 linhas)
- **Papel:** Workspace central de documentos fiscais (NF-e, NFC-e, CT-e), gerenciando a árvore de pastas, lista de notas fiscais e visualizador DANFE oficial (`DocumentPreview.tsx`).
- **Problema Estrutural:** Acumula em um único arquivo a barra superior (busca, temas, importação), barra inferior, modais de confirmação/movimentação, upload drag-and-drop, atalhos de teclado e a coluna completa de listagem/cards de documentos.

## Checklist de Execução Incremental

- [x] **Step 4.1:** Extrair `DocumentPreviewEmptyState.tsx`
  - Painel de boas-vindas exibido na coluna 3 quando nenhum documento está selecionado (`docDetails === null`).
  - Arquivo: `src/web/features/documents/workspace/DocumentPreviewEmptyState.tsx`.
  - Gate de validação: `tsc --noEmit` aprovado.

- [x] **Step 4.2:** Extrair `MainFooter.tsx`
  - Barra inferior fixa exibindo pasta ativa, total de documentos e notas selecionadas.
  - Arquivo: `src/web/layouts/components/MainFooter.tsx`.
  - Gate de validação: `tsc --noEmit` aprovado.

- [x] **Step 4.3:** Extrair `MainHeader.tsx`
  - Topbar do NF View com logo, voltar ao Hub, busca (Ctrl+F / /), switcher de tema, botões de importação XML/pasta e configurações.
  - Arquivo: `src/web/layouts/components/MainHeader.tsx`.
  - Gate de validação: `tsc --noEmit` aprovado.

- [x] **Step 4.4:** Extrair `WorkspaceModals.tsx`
  - Encapsula `ConfirmModal`, `ImportProgressModal`, overlay drag-and-drop, input de arquivos e modal de movimentação de pastas.
  - Arquivo: `src/web/layouts/components/WorkspaceModals.tsx`.
  - Gate de validação: `tsc --noEmit` aprovado.

- [x] **Step 4.5:** Extrair `DocumentListPane.tsx` (Coluna do Workspace de Documentos)
  - Coluna central com cabeçalho de seleção, toolbar flutuante de lote, lista com drag-and-drop, skeletons e empty state.
  - Arquivo: `src/web/features/documents/workspace/DocumentListPane.tsx`.
  - Gate de validação: `tsc --noEmit` aprovado.

- [x] **Step 4.6:** Refatorar `MainLayout.tsx` (Orquestrador)
  - Integrar os 5 submódulos extraídos, mantendo redimensionamento, atalhos e ciclo de vida.
  - Redução de 1.467 linhas para 835 linhas (-43.1% de redução estrutural no arquivo raiz).
  - Gate de validação: `tsc --noEmit` aprovado.

- [x] **Step 4.7:** Validação Geral contra a Baseline
  - `npx vitest run`: 29 suítes, 202 testes passando, 1 ignorado, 0 falhas (9 novos testes unitários adicionados).
  - `npm run lint`: 0 erros (typecheck Web e Electron com código 0).
  - `npm run build`: código 0 (Vite web + Electron empacotados com sucesso).
  - Commit local: `refactor(workspace): componentize MainLayout into header, modals, footer and document list pane`.

