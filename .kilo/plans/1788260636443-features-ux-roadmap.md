# Plano: 20 Novas Funções + 10 Melhorias UI/UX — Workspace Fiscal

**Escopo:** sugestões de evolução do produto, baseadas na estrutura atual (`src/api/`, `src/core/`, `src/web/`).
**Status:** rascunho de features; nenhum item foi aprovado para implementação ainda.
**Out of scope nesta rodada:** mudanças de schema destrutivas, autenticação multi-usuário, sync na nuvem.

---

## 1. Contexto do Produto Atual

Workspace Fiscal é um app Electron + Vite/React + Express + SQLite (libSQL) para gestão de documentos fiscais eletrônicos brasileiros (NFe/NFCe/CTe/NFSe) e controle de depreciação de ativos.

**Domínios existentes:**
- `src/core/parsers/` — parsers de XML fiscal (NFe, NFCe, CTe, NFSe ABRASF/Sefin/Municipal)
- `src/core/danfe/` — renderização HTML de DANFE/DACTE/NFSe
- `src/core/depreciation/` — motor de cálculo de depreciação (centavos)
- `src/api/services/` — import, depreciation, storage
- `src/api/routes/` — REST por entidade (companies, categories, assets, documents, etc.)
- `src/web/features/` — UI por feature (home, workspace, depreciation, documents)

---

## 2. 20 Novas Funções

Cada item traz **descrição**, **arquivos-alvo**, **dependências internas** e **critério de aceite**.

### Bloco A — Produtividade Fiscal (parsers & documentos)

**F1. Conciliação automática NFe ↔ XML de cancelamento/eventos**
Detectar notas com `status=CANCELLED` mas sem `cancellation_protocol` registrado; emitir alerta na listagem e oferecer atalho para reimportar XML de evento.
- Alvos: `src/core/parsers/event.parser.ts` (novo), `src/api/services/import.service.ts`, `src/web/features/documents/DocumentPreview.tsx`
- Critério: nota cancelada mostra banner amarelo + botão "Ver evento".

**F2. Importação em lote a partir de diretório (watch folder)**
Botão "Importar pasta" no modal de import que recebe `dialog:openImport` com `properties: ['openDirectory']` e varre recursivamente por XMLs (com filtro de tamanho/data).
- Alvos: `electron/main.ts` (novo handler), `src/api/services/import.service.ts` (batch recursivo), `src/web/components/ImportProgressModal.tsx`
- Critério: usuário escolhe `~/notas/2026/` e app importa tudo com progresso.

**F3. Deduplicação por chave de acesso com política configurável**
No import, decidir (a) ignorar duplicata, (b) sobrescrever, (c) criar versão. Hoje o comportamento é silencioso.
- Alvos: `src/api/services/import.service.ts`, `src/web/components/SettingsModal.tsx` (opção), `src/db/schema.ts` (nova tabela `import_dedupe_policy`)
- Critério: Settings permite escolher política; reimportar mesma nota respeita escolha.

**F4. Detecção de NCM duplicado por empresa**
Relatório `GET /api/analytics/ncm-duplicates` retornando NCMs que aparecem em mais de X notas para o mesmo emitente no mesmo mês (possível fraude de glosa).
- Alvos: `src/api/routes/analytics.routes.ts`, `src/api/repositories/analytics.repository.ts`, `src/web/features/home/Home.tsx`
- Critério: card na home mostra top-3 NCMs suspeitos.

**F5. Carta de correção (CC-e) — renderização e histórico**
Parse do XML de evento 110110 + exibição sequencial na DocumentPreview.
- Alvos: `src/core/parsers/cce.parser.ts` (novo), `src/web/features/documents/DocumentPreview.tsx`
- Critério: lista cronológica de CC-e com texto + protocolo + data/hora.

**F6. Exportação SPED Fiscal / Contribuições (bloco 0200/0205/0220)**
Geração TXT do Registro 0200 (mercadorias) e 0220 (valores) a partir dos documentos filtrados por período/empresa.
- Alvos: `src/api/services/sped.service.ts` (novo), `src/api/routes/exports.routes.ts` (rota `POST /api/exports/sped`)
- Critério: download de TXT validável em `validador.sped.fazenda.gov.br` (estrutura).

**F7. Exportação para CSV/XLSX com colunas configuráveis**
Hoje há export HTML/PDF. CSV/XLSX é tabelável em Excel diretamente.
- Alvos: `src/api/routes/exports.routes.ts`, dependência `exceljs`
- Critério: usuário escolhe colunas em modal; download respeita.

### Bloco B — Depreciação & Contábil

**F8. Simulador de depreciação acelerada / adicional**
Permitir calcular quota adicional (ex: turno de 16h, insalubridade) sobre a tabela atual sem persistir.
- Alvos: `src/core/depreciation/calculate.ts` (parâmetro `additionalRate`), `src/web/features/depreciation/DepreciationApp.tsx` (botão "Simular")
- Critério: simulação retorna schedule alternativo; comparação lado-a-lado.

**F9. Recálculo retroativo ao mudar taxa/categoria**
Hoje mudar `annual_rate` ou `category_id` em um bem existente não reprocessa o histórico. Implementar "Recalcular desde aquisição" com confirmação.
- Alvos: `src/api/services/depreciation.service.ts` (função `recalculateAsset(id)`), rota `POST /api/assets/:id/recalculate`
- Critério: modal de confirmação exibe quantos meses serão recriados.

**F10. Livro de inventário anual**
Relatório anual por empresa com saldo inicial, aquisições, baixas, depreciação acumulada e saldo final por categoria, exportável.
- Alvos: `src/api/services/depreciation.service.ts`, `src/api/routes/exports.routes.ts`
- Critério: PDF/XLSX gerado a partir de `/api/exports/inventory?year=2025&companyId=...`.

**F11. Conciliação depreciação × ativo baixado**
Quando `disposed_at` é setado, gerar entry final residual e travar entries futuras.
- Alvos: `src/api/repositories/assets.repository.ts`, `src/api/services/depreciation.service.ts` (regra no `disposeAsset`)
- Critério: após baixa, tentativa de editar entries antigos retorna 409.

**F12. Importação de ativos via XML de NF-e (autopreenchimento)**
Arrastar XML de NFe de aquisição de ativo → extrai fornecedor, valor, data, descrição, NCM e pré-popula form de cadastro.
- Alvos: `src/core/parsers/nfe.parser.ts` (já retorna dados), `src/web/features/depreciation/DepreciationApp.tsx` (drop zone)
- Critério: drop mostra modal com dados extraídos + categoria sugerida.

### Bloco C — Busca, Análise, Auditoria

**F13. Busca full-text nos campos de produtos/itens**
Criar índice FTS5 virtual table em SQLite (`documents_fts`) e expôr `/api/documents?q=...`.
- Alvos: `src/db/schema.ts` (FTS5 virtual), migração em `src/db/index.ts`, `src/api/repositories/documents.repository.ts`
- Critério: buscar "notebook dell" retorna itens correspondentes nas notas com highlight.

**F14. Linha do tempo de eventos por documento (timeline view)**
Visual unificado: emissão → eventos → cancelamento → baixa contábil (se aplicável).
- Alvos: `src/web/features/documents/DocumentPreview.tsx` (novo componente `Timeline.tsx`)
- Critério: timeline vertical com ícones por tipo + datas.

**F15. Auditoria de alterações (audit log)**
Tabela `audit_log` (entity_type, entity_id, action, old_value, new_value, user, timestamp) preenchida via triggers ou middleware.
- Alvos: `src/db/schema.ts` (nova tabela), `src/api/middleware/audit.ts` (novo), aplicado em mutações de `assets` e `companies`
- Critério: página `/audit` lista últimas 100 ações; filtros por entidade.

**F16. Comparador lado-a-lado de DANFEs**
Selecionar 2+ notas e abrir visualização comparativa de totais, emitente, destinatário.
- Alvos: `src/web/features/documents/CompareView.tsx` (novo)
- Critério: tabela responsiva com diff de campos-chave.

### Bloco D — Sistema & Operacional

**F17. Backup automático agendado do SQLite**
Job local (node-cron) que copia `workspace-fiscal.sqlite` para `~/backups/wsf-YYYY-MM-DD.db` mantendo últimos 30.
- Alvos: `src/api/services/backup.service.ts` (novo), agendado em `electron/main.ts` ou hook no app
- Critério: ao iniciar, cria backup se data do último > 7 dias; settings permitem configurar.

**F18. Tema claro/escuro + tema "alto contraste"**
Hoje o app tem só dark. Adicionar light theme via CSS variables + toggle.
- Alvos: `src/web/App.tsx`, `index.html`, adição de variáveis em tailwind config
- Critério: toggle na TitleBar; preference salva no localStorage.

**F19. Atalhos de teclado globais (Electron)**
`Ctrl+I` importar, `Ctrl+F` buscar, `Ctrl+E` exportar, `Ctrl+,` settings — registrados via `globalShortcut` ou accelerators no Menu.
- Alvos: `electron/main.ts` (Menu accelerators), `src/web/hooks/useShortcuts.ts` (novo)
- Critério: 4 atalhos funcionando em qualquer página.

**F20. Diagnóstico / "ping" de saúde do app**
Painel `/diagnostics` mostrando: versão Electron, Node, libSQL, espaço em disco, contagem de docs/assets, último backup, integridade DB.
- Alvos: `src/api/routes/diagnostics.routes.ts` (novo), `src/web/features/diagnostics/Diagnostics.tsx`
- Critério: tela abre com todas métricas; botão "Rodar integrity_check" executa PRAGMA.

---

## 3. 10 Melhorias de UI/UX

Cada item: **problema atual**, **proposta**, **arquivos-alvo**, **critério**.

### UX1. Empty states informativos com CTA
**Problema:** listagens vazias (sem documentos, sem ativos, sem pastas) aparecem em branco.
**Proposta:** componente `<EmptyState icon title description cta>` com ilustração leve e botão de ação primária.
- Alvos: `src/web/components/EmptyState.tsx` (novo), aplicar em `WorkspaceTree.tsx`, `DepreciationApp.tsx`, listagem de documentos
- **Critério:** todo estado vazio tem ícone + frase + botão.

### UX2. Feedback de ação com toast (não alert/console)
**Problema:** mutações bem-sucedidas parecem silenciosas (apenas reload); erros usam `alert()` ou `console.error`.
**Proposta:** biblioteca `sonner` ou `<Toast>` próprio; success/error/info padronizados.
- Alvos: `src/web/components/Toast.tsx` (novo), `src/web/App.tsx` (provider)
- **Critério:** toda mutação dispara toast; erros 4xx/5xx mostram mensagem amigável.

### UX3. Confirmação visual em ações destrutivas (excluir, baixar)
**Problema:** exclusões diretas ou já usam `ConfirmModal`, mas inconsistente entre features.
**Proposta:** padronizar `ConfirmModal` com gravidade (`danger`/`warning`/`info`) + texto de confirmação digitado para ações críticas.
- Alvos: `src/web/components/ConfirmModal.tsx` (refator), rotas de delete
- **Critério:** exclusão de empresa pede digitação do CNPJ.

### UX4. Loading states com skeleton (não spinner genérico)
**Problema:** listas e tabelas ficam vazias durante fetch inicial.
**Proposta:** `<Skeleton>` componente replicando shape da linha.
- Alvos: `src/web/components/Skeleton.tsx` (novo), aplicado em `WorkspaceTree`, listagem de docs, `DepreciationApp`
- **Critério:** primeira render mostra skeleton; após fetch, transição suave.

### UX5. Filtros persistentes na URL (deep-linking)
**Problema:** filtros (empresa, mês, tipo) resetam ao navegar; usuário perde contexto.
**Proposta:** store em `?company=...&month=...&type=...` via `useSearchParams` ou lib `nuqs`.
- Alvos: `src/web/features/documents/DocumentList.tsx`, `src/web/features/depreciation/DepreciationApp.tsx`
- **Critério:** copiar URL e abrir em outra janela reproduz filtros.

### UX6. Drag-and-drop de XMLs na janela
**Problema:** importar exige sempre abrir dialog.
**Proposta:** zona de drop global na TitleBar/Área central com highlight ao arrastar.
- Alvos: `src/web/App.tsx` (handler `onDragOver`), integração com `import.service`
- **Critério:** arrastar 1+ .xml inicia import automaticamente.

### UX7. Breadcrumb no workspace tree
**Problema:** ao entrar em pasta profunda, não há indicação visual de onde se está.
**Proposta:** breadcrumb clicável acima da árvore: `Minha Empresa > 2026 > Março`.
- Alvos: `src/web/features/workspace/WorkspaceTree.tsx`, novo `Breadcrumb.tsx`
- **Critério:** breadcrumb sempre reflete pasta atual; click navega.

### UX8. Acessibilidade básica (foco visível, aria-labels, navegação por teclado)
**Problema:** modais, dropdowns e tabelas não têm foco gerenciado nem `aria-*`.
**Proposta:** adicionar `:focus-visible` global, `role="dialog"` `aria-modal` em modais, `aria-label` em botões só com ícone.
- Alvos: `src/web/components/*`, `src/web/App.tsx`
- **Critério:** Tab navega ordem lógica; Esc fecha modais; leitor de tela lê botões corretamente.

### UX9. Indicador de progresso em imports longos (estimativa de tempo)
**Problema:** `ImportProgressModal` mostra X/Y mas sem ETA nem throughput.
**Proposta:** adicionar ETA (atual: X docs/min → faltam N min) + barra de progresso visual.
- Alvos: `src/web/components/ImportProgressModal.tsx`, `src/api/services/import.service.ts` (callback de progresso)
- **Critério:** ETA atualiza a cada 1s durante import.

### UX10. Modo "foco" / fullscreen para DANFE
**Problema:** visualizar DANFE em painel pequeno atrapalha conferência.
**Proposta:** atalho `F` (ou botão) abre DANFE em modal/maximizado com zoom in/out e download PDF.
- Alvos: `src/web/features/documents/DocumentPreview.tsx`, `src/core/danfe/` (exportar PDF via `pdfkit` ou `print-to-pdf` do Electron)
- **Critério:** modo foco com zoom ajustável e print-to-PDF nativo.

---

## 4. Riscos & Dependências Cruzadas

- **F1, F5, F12** dependem de parsers novos (parsers são isolados, baixo risco).
- **F8, F9, F11** mexem no motor de depreciação — **estender testes Vitest existentes** antes de tocar.
- **F13** exige migração FTS5 que precisa `PRAGMA journal_mode=WAL` (já ativo).
- **F15 (audit log)** adiciona escrita por mutação; impacto mínimo em performance.
- **F17 (backup)** roda local; nenhum risco de rede.
- **F18 (temas)** exige revisão de `lucide-react`/`tailwindcss` v4 (variáveis CSS já em uso pelo projeto).
- **UX5 (URL filters)** exige cuidado com deep-linking em Electron (file:// + History API).

---

## 5. Validação por Rodada (padrão já usado)

Cada feature implementada deve seguir a sequência:
1. Mudança isolada em branch.
2. `npm run lint` (tsc --noEmit) — zero erros.
3. `npm test` — testes existentes passam; novos testes para lógica nova.
4. `npm run build` — build completo (web + electron + server).
5. Smoke test manual: `npm run dev` (ou `npm start` em prod) + fluxo da feature.

Para itens de UI: além disso, screenshot/visual check em Electron e web.

---

## 6. Perguntas em Aberto

1. **F1, F5, F12** — ordem de prioridade? Recomendo F12 (autopreenchimento de ativos) por ser rápido e alto valor.
2. **F8 (simulador)** — deve persistir cenário alternativo ou ser somente leitura? Recomendo somente leitura (mais simples, sem migrations).
3. **F13 (FTS5)** — escopo global ou por empresa? Recomendo global (mais simples).
4. **F17 (backup automático)** — manter 7, 30 ou configurável? Recomendo configurável com default 30.
5. **F20 (diagnostics)** — expor também em rota `/api/diagnostics` para automação? Recomendo sim.
6. **UX3 (confirmação por digitação)** — aplicar a quais ações críticas? Recomendo: excluir empresa, baixar ativo, resetar DB.
7. **UX10 (PDF)** — preferir Electron `printToPDF` (zero dep extra) ou `pdfkit` (cross-platform)? Recomendo Electron `printToPDF` (já temos a infra).

Se algum item deve ser cortado ou repriorizado, indicar antes de iniciar implementação.

---

## 7. Plano de Execução Sugerido (alto nível)

Sprint 1 (fundação): **F9, F12, F15, F17** + **UX1, UX2, UX8** (baixo risco, alto valor).
Sprint 2 (produtividade): **F1, F5, F13, F19** + **UX4, UX5, UX7**.
Sprint 3 (análise): **F6, F10, F14, F16** + **UX6, UX9, UX10**.
Sprint 4 (polish): **F2, F3, F4, F7, F8, F11, F18, F20** + **UX3** (depende de inputs do usuário).