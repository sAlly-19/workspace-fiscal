# Relatório 04: Catálogo de Melhorias Priorizadas e Concluídas (Consolidado v3.5.2)

**Projeto:** `workspace-fiscal`  
**Versão Consolidada:** v3.5.2  
**Status:** Todas as 25 melhorias originais (IMP-001 a IMP-025) e as 10 tarefas de hardening pós-auditoria (IMP-T01 a IMP-T10) estão **100% IMPLEMENTADAS E VALIDADAS**.

---

## 1. Matriz de Entregas das 6 Fases de Engenharia

| ID | Título da Melhoria | Fase | Status v3.5.2 | Arquivos de Referência |
| :--- | :--- | :--- | :--- | :--- |
| **IMP-001** | Blindagem da API Express com Token de Sessão Local | Fase 1 | **Concluído** | `src/api/middleware/localAuth.ts`, `server.ts` |
| **IMP-002** | Ponte PowerShell via Stdin sem Arquivos em Disco | Fase 1 | **Concluído** | `src/core/buscador/certificates/`, `windows-bridge.ps1` |
| **IMP-003** | Unificação dos Bancos de Dados em Schema Único SQLite | Fase 2 | **Concluído** | `src/db/schema.ts`, `src/db/legacy-buscador-migration.ts` |
| **IMP-004** | Precisão Exata em Centavos e Rateio sem Desvio | Fase 1 | **Concluído** | `src/core/depreciation/` |
| **IMP-005** | Unificação dos Parsers Fiscais em Módulo Único | Fase 3 | **Concluído** | `src/core/parsers/`, `detector.ts` |
| **IMP-006** | Suporte aos Grupos IBS, CBS e Imposto Seletivo (Reforma 2026) | Fase 5 | **Concluído** | `src/core/parsers/utils/rtc-taxes.utils.ts` |
| **IMP-007** | Manifestação do Destinatário Automática SEFAZ (210210) | Fase 3 | **Concluído** | `DistributionEngine.ts`, `OfficialNfseWireContract.ts` |
| **IMP-008** | Unificação de Layouts DANFE/DACTE com ViewModels | Fase 3 | **Concluído** | `src/core/danfe/view-models/`, `escapeHtml.ts` |
| **IMP-009** | Sanitizador Global de Caminhos contra Path Traversal | Fase 1 | **Concluído** | `src/core/security/pathSanitizer.ts` |
| **IMP-010** | Provedor Nativo de Certificados A1 (`.pfx`) | Fase 6 | **Concluído** | `src/core/buscador/certificates/` |
| **IMP-011** | Normalização de Mapeamento de Status de DF-e | Fase 3 | **Concluído** | `src/web/features/documents/preview/fiscal-status.utils.ts` |
| **IMP-012** | Controle de Créditos de ICMS (CIAP) e PIS/COFINS | Fase 5 | **Concluído** | `src/core/depreciation/` |
| **IMP-013** | Fila Assíncrona de Download com Rate-Limiting SEFAZ | Fase 5 | **Concluído** | `src/core/buscador/fiscal/` |
| **IMP-014** | Rotina Transacional Atômica de Backup e Restauração | Fase 2 | **Concluído** | `src/api/services/backup/`, `.wfb format` |
| **IMP-015** | Sincronização e Deduplicação de Cadastros de Empresas | Fase 2 | **Concluído** | `src/api/repositories/companies.repository.ts` |
| **IMP-016** | Handlers Electron IPC para Rotas de Documentos e Ativos | Fase 4 | **Concluído** | `electron/buscador/ipc/`, `preload.ts` |
| **IMP-017** | `UnifiedApiClient` no Frontend com Fallback IPC/HTTP | Fase 4 | **Concluído** | `src/web/lib/api.ts` |
| **IMP-018** | Emissão de DANFE Simplificado e Etiqueta NFC-e | Fase 3 | **Concluído** | `src/core/danfe/renderers/` |
| **IMP-019** | Desativação Gradual e Opcional do Express em Produção | Fase 4 | **Concluído** | `server.ts`, `main.ts` |
| **IMP-020** | Resiliência com Circuit Breaker e Backoff Exponencial | Fase 6 | **Concluído** | `src/core/buscador/fiscal/` |
| **IMP-021** | Painel Unificado de Logs de Auditoria e Telemetria | Fase 6 | **Concluído** | `activity-log.service.ts`, `ActivityLogsModal.tsx` |
| **IMP-022** | Verificação Automática de Integridade de Banco no Boot | Fase 6 | **Concluído** | `verifyIntegrityOrRecover` em `src/db/` |
| **IMP-023** | Valoração de CTe e Rateio de Frete no Ativo Imobilizado | Fase 5 | **Concluído** | `src/core/depreciation/` |
| **IMP-024** | Módulo de Exportação para SPED Fiscal (Bloco G) | Fase 6 | **Concluído** | `src/api/routes/exports.routes.ts` |
| **IMP-025** | Execução Headless com Agendador em Segundo Plano (Tray) | Fase 6 | **Concluído** | `electron/main.ts`, `backup-scheduler.ts` |

---

## 2. Hardening e Refinamentos Pós-Auditoria (IMP-T01 a IMP-T10)

| ID | Área | Descrição da Entrega | Status |
| :--- | :--- | :--- | :--- |
| **IMP-T01** | Defesa SEFAZ | Guarda de descompressão `{ maxOutputLength: 15 * 1024 * 1024 }` em `compression.ts`. | **Concluído** |
| **IMP-T02** | Defesa XML | Limite de tamanho máximo de 25 MB em `BaseParser.parseXml` antes da invocação do parser. | **Concluído** |
| **IMP-T03** | Contratos REST | Validadores tipados para workspace, documents e settings com retorno HTTP 400 padronizado. | **Concluído** |
| **IMP-T04** | Banco SQLite | Índices compostos `idx_documents_batch_type` e `idx_documents_batch_issue_date` adicionados ao schema. | **Concluído** |
| **IMP-T05** | Backup Submodules | Cobertura unitária em `backup-modules.test.ts` cobrindo criação, SHA-256 e restore do Buscador. | **Concluído** |
| **IMP-T06** | Performance | Cedência cooperativa do Event Loop (`setImmediate`) a cada 25 arquivos processados em lote. | **Concluído** |
| **IMP-T07** | Otimização UI | Memoização (`React.memo`) em `WorkspaceTreeNode.tsx` para árvores com centenas de diretórios. | **Concluído** |
| **IMP-T08** | Acessibilidade UI | Alinhamento do `ConfirmDialog.tsx` com `useDialogFocus`, `role="dialog"`, `aria-modal` e Escape trap. | **Concluído** |
| **IMP-T09** | CI/CD & CVEs | Overrides de dependências (adm-zip, multer, proxy-addr, source-map-js) com 0 CVEs e passo no GitHub Actions. | **Concluído** |
| **IMP-T10** | Documentação | Atualização integral dos 8 relatórios técnicos consolidando o estado final v3.5.2. | **Concluído** |
