# Sincronização Dividida (NF-e/CT-e) & Sistema de Registros de Atividade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar a sincronização de NF-e e CT-e no Buscador NF em botões dedicados e implementar uma infraestrutura central de auditoria e registros de atividade persistida em SQLite, com exibição completa e detalhada na aba "Registros de Atividade" do modal de configurações.

**Architecture:** 
1. Estender o motor SEFAZ (`DistributionEngine` e IPC `sefaz:consultDocuments`) para aceitar parâmetro opcional de tipo de documento (`NFE` ou `CTE`), dividindo a toolbar de ações em pares dedicados (Reset + Sincronizar) para cada modelo.
2. Criar a tabela `activity_logs` no schema Drizzle SQLite com índices em `timestamp`, `level`, `module` e `action`.
3. Criar o serviço `ActivityLogService` com gravação rápida, paginação/filtros, métricas estatísticas, exportação CSV/JSON e limpeza por retenção.
4. Expor o serviço via IPC Electron (`window.fiscalApi.logs`) e instrumentar os módulos principais (Buscador, NF View, Depreciação, Backup, Certificados e Empresas).
5. Construir o componente `ActivityLogsTab.tsx` no `SettingsModal.tsx` com visualização de métricas, filtros rápidos, busca instantânea e inspeção JSON detalhada.

**Tech Stack:** TypeScript, React, Tailwind CSS, Electron IPC, Drizzle ORM / LibSQL (SQLite), Vitest.

---

## Global Constraints
- Nenhuma dependência externa pesada adicional.
- Testes automatizados TDD para toda a camada de serviço e utilitários.
- Nunca executar `git push`. Apenas commits locais convencionais.
- Respeitar estritamente a paleta de cores e suporte completo aos modos Dark e Light.

---

### Task 1: Botões de Sincronização Divididos no Buscador NF

**Files:**
- Modify: `src/core/buscador/fiscal/services/DistributionEngine.ts`
- Modify: `electron/buscador/ipc/sefazHandlers.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/fiscal-api.d.ts`
- Modify: `src/web/features/buscador/components/documents/DocumentFilters.tsx`
- Modify: `src/web/features/buscador/components/documents/DocumentWorkspace.tsx`
- Modify: `src/web/features/buscador/BuscadorApp.tsx`
- Test: `electron/buscador/ipc/nfseHandlers.test.ts` (ou novo teste dedicado)

- [ ] **Step 1: Atualizar `DistributionEngine.syncCompanyDocuments` para suportar `docType?: DocumentType`**
  Permitir executar apenas NF-e ou apenas CT-e quando o tipo for especificado, retornando o resultado combinado com o tipo solicitado.
- [ ] **Step 2: Atualizar IPC handler `sefaz:consultDocuments`**
  Aceitar segundo argumento `rawType` opcional (`'NFE' | 'CTE'`).
- [ ] **Step 3: Atualizar preload e tipos de `fiscalApi.sefaz.consultDocuments`**
  Assinatura: `consultDocuments(companyId: number, docType?: 'NFE' | 'CTE') => Promise<CombinedSefazQueryResult>`.
- [ ] **Step 4: Atualizar `DocumentFilters.tsx` com botões divididos**
  Substituir o botão único `Sincronizar` por:
  - Bloco NF-e: `Reset NF-e` e `Sincronizar NF-e`
  - Bloco CT-e: `Reset CT-e` e `Sincronizar CT-e`
- [ ] **Step 5: Integrar no `BuscadorApp.tsx`**
  Passar handlers `handleConsultSefaz('NFE')` e `handleConsultSefaz('CTE')`.
- [ ] **Step 6: Executar testes de verificação**
  Run: `npx vitest run`
- [ ] **Step 7: Commit local**
  `feat(buscador): split sefaz sync into separate nfe and cte actions`

---

### Task 2: Schema SQLite e Serviço Central de Logs de Atividade

**Files:**
- Create: `src/api/services/activity-log.service.ts`
- Create: `src/api/services/activity-log.service.test.ts`
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Criar tabela `activity_logs` no schema Drizzle (`src/db/schema.ts`)**
  Campos:
  - `id`: text primary key
  - `timestamp`: integer mode timestamp not null
  - `level`: text not null ('SUCCESS' | 'ERROR' | 'WARN' | 'INFO')
  - `module`: text not null ('BUSCADOR' | 'NFVIEW' | 'DEPRECIATION' | 'BACKUP' | 'CERTIFICATES' | 'COMPANIES' | 'SYSTEM')
  - `action`: text not null
  - `message`: text not null
  - `details`: text (JSON string)
  - `durationMs`: integer
  Índices em `timestamp`, `level`, `module`.
- [ ] **Step 2: Escrever testes unitários em `src/api/services/activity-log.service.test.ts` (RED)**
  Testar criação de log, listagem com filtros (por módulo, level e busca de texto), cálculo de estatísticas e limpeza por dias de retenção.
- [ ] **Step 3: Implementar `ActivityLogService` (GREEN)**
  Métodos: `log()`, `list()`, `getStats()`, `clearOld()`, `exportCsv()`.
- [ ] **Step 4: Executar testes para confirmar aprovação**
  Run: `npx vitest run src/api/services/activity-log.service.test.ts`
- [ ] **Step 5: Commit local**
  `feat(logs): add activity_logs sqlite schema and service`

---

### Task 3: IPC Handlers e Instrumentação de Eventos da Aplicação

**Files:**
- Create: `electron/ipc/activityLogHandlers.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/fiscal-api.d.ts`
- Modify: `src/web/lib/api.ts` (ou equivalente)

- [ ] **Step 1: Criar IPC handlers para `logs:*` no Electron**
  Handlers: `logs:list`, `logs:getStats`, `logs:clearOld`, `logs:exportCsv`, `logs:record`.
- [ ] **Step 2: Expor `window.fiscalApi.logs` no preload**
- [ ] **Step 3: Instrumentar eventos nos serviços principais**
  - Sincronização SEFAZ (início, sucesso e erro com contagem e NSU)
  - Sincronização NFS-e (início, sucesso e erro)
  - Backup e Restauração (.wfb criados e restaurados)
  - Cadastro/Exclusão de empresas
  - Validação de certificados digitais
- [ ] **Step 4: Testar e validar tipos**
  Run: `npm run lint`
- [ ] **Step 5: Commit local**
  `feat(logs): expose activity log ipc and instrument core application events`

---

### Task 4: Componente `ActivityLogsTab` no Modal de Configurações

**Files:**
- Create: `src/web/components/settings/ActivityLogsTab.tsx`
- Modify: `src/web/components/SettingsModal.tsx`

- [ ] **Step 1: Criar componente `ActivityLogsTab.tsx`**
  - Cards de métricas superiores (Total, Sucessos, Falhas/Erros, Avisos).
  - Barra de pesquisa + filtro de nível (Todos, Sucesso, Erro, Aviso, Info) + seletor de módulo.
  - Tabela/lista de registros com badges coloridos e timestamp formatado.
  - Painel de expansão de detalhes técnicos JSON com botão de copiar.
  - Botões de exportação CSV e limpeza com diálogo de confirmação.
- [ ] **Step 2: Integrar no `SettingsModal.tsx` na aba `logs`**
- [ ] **Step 3: Validar interface e responsividade nos temas Dark e Light**
- [ ] **Step 4: Commit local**
  `feat(settings): implement activity logs tab in settings modal`

---

### Task 5: Verificação e Validação Final

- [ ] **Step 1: Executar suite completa de testes**
  Run: `npx vitest run`
- [ ] **Step 2: Executar checagem de tipos**
  Run: `npm run lint`
- [ ] **Step 3: Executar build de produção**
  Run: `npm run build`
- [ ] **Step 4: Commit final se houver pendências e registrar evidências**

