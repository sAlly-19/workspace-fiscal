# Fase 3: Unificação de Motores e Resiliência da Camada de Transporte (IMP-005, IMP-008, IMP-022) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar motores de parsing de DF-e e utilitários numéricos entre o Hub e o Buscador, suportando resumos SEFAZ (`resNFe`, `resCTe`); convergir formatadores e view-models fiscais eliminando duplicações e blindando 100% dos renderizadores DANFE contra XSS; e implementar o `LocalServerSupervisor` com auto-restart controlado, `/api/health` enriquecido, auto-recuperação do overlay e endurecimento do IPC no Electron.

**Architecture:**
- `src/core/parsers/utils/xml-number.utils.ts` canônico com diferenciação estrita de decimais internacionais (`1234.56`) e brasileiros (`1.234,56`), reexportado para retrocompatibilidade.
- Suporte a `resNFe`, `resCTe` e `resEvento` em `NFeParser` e `CTeParser` gerando `FiscalDocument` com item sintético e total íntegro para importação no NFView.
- `src/core/utils/escapeHtml.ts` canônico reexportado por `src/core/danfe/helpers.ts` e `src/api/utils/escapeHtml.ts` (invertendo a dependência errada Core->API).
- `src/core/danfe/view-models/` unificados consumidos tanto pelos previews React (`DanfeNFSe.tsx`, `DanfeDACTE.tsx`) quanto pelos geradores HTML de lote (`danfe-nfse.renderer.ts`, `danfe-cte.renderer.ts`).
- `LocalServerSupervisor` (`electron/serverSupervisor.ts`) no Electron com flag `isStopping` para evitar loop de restart em paradas intencionais, auto-restart com backoff para quedas acidentais e bridge IPC `server:status` / `server:restart`.
- `/api/health` enriquecido com diagnóstico SQLite (`SELECT 1`, `PRAGMA journal_mode`), polling e auto-recuperação no `ServerUnreachableOverlay.tsx`, e validação estrita de frames no IPC (`electron/main.ts` e `security.ts`).

**Tech Stack:** Node.js, Electron 33, Express, TypeScript, Vitest, Fast-XML-Parser, React.

**Spec:** `docs/superpowers/specs/2026-10-14-fase-3-motores-e-transporte-design.md`

## Global Constraints
- Zero quebras nos contratos públicos de `DistributionEngine.ts`, `import.service.ts` e `electron/buscador/ipc/`.
- 100% de compatibilidade e aprovação em todas as 61 suítes (369 testes) existentes.
- Diferenciação precisa em `parseFiscalNumber`: "1234.56" -> 1234.56 (nunca 123456).
- `LocalServerSupervisor` com controle de estado `isStopping` em `stop()`, `restart()` e encerramento.
- NUNCA executar `git push`. Apenas commits locais por tarefa.

---

### Task 1: Utilitários Numéricos Canônicos e Suporte a Resumos SEFAZ (IMP-005)

**Files:**
- Create: `src/core/parsers/utils/xml-number.utils.ts`
- Create: `src/core/parsers/utils/xml-number.test.ts`
- Modify: `src/core/parsers/cte/cte-number.utils.ts`
- Modify: `src/core/parsers/nfse/nfse-number.utils.ts`
- Modify: `src/core/detector.ts`
- Modify: `src/core/parsers/nfe.parser.ts`
- Modify: `src/core/parsers/cte.parser.ts`
- Modify: `src/core/buscador/fiscal/nfe/NFeParser.ts`
- Modify: `src/core/buscador/fiscal/cte/CTeParser.ts`
- Create: `src/core/parsers/nfe-summary.test.ts`

**Interfaces:**
- Produces: `parseFiscalNumber(val: unknown): number`.
- Consumes: XMLs completos e resumos (`resNFe`, `resCTe`, `resEvento`), gerando `FiscalDocument`.

- [x] **Step 1: Escrever teste unitário para `parseFiscalNumber` e ingestão de resumos SEFAZ (RED)**
Criar `src/core/parsers/utils/xml-number.test.ts` e `src/core/parsers/nfe-summary.test.ts` validando:
- "1234.56" -> 1234.56 (não remove ponto sem vírgula)
- "1.234,56" -> 1234.56 (remove ponto de milhar quando há vírgula)
- "1234,56" -> 1234.56
- `detectFiscalDocument` com `<resNFe` e `<resCTe`
- `nfe.parser.ts` parseando `resNFe` e `resEvento` com item sintético e total íntegro
- `cte.parser.ts` parseando `resCTe` e `resEventoCTe`

- [x] **Step 2: Executar testes para verificar falha (RED)**
Run: `npm.cmd test -- src/core/parsers/utils/xml-number.test.ts src/core/parsers/nfe-summary.test.ts`
Expected: FAIL.

- [x] **Step 3: Implementar `parseFiscalNumber`, reexportações e suporte a resumos nos parsers**
1. Implementar `src/core/parsers/utils/xml-number.utils.ts`.
2. Reexportar em `cte-number.utils.ts` e `nfse-number.utils.ts`.
3. Atualizar `src/core/detector.ts` com tags de resumo.
4. Atualizar `nfe.parser.ts` e `cte.parser.ts` para processar resumos sem exigir `infNFe`/`infCte`.
5. Atualizar `NFeParser.ts` e `CTeParser.ts` do Buscador para usar `parseFiscalNumber`.

- [x] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/core/parsers/utils/xml-number.test.ts src/core/parsers/nfe-summary.test.ts src/core/parsers/parsers.test.ts`
Expected: PASS com 100% de sucesso.

- [x] **Step 5: Commit local da Task 1**
Commit: `feat(parsers): unify xml number parsing and add sefaz summary document support`

---

### Task 2: Centralização de Formatadores e Reorganização do Escapador HTML (IMP-008 - Parte 1)

**Files:**
- Create: `src/core/utils/escapeHtml.ts`
- Create: `src/core/utils/escapeHtml.test.ts`
- Modify: `src/core/danfe/helpers.ts`
- Modify: `src/api/utils/escapeHtml.ts`
- Modify: `src/web/features/documents/dacte/dacte.helpers.ts`
- Modify: `src/core/danfe/renderers/danfe-cte.renderer.ts`

**Interfaces:**
- Produces: `escapeHtml(value: unknown): string`, `escapeAttr(value: unknown): string`, `formatRole(role: string): string`, `formatUnit(unit: string): string` em `src/core/danfe/helpers.ts`.

- [x] **Step 1: Escrever testes para escapeHtml e formatadores canônicos (RED)**
Criar `src/core/utils/escapeHtml.test.ts` cobrindo caracteres `<, >, &, ", ', \`` e valores nulos/numéricos.

- [x] **Step 2: Executar testes para verificar falha (RED)**
Run: `npm.cmd test -- src/core/utils/escapeHtml.test.ts`
Expected: FAIL.

- [x] **Step 3: Implementar `src/core/utils/escapeHtml.ts` e reorganizar reexportações**
1. Mover implementação canônica para `src/core/utils/escapeHtml.ts`.
2. Fazer `src/api/utils/escapeHtml.ts` reexportar do Core.
3. Mover `formatRole` e `formatUnit` para `src/core/danfe/helpers.ts` e reexportar em `dacte.helpers.ts`.
4. Atualizar `src/core/danfe/renderers/danfe-cte.renderer.ts` para usar helpers centralizados.

- [x] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/core/utils/escapeHtml.test.ts src/core/danfe/danfe-html.test.ts`
Expected: PASS com 100% de sucesso.

- [x] **Step 5: Commit local da Task 2**
Commit: `refactor(danfe): centralize formatters and escapeHtml in core layer`

---

### Task 3: View-Models Unificados e Blindagem XSS nos Renderizadores DANFE (IMP-008 - Parte 2)

**Files:**
- Create: `src/core/danfe/view-models/nfse.view-model.ts`
- Create: `src/core/danfe/view-models/cte.view-model.ts`
- Create: `src/core/danfe/view-models/nfe.view-model.ts`
- Create: `src/core/danfe/view-models/index.ts`
- Create: `src/core/danfe/danfe-xss.test.ts`
- Modify: `src/core/danfe/renderers/danfe-nfse.renderer.ts`
- Modify: `src/core/danfe/renderers/danfe-cte.renderer.ts`
- Modify: `src/core/danfe/renderers/danfe-nfe.renderer.ts`
- Modify: `src/core/danfe/renderers/danfe-nfce.renderer.ts`
- Modify: `src/web/features/documents/DanfeNFSe.tsx`
- Modify: `src/web/features/documents/DanfeDACTE.tsx`

**Interfaces:**
- Produces: `buildNfseViewModel(doc: any): NfseViewModel`, `buildCteViewModel(doc: any): CteViewModel`, `buildNfeViewModel(doc: any): NfeViewModel`.
- Hardens: Renderizadores HTML sanitizam todas as variáveis interpoladas com `escapeHtml`.

- [ ] **Step 1: Escrever testes para View-Models e injeção XSS em lote (RED)**
Criar `src/core/danfe/danfe-xss.test.ts` injetando strings maliciosas com `<script>alert(1)</script>`, `"><img src=x onerror=alert(1)>`, etc. em nomes de emitente, tomador, itens, observações fiscais e endereços em NF-e, CT-e, NFS-e e NFC-e.

- [ ] **Step 2: Executar testes para verificar falha (RED)**
Run: `npm.cmd test -- src/core/danfe/danfe-xss.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar View-Models e aplicar escapeHtml em 100% das interpolações HTML**
1. Implementar adaptadores em `src/core/danfe/view-models/`.
2. Conectar `DanfeNFSe.tsx` e `danfe-nfse.renderer.ts` ao `buildNfseViewModel`.
3. Conectar `DanfeDACTE.tsx` e `danfe-cte.renderer.ts` ao `buildCteViewModel`.
4. Blindar todas as tags e atributos de `danfe-nfe.renderer.ts`, `danfe-cte.renderer.ts`, `danfe-nfse.renderer.ts` e `danfe-nfce.renderer.ts` com `escapeHtml`.

- [ ] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/core/danfe/danfe-xss.test.ts src/core/danfe/danfe-html.test.ts`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit local da Task 3**
Commit: `feat(danfe): introduce shared view models and harden batch renderers against XSS`

---

### Task 4: Supervisor de Servidor Local e Tipagem da Ponte IPC (IMP-022 - Parte 1)

**Files:**
- Create: `electron/serverSupervisor.ts`
- Create: `electron/serverSupervisor.test.ts`
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/fiscal-api.d.ts`
- Modify: `src/web/lib/api.ts`

**Interfaces:**
- Produces: `LocalServerSupervisor` com `start()`, `stop()`, `restart()`, `getStatus()`, controle `isStopping`, e eventos IPC `server:status`, `server:restart`.
- Types: `window.api.restartServer()` e `window.api.getServerStatus()`.

- [ ] **Step 1: Escrever teste unitário para o `LocalServerSupervisor` (RED)**
Criar `electron/serverSupervisor.test.ts` validando:
- Inicia servidor e reporta porta alocada.
- Não reinicia em parada intencional (`isStopping = true`).
- Executa auto-restart com backoff em caso de evento `'error'` ou `'close'` inesperado até 3 tentativas.
- Reporta status e métricas de restarts.

- [ ] **Step 2: Executar testes para verificar falha (RED)**
Run: `npm.cmd test -- electron/serverSupervisor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `LocalServerSupervisor`, integrar ao `main.ts` e atualizar tipagens**
1. Implementar `electron/serverSupervisor.ts` com `isStopping` e controle de lifecycle.
2. Integrar supervisor em `electron/main.ts` substituindo inicialização estática.
3. Expor `restartServer` e `getServerStatus` em `electron/preload.ts`.
4. Atualizar tipagens em `src/types/fiscal-api.d.ts` e `src/web/lib/api.ts`.

- [ ] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- electron/serverSupervisor.test.ts`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit local da Task 4**
Commit: `feat(electron): implement LocalServerSupervisor with lifecycle control and IPC bridge`

---

### Task 5: Enriquecimento do `/api/health`, Auto-Recuperação do Overlay e Endurecimento de IPC (IMP-022 - Parte 2)

**Files:**
- Create: `src/api/routes/health.test.ts`
- Modify: `src/api/app.ts`
- Modify: `src/web/components/ServerUnreachableOverlay.tsx`
- Modify: `src/web/components/ServerUnreachableOverlay.test.tsx`
- Modify: `src/web/lib/api.ts`
- Modify: `electron/main.ts`
- Modify: `electron/buscador/ipc/security.ts`

**Interfaces:**
- Produces:
  - `GET /api/health`: retorna diagnóstico completo de banco SQLite (`connected`, `journalMode`), uptime e memória.
  - `ServerUnreachableOverlay`: polling automático com auto-recuperação (`wsf:api-recovered`) e reinício via IPC.
  - IPC: verificação estrita de `event.senderFrame === mainWindow.webContents.mainFrame` em `electron/main.ts` e validação com `pathSanitizer` em `security.ts`.

- [ ] **Step 1: Escrever testes para `/api/health` enriquecido e auto-recuperação do overlay (RED)**
Criar `src/api/routes/health.test.ts` e atualizar `ServerUnreachableOverlay.test.tsx` validando payload de saúde do SQLite e emissão do evento `wsf:api-recovered`.

- [ ] **Step 2: Executar testes para verificar falha (RED)**
Run: `npm.cmd test -- src/api/routes/health.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar rota enriquecida, auto-recuperação e blindagem IPC**
1. Enriquecer `GET /api/health` em `src/api/app.ts` com probe SQLite síncrono e métricas.
2. Atualizar `ServerUnreachableOverlay.tsx` e `src/web/lib/api.ts` para polling e auto-recuperação sem reload destrutivo.
3. Blindar os handlers nativos de `electron/main.ts` com validação de senderFrame.
4. Integrar `isApprovedFolder` em `electron/buscador/ipc/security.ts` com `pathSanitizer.ts`.

- [ ] **Step 4: Executar testes para verificar aprovação (GREEN)**
Run: `npm.cmd test -- src/api/routes/health.test.ts`
Expected: PASS com 100% de sucesso.

- [ ] **Step 5: Commit local da Task 5**
Commit: `feat(transport): enrich health endpoint, auto-reconnect overlay and harden IPC handlers`

---

### Task 6: Verificação Completa de Não-Regressão, Lint e Build

**Files:**
- Test: Suíte completa do repositório (`npm test`)
- Verify: `npm run lint`
- Verify: `npm run build`

- [ ] **Step 1: Executar suíte completa de testes**
Run: `npm.cmd test`
Expected: Todas as suítes passam sem erros (100% PASS).

- [ ] **Step 2: Executar checagem de tipos e lint**
Run: `npm.cmd run lint`
Expected: 0 erros de TypeScript nos projetos web e electron.

- [ ] **Step 3: Executar build web e build electron**
Run: `npm.cmd run build`
Expected: Builds concluídos com sucesso sem erros.

- [ ] **Step 4: Commit local da Task 6**
Commit: `chore: complete phase 3 engines and transport unification validation`
