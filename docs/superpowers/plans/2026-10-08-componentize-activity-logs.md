# Plano de Componentização Segura: ActivityLogsTab.tsx

> **Regra Principal:** Zero alteração de comportamento. Preservação estrita de toda a lógica de negócio, chamadas à API Electron (`window.fiscalApi.logs.*`), filtros por nível e módulo, busca de texto, cópia de JSON, exportação CSV, limpeza periódica, classes Tailwind, estilos e acessibilidade.

## 1. Diagnóstico Arquitetural
- **Arquivo:** `src/web/components/settings/ActivityLogsTab.tsx` (646 linhas)
- **Papel:** Tela de auditoria e registros de atividades/eventos de todos os módulos do sistema.
- **Problema Estrutural:** Concentra em um único componente a barra de ações e métricas agregadas, filtros compostos (busca + nível + módulo), listagem interativa de logs com badges dinâmicos e o visualizador expansível de payload técnico JSON.

## 2. Estratégia de Decomposição Segura (4 Etapas Incrementais)

### Etapa 1: Extrair `activityLogFormatters.ts` [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/activity-logs/activityLogFormatters.ts` (99 linhas)
- **Responsabilidade:** Funções puras de formatação e resolução de badges visuais:
  - `formatLogDate`
  - `getLevelBadge` (ícone, cor e rótulo de SUCCESS, ERROR, WARN, INFO)
  - `getModuleBadgeColor` (estilos para BUSCADOR, NFVIEW, DEPRECIATION, BACKUP, CERTIFICATES, COMPANIES, SYSTEM)
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 2: Extrair `ActivityLogsHeader.tsx` [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/activity-logs/ActivityLogsHeader.tsx` (162 linhas)
- **Responsabilidade:** Header de ações globais e 4 cards de métricas:
  - Botão "Recarregar" (com spinner), "Exportar CSV", seletor de dias e botão "Limpar Antigos".
  - Cards de métricas: Total Registros, Sucessos, Falhas / Erros, Avisos.
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 3: Extrair `ActivityLogsList.tsx` e `ActivityLogDetailPane.tsx` [CONCLUÍDO]
- **Arquivos:**
  - `src/web/components/settings/activity-logs/ActivityLogsList.tsx` (217 linhas): barra de filtros (busca, botões de nível, seletor de módulo), lista scrollável de registros e rodapé da tabela com contador.
  - `src/web/components/settings/activity-logs/ActivityLogDetailPane.tsx` (77 linhas): painel expansível de detalhes do evento, ação, data/hora, botão "Copiar JSON" e bloco `<pre>`.
- **Gate de Validação:** `tsc --noEmit` aprovado.

### Etapa 4: Refatorar `ActivityLogsTab.tsx` e Validação Geral contra a Baseline [CONCLUÍDO]
- **Arquivo:** `src/web/components/settings/ActivityLogsTab.tsx`
- Integrar os módulos extraídos, mantendo estado central e `ConfirmModal`.
- Criar suíte de testes unitários `src/web/components/settings/activity-logs/activity-logs.test.ts` (6 testes passando).
- Redução: de 646 linhas para 191 linhas (-455 linhas, -70.4% no arquivo raiz).
- **Gate de Validação contra a Baseline:**
  - `npx vitest run`: 33 suítes, 220 testes passando, 1 ignorado, 0 falhas (+6 novos testes unitários).
  - `npm run lint`: 0 erros (typecheck Web e Electron com código 0).
  - `npm run build`: código 0 (Vite web + Electron empacotados com sucesso).
  - Commit local seguro (sem git push).

