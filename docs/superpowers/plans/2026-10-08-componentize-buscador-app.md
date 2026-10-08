# Plano de Componentização Segura: BuscadorApp.tsx (Buscador Fiscal)

> **Regra Principal:** Zero alteração de comportamento. Preservação estrita de toda a lógica de negócio, chamadas à API Fiscal (`window.fiscalApi`), IPC listeners da SEFAZ, paginação, filtros, modais, temas claro/escuro e acessibilidade.

## 1. Diagnóstico Arquitetural
- **Arquivo:** `src/web/features/buscador/BuscadorApp.tsx` (691 linhas)
- **Papel:** Tela/aplicação principal do módulo Buscador Fiscal (NF-e, CT-e e NFS-e Nacional).
- **Problema Estrutural:** Concentra no mesmo arquivo a orquestração do layout (`AppShell`), barra de ferramentas, sidebar de empresas, workspaces SEFAZ/NFSE, gerenciamento de sincronização SEFAZ (com IPC progress e cancelamento), reset de NSU, busca local com paginação e 9 modais/overlays.

## 2. Estratégia de Decomposição Segura (3 Etapas Incrementais)

### Etapa 1: Extrair `BuscadorModals.tsx` [CONCLUÍDO]
- **Arquivo:** `src/web/features/buscador/components/BuscadorModals.tsx` (197 linhas)
- **Responsabilidade:** Encapsular a renderização de todos os 9 overlays/modais:
  - `BuscadorSplashScreen`
  - `CompanyModal` (criação e edição de empresa)
  - `CertificateModal` (vinculação de certificado digital A1)
  - `SettingsModal` (configurações do Buscador e endpoints)
  - `DownloadModal` (exportação em lote de XML/PDF em ZIP)
  - `SefazProgressModal` (progresso da sincronização SEFAZ em tempo real)
  - `DocumentDetailsModal` (inspeção de chave, emitente, itens do documento)
  - `ConfirmDialog` (reset de NSU)
  - `ConfirmDialog` (exclusão de empresa)
  - `FeedbackModalHost`
- **Teste Unitário:** `src/web/features/buscador/components/BuscadorModals.test.ts` (3 testes passando).
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 2: Extrair Hook `useSefazSync.ts` [CONCLUÍDO]
- **Arquivo:** `src/web/features/buscador/hooks/useSefazSync.ts` (167 linhas)
- **Responsabilidade:** Isolar a máquina de estados e ciclo de vida da sincronização SEFAZ:
  - Estados: `isSefazModalOpen`, `sefazProgressMsg`, `sefazProgressNSU`, `sefazReceivedCount`, `activeConsultType`, `synchronizingType`, `pendingNsuReset`, `isResettingNsu`.
  - Ações: `handleConsultSefaz`, `handleCancelSefaz`, `handleResetNSU`, `handleConfirmResetNSU`.
  - IPC: listener `window.fiscalApi?.sefaz.onProgress` com cleanup.
- **Teste Unitário:** `src/web/features/buscador/hooks/useSefazSync.test.ts` (4 testes passando).
- **Gate de Validação:** `tsc --noEmit` e `vitest` aprovados.

### Etapa 3: Integrar em `BuscadorApp.tsx` e Validação Geral [CONCLUÍDO]
- **Arquivo:** `src/web/features/buscador/BuscadorApp.tsx`
- Integrar `BuscadorModals` e `useSefazSync`.
- Redução: de 691 linhas para 481 linhas (-210 linhas, -30.4% no arquivo raiz).
- **Gate de Validação contra a Baseline:**
  - `npx vitest run`: 31 suítes, 209 testes passando, 1 ignorado, 0 falhas (+7 novos testes unitários).
  - `npm run lint`: 0 erros (typecheck Web e Electron com código 0).
  - `npm run build`: código 0 (Vite web + Electron empacotados com sucesso).
  - Commit local seguro (sem git push).

