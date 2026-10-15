# Relatório 06: Plano de Testes e Matriz de Rastreabilidade (Consolidado v3.5.2)

**Projeto:** `workspace-fiscal`  
**Versão Consolidada:** v3.5.2  
**Ferramentas:** Vitest 4.1, TypeScript 5.8, LibSQL/SQLite, React 19, GitHub Actions  
**Status Atual da Suíte:** **94 Suítes de Teste Automatizadas (.test.ts / .test.tsx) — 100% Aprovadas**

---

## 1. Pirâmide e Cobertura de Testes Atual

```
┌────────────────────────────────────────────────────────┐
│   E2E & Pipelines CI (ci-workflow.test.ts)             │   2 Suítes
├────────────────────────────────────────────────────────┤
│   Testes de Integração (API, Rotas, Repos, DB, IPC)   │  28 Suítes
├────────────────────────────────────────────────────────┤
│   Testes Unitários (Core Parsers, DANFE, Backup, UI)   │  64 Suítes
└────────────────────────────────────────────────────────┘
                    TOTAL: 94 SUÍTES
```

---

## 2. Rastreabilidade das Suítes por Módulo e Melhoria

### 2.1. Segurança, Autenticação e Sanitização
| Teste | Arquivo | Cobertura / Garantia |
| :--- | :--- | :--- |
| **IMP-001 / SEC-02** | `src/api/middleware/localAuth.test.ts` | Handshake de token `X-Workspace-Token`, bloqueio 403 em requests sem credencial. |
| **IMP-009 / SEC-04** | `src/core/security/pathSanitizer.test.ts` | Bloqueio de caminhos maliciosos (`../`, separadores relativos). |
| **IMP-008 / XSS** | `src/core/danfe/danfe-xss.test.ts` | Sanitização de campos textuais e chaves em layouts DANFE/DACTE. |
| **IMP-T01 / Bomb** | `src/core/buscador/fiscal/utils/compression.test.ts` | Defesa contra Gzip Bombs (bloqueio > 15 MB) em retornos SEFAZ/NFS-e. |
| **IMP-T02 / Bomb** | `src/core/parsers/parsers.test.ts` | Defesa contra XML Bombs (> 25 MB) antes do parsing SAX. |

### 2.2. Banco de Dados SQLite Unificado e Migrações
| Teste | Arquivo | Cobertura / Garantia |
| :--- | :--- | :--- |
| **IMP-003 / Schema** | `src/db/db-modules.test.ts` | Criação de tabelas unificadas, triggers e índices compostos (IMP-T04). |
| **IMP-003 / Legacy** | `src/db/legacy-buscador-migration.test.ts` | Transposição transparente de dados legados do `fiscal_storage.db`. |
| **IMP-003 / Conexão** | `src/core/buscador/database/connection.test.ts` | Conexão compartilhada, verificação de integridade e WAL. |
| **IMP-015 / Empresas**| `CompanyRepository.test.ts` | Deduplicação e sincronização de cadastros de empresas. |

### 2.3. Motores Fiscais, Reforma Tributária e DANFE
| Teste | Arquivo | Cobertura / Garantia |
| :--- | :--- | :--- |
| **IMP-005 / Parsers** | `src/core/parsers/parsers.test.ts`, `detector.test.ts` | NF-e, CT-e, NFS-e nacional e municipal. |
| **IMP-006 / RTC 2026**| `rtc-taxes.utils.test.ts`, `xml-number.utils.test.ts` | Extração de IBS, CBS e Imposto Seletivo (IS). |
| **IMP-007 / Wire** | `OfficialNfseWireContract.test.ts` | Contrato de distribuição e download oficial NFS-e ADN/Sefin. |
| **IMP-011 / Status** | `fiscal-status.utils.test.ts`, `document-search.test.ts` | Normalização de eventos fiscais e pesquisa de itens. |

### 2.4. Validação REST, Backups e Performance
| Teste | Arquivo | Cobertura / Garantia |
| :--- | :--- | :--- |
| **IMP-T03 / Validators**| `src/api/validators/validators.test.ts` | Validação de workspace, documents, settings, companies e assets. |
| **IMP-T03 / Routes** | `src/api/routes/validation-routes.test.ts` | Respostas padronizadas HTTP 400 (`{ error, details }`). |
| **IMP-T05 / Backup** | `src/api/services/backup/backup-modules.test.ts` | Backup seletivo, SHA-256 e restauração do módulo BUSCADOR. |
| **IMP-014 / Service** | `src/api/services/backup.service.test.ts` | Cenários A a I cobrindo `.wfb` atômico e retenção. |
| **IMP-T06 / Import** | `src/api/routes/import.routes.test.ts` | Cedência do Event Loop a cada 25 arquivos processados. |

### 2.5. Frontend, Acessibilidade e Memoização
| Teste | Arquivo | Cobertura / Garantia |
| :--- | :--- | :--- |
| **IMP-T07 / Tree** | `workspace-tree.test.ts`, `workspace.test.ts` | Memoização (`React.memo`) de `WorkspaceTreeNode` e subpastas recursivas. |
| **IMP-T08 / Dialog** | `ConfirmDialog.test.ts`, `ConfirmModal.test.ts` | Focus trap, acessibilidade WAI-ARIA e tecla Escape com `useDialogFocus`. |
| **IMP-021 / Telemetria**| `BuscadorModals.test.ts`, `activity-log.test.ts` | Exibição de logs operacionais e feedback interativo. |

### 2.6. Integração Contínua e Governança de Dependências
| Teste | Arquivo | Cobertura / Garantia |
| :--- | :--- | :--- |
| **IMP-T09 / CI/CD** | `tests/ci-workflow.test.ts` | Pipeline GitHub Actions com `npm ci`, `npm audit --omit=dev --audit-level=high`, lint, vitest e build. |

---

## 3. Comandos de Execução e Verificação

- **Execução Geral dos Testes:** `npm test`
- **Execução Isolada por Módulo:** `npx vitest run src/api/validators/ src/api/services/backup/`
- **Auditoria de Vulnerabilidades:** `npm audit --omit=dev --audit-level=high` (0 vulnerabilidades)
- **Validação de Tipos TypeScript:** `npm run lint`
