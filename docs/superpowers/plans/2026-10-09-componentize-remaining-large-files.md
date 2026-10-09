# Componentização Segura dos 7 Arquivos Restantes (> 400 Linhas)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Componentizar com segurança e modularidade os 7 arquivos restantes com mais de 400 linhas no projeto (`nfse.parser.ts`, `CsvLayoutModal.tsx`, `db/index.ts`, `cte.parser.ts`, `UpdatePromptModal.tsx`, `DistributionEngine.ts`, `BuscadorSettingsTab.tsx`), garantindo 100% de integridade funcional, zero quebra de contratos de exportação ou interfaces públicas, validações completas (testes, lint, build) e commits locais individuais.

**Architecture:** Padrão de orquestração limpa com submódulos coesos em diretórios dedicados (`src/core/parsers/nfse/`, `src/web/features/depreciation/csv-layout/`, `src/db/`, `src/core/parsers/cte/`, `src/web/components/update-modal/`, `src/core/buscador/fiscal/services/distribution/`, `src/web/components/settings/buscador/`). Cada arquivo orquestrador re-exporta as interfaces originais para total retrocompatibilidade e delega para módulos especializados testados unitariamente.

**Tech Stack:** TypeScript, React, Vite, Zustand, Tailwind CSS, Lucide Icons, SQLite (@libsql/client, Drizzle ORM), Vitest.

---

## Global Constraints
- NUNCA executar `git push` — apenas commits locais individuais.
- Zero alteração de comportamento, contratos de dados, rotas de API, persistência de configurações ou layouts de UI.
- Cada fase/tarefa deve incluir testes unitários dedicados, passar em `npx vitest run --fileParallelism=false`, `npm run lint`, `npm run build` e receber um commit local antes de avançar para a próxima.

---

## Task List

### Tarefa 1: `src/core/parsers/nfse.parser.ts` (540 linhas)
- [ ] Criar diretório `src/core/parsers/nfse/`.
- [ ] Extrair utilitários numéricos em `src/core/parsers/nfse/nfse-number.utils.ts`.
- [ ] Extrair parser Sefin Nacional em `src/core/parsers/nfse/nfse-sefin.parser.ts`.
- [ ] Extrair parser Municipal em `src/core/parsers/nfse/nfse-municipal.parser.ts`.
- [ ] Extrair parser ABRASF (prestador, tomador, totais) em `src/core/parsers/nfse/nfse-abrasf.parser.ts`.
- [ ] Criar barrel `src/core/parsers/nfse/index.ts`.
- [ ] Refatorar `src/core/parsers/nfse.parser.ts` como orquestrador que herda `FiscalParser` e delega para os submódulos.
- [ ] Criar suíte de testes unitários `src/core/parsers/nfse/nfse-parsers-modules.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(parsers): componentize nfse.parser into sefin, municipal and abrasf modules`.

### Tarefa 2: `src/web/features/depreciation/CsvLayoutModal.tsx` (495 linhas)
- [ ] Criar diretório `src/web/features/depreciation/csv-layout/`.
- [ ] Extrair contratos e definições em `src/web/features/depreciation/csv-layout/csv-layout.types.ts` e `csv-layout.constants.ts`.
- [ ] Extrair barra de opções de formato em `src/web/features/depreciation/csv-layout/CsvFormatOptionsBar.tsx`.
- [ ] Extrair lista/tabela de mapeamento de campos em `src/web/features/depreciation/csv-layout/CsvFieldMappingList.tsx`.
- [ ] Extrair painel de preview ao vivo em `src/web/features/depreciation/csv-layout/CsvLivePreviewPane.tsx`.
- [ ] Criar barrel `src/web/features/depreciation/csv-layout/index.ts`.
- [ ] Refatorar `CsvLayoutModal.tsx` como orquestrador limpo mantendo exatamente as mesmas props e estado.
- [ ] Criar suíte de testes unitários `src/web/features/depreciation/csv-layout/csv-layout.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(depreciation): componentize CsvLayoutModal into format options, mapping list and preview modules`.

### Tarefa 3: `src/db/index.ts` (469 linhas)
- [ ] Extrair resolução de caminhos e backup de arquivos corrompidos em `src/db/db-paths.ts`.
- [ ] Extrair cliente LibSQL, Drizzle e reconfiguração em `src/db/db-client.ts`.
- [ ] Extrair DDLs de tabelas, índices e migrações em `src/db/db-schema-init.ts`.
- [ ] Extrair rotinas de integridade e manutenção em `src/db/db-maintenance.ts`.
- [ ] Refatorar `src/db/index.ts` como orquestrador re-exportando `db`, `rawClient`, `DB_PATH`, `initDatabase`, etc.
- [ ] Criar suíte de testes unitários `src/db/db-modules.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(db): componentize db initialization into paths, client, schema and maintenance modules`.

### Tarefa 4: `src/core/parsers/cte.parser.ts` (449 linhas)
- [ ] Criar diretório `src/core/parsers/cte/`.
- [ ] Extrair parser de partes (emitente, remetente, tomador, destinatário) em `src/core/parsers/cte/cte-parties.parser.ts`.
- [ ] Extrair parser de carga, componentes de frete, documentos e modal em `src/core/parsers/cte/cte-cargo.parser.ts`.
- [ ] Extrair parser fiscal de ICMS e duplicatas/faturamento em `src/core/parsers/cte/cte-fiscal.parser.ts`.
- [ ] Criar barrel `src/core/parsers/cte/index.ts`.
- [ ] Refatorar `src/core/parsers/cte.parser.ts` como orquestrador limpo.
- [ ] Criar suíte de testes unitários `src/core/parsers/cte/cte-parser.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(parsers): componentize cte.parser into parties, cargo and fiscal modules`.

### Tarefa 5: `src/web/components/UpdatePromptModal.tsx` (448 linhas)
- [ ] Criar diretório `src/web/components/update-modal/`.
- [ ] Extrair cabeçalho com status e ícones em `src/web/components/update-modal/UpdateModalHeader.tsx`.
- [ ] Extrair corpo do modal (progresso, versão, release notes, erros) em `src/web/components/update-modal/UpdateModalBody.tsx`.
- [ ] Extrair barra de rodapé com ações em `src/web/components/update-modal/UpdateModalFooter.tsx`.
- [ ] Criar barrel `src/web/components/update-modal/index.ts`.
- [ ] Refatorar `UpdatePromptModal.tsx` como orquestrador limpo mantendo animações `motion/react`.
- [ ] Criar suíte de testes unitários `src/web/components/update-modal/update-modal.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(update): componentize UpdatePromptModal into header, body and footer components`.

### Tarefa 6: `src/core/buscador/fiscal/services/DistributionEngine.ts` (435 linhas)
- [ ] Criar diretório `src/core/buscador/fiscal/services/distribution/`.
- [ ] Extrair helpers de estado e cursores NSU em `src/core/buscador/fiscal/services/distribution/distribution-state.helper.ts`.
- [ ] Extrair processador de lote de documentos e eventos em `src/core/buscador/fiscal/services/distribution/distribution-batch-processor.ts`.
- [ ] Criar barrel `src/core/buscador/fiscal/services/distribution/index.ts`.
- [ ] Refatorar `DistributionEngine.ts` como orquestrador limpo de queries SEFAZ.
- [ ] Criar suíte de testes unitários `src/core/buscador/fiscal/services/distribution/distribution-engine.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(buscador): componentize DistributionEngine into batch processor and state helpers`.

### Tarefa 7: `src/web/components/settings/BuscadorSettingsTab.tsx` (427 linhas)
- [ ] Criar diretório `src/web/components/settings/buscador/`.
- [ ] Extrair card de empresa ativa e certificado em `src/web/components/settings/buscador/ActiveCompanyCard.tsx`.
- [ ] Extrair cards de ambientes SEFAZ e NFS-e em `src/web/components/settings/buscador/EnvironmentsCard.tsx`.
- [ ] Extrair card de diretório de armazenamento e automação em `src/web/components/settings/buscador/StorageSettingsCard.tsx`.
- [ ] Criar barrel `src/web/components/settings/buscador/index.ts`.
- [ ] Refatorar `BuscadorSettingsTab.tsx` como orquestrador limpo.
- [ ] Criar suíte de testes unitários `src/web/components/settings/buscador/buscador-settings.test.ts`.
- [ ] Validar com Vitest, Lint e Build.
- [ ] Commit local: `refactor(settings): componentize BuscadorSettingsTab into company, environment and storage cards`.

