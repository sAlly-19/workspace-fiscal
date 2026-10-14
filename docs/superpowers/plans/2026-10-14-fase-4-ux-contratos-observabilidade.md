# Fase 4: Consolidação de UX/UI, Validação de Contratos API/IPC e Observabilidade Segura LGPD — Plano de Implementação TDD

- **Data**: 2026-10-14
- **Status**: Concluído (100% dos testes, lint e build aprovados)
- **Escopo**: IMP-011, IMP-012, IMP-018, IMP-021, IMP-023
- **Documento de Design**: `docs/superpowers/specs/2026-10-14-fase-4-ux-contratos-observabilidade-design.md`
- **Diretrizes Estritas**:
  - TDD Estrito: Red -> Green -> Commit local por tarefa.
  - Zero dependências pesadas externas (sem Zod/Joi; validadores TypeScript puros).
  - Preservação de 100% dos 398 testes existentes (68 suítes).
  - **NUNCA executar `git push`. Apenas commits locais.**

---

## Salvaguardas Técnicas Integradas

1. **IMP-018 (`dataRedactor.ts`)**:
   - Manter allowlist explícita para chaves de integridade técnica e fiscais: `sha256`, `checksum`, `hash`, `fileHash`, `thumbprint`, `accessKey`, `chaveAcesso`, `chave`, `nfeId`, `cteId`, `nfseId`, `nsu`, `lastNsu`, `maxNsu`.
   - NÃO utilizar regex indiscriminada de 64 caracteres hexadecimais em qualquer string solta para evitar corromper checksums de backup e thumbprints. Redação focada em propriedades com nomes sensíveis (`password`, `token`, `secret`, `pfx`, `certPassword`), blocos PEM (`BEGIN ... PRIVATE KEY`), Bearer tokens e JWTs.
2. **IMP-011 (`company.validator.ts`)**:
   - Reutilizar `isValidCNPJ` e `sanitizeCNPJ` de `src/core/buscador/domain/cnpj.ts`.
   - Permitir suporte a CNPJs sintéticos em testes ou via opção/ambiente garantindo 0 regressões em qualquer suíte existente.
3. **IMP-023 (`useGlobalKeyboardShortcuts.ts`)**:
   - Além da verificação `isEditableTarget` (ignorar teclas simples em inputs/textareas), bloquear atalhos de troca de módulo (`Ctrl+1..4` / `Cmd+1..4`) quando houver diálogo aberto no DOM (`document.querySelector('[role="dialog"][aria-modal="true"]')`), impedindo perda acidental de digitação em formulários de modais.

---

## Detalhamento das Tarefas

### Task 1: IMP-018 — Motor de Redação Recursiva LGPD e Auditoria Sanitizada
- **Arquivos a criar/modificar**:
  - `src/core/security/dataRedactor.ts` (novo)
  - `src/core/security/dataRedactor.test.ts` (novo)
  - `src/api/utils/logger.ts` (modificado)
  - `src/api/services/activity-log.service.ts` (modificado)
- **TDD Red**:
  - Criar `src/core/security/dataRedactor.test.ts` testando mascaramento de senhas, tokens, pfx, pem, bearer, integridade com allowlist (`sha256`, `accessKey`), e proteção contra ciclos `WeakSet`.
- **TDD Green**:
  - Implementar `dataRedactor.ts`.
  - Integrar no `logger.ts` (redact paths) e no `ActivityLogService.record` (persistir apenas dados sanitizados no SQLite).
- **Commit**: `feat(security): implement recursive lgpd data redaction for logs and audit trail`

### Task 2: IMP-011 — Validadores de Contrato de Entrada REST API (HTTP 400 Padronizado)
- **Arquivos a criar/modificar**:
  - `src/api/validators/company.validator.ts` (novo)
  - `src/api/validators/asset.validator.ts` (novo)
  - `src/api/validators/category.validator.ts` (novo)
  - `src/api/validators/depreciation.validator.ts` (novo)
  - `src/api/validators/index.ts` (novo)
  - `src/api/validators/validators.test.ts` (novo)
  - `src/api/routes/companies.routes.ts` (modificado)
  - `src/api/routes/assets.routes.ts` (modificado)
  - `src/api/routes/categories.routes.ts` (modificado)
  - `src/api/routes/depreciation.routes.ts` (modificado)
  - `src/api/routes/validation-routes.test.ts` (novo)
- **TDD Red**:
  - Criar testes unitários em `validators.test.ts` e de integração HTTP em `validation-routes.test.ts`.
- **TDD Green**:
  - Implementar validadores tipados e integrar nas rotas Express com formato `{ error: string, details: string[] }`.
- **Commit**: `feat(api): add strict input contract validation and standardized 400 bad request handling`

### Task 3: IMP-021 — Hook de Foco Compartilhado e Acessibilidade Universal em Diálogos
- **Arquivos a criar/modificar**:
  - `src/web/hooks/useDialogFocus.ts` (novo)
  - `src/web/hooks/useDialogFocus.test.ts` (novo)
  - `src/web/features/buscador/hooks/useDialogFocus.ts` (re-exportar do hook universal)
  - `src/web/components/ConfirmModal.tsx` (modificado: `role="dialog"`, `aria-modal="true"`, Escape, focus trap)
  - `src/web/components/ConfirmModal.test.tsx` (novo)
- **TDD Red**:
  - Criar testes unitários para `useDialogFocus` e `ConfirmModal`.
- **TDD Green**:
  - Migrar `useDialogFocus` para `src/web/hooks/` e aplicar no `ConfirmModal.tsx`.
- **Commit**: `feat(ui): unify accessible dialog focus trap and wai-aria support for confirm modals`

### Task 4: IMP-012 — Sincronização Reativa e Modal de Empresa da Depreciação
- **Arquivos a criar/modificar**:
  - `src/web/features/depreciation/components/modals/CompanyModal.tsx` (modificado: máscara CNPJ, validação, UF oficial, ARIA)
  - `src/web/features/depreciation/components/modals/CompanyModal.test.tsx` (novo)
  - `src/web/features/depreciation/DepreciationApp.tsx` (modificado: listener `wsf:companies-updated`)
  - `src/web/features/buscador/BuscadorApp.tsx` (modificado: listener `wsf:companies-updated`)
- **TDD Red**:
  - Criar teste do `CompanyModal.tsx` cobrindo formatação dinâmica de CNPJ, feedback de validação e emissão do evento.
- **TDD Green**:
  - Implementar melhorias no `CompanyModal.tsx` e registrar listeners do CustomEvent nos módulos.
- **Commit**: `feat(depreciation): enhance company modal with cnpj mask, validation and cross-module sync`

### Task 5: IMP-023 — Atalhos Globais de Produtividade com Proteção de Foco e Modais
- **Arquivos a criar/modificar**:
  - `src/web/hooks/useGlobalKeyboardShortcuts.ts` (novo)
  - `src/web/hooks/useGlobalKeyboardShortcuts.test.ts` (novo)
  - `src/web/App.tsx` (modificado: ativar hook com callbacks de navegação e abertura de modais)
- **TDD Red**:
  - Criar testes unitários para `useGlobalKeyboardShortcuts` cobrindo combinações de teclas, bloqueio com foco em inputs e bloqueio de `Ctrl+1..4` quando modal estiver aberto.
- **TDD Green**:
  - Implementar hook e plugar no `App.tsx`.
- **Commit**: `feat(ux): add global keyboard navigation shortcuts with modal and input protection`

### Task 6: Verificação de Qualidade Final, Não-Regressão e Commit de Encerramento
- Executar suíte completa: `npm test`
- Executar verificação de lint: `npm run lint`
- Executar build de produção: `npm run build`
- Confirmar zero regressões e árvore Git limpa.

