# Especificação de Design — Fase 6: Performance, CI/CD e Fechamento de Release

**Data:** 14 de Outubro de 2026  
**Status:** Em Revisão / Proposta  
**Escopo:** IMP-013, IMP-007 e IMP-025  
**Escopo Excluído:** IMP-010 e FUNC-01 (explicitamente fora do escopo desta fase)  

---

## 1. Visão Geral e Objetivos

A Fase 6 consolida o ciclo de desenvolvimento do **Workspace Fiscal**, fechando as melhorias de performance de renderização para grandes volumes de dados (IMP-013), estabelecendo a automação contínua de qualidade via GitHub Actions (IMP-007) e documentando o salto arquitetural e funcional realizado nas Fases 1 a 6 nas notas de lançamento e documentação oficial (IMP-025).

### Objetivos Específicos:
1. **IMP-013 (Renderização Progressiva e Memoização de Lotes Volumosos):**
   - Otimizar `DocumentListPane.tsx` para suportar pastas com 1.000+ documentos sem travamentos de scroll nem degradação de FPS.
   - Otimizar `DadosItemsTable.tsx` para notas fiscais com centenas de itens (ex.: distribuição/varejo com 500+ produtos).
   - Utilizar renderização progressiva e memoização nativa em React (sem dependências externas pesadas), preservando 100% dos contratos e a aprovação de `workspace.test.ts` e `dados-view.test.ts`.
2. **IMP-007 (Pipeline CI/CD com GitHub Actions):**
   - Configurar workflow `.github/workflows/ci.yml` cobrindo lint, testes automatizados e compilação de produção (Web e Electron) a cada `push` e `pull_request` no branch `main`.
3. **IMP-025 (Release Notes What's New e Documentação Consolidada):**
   - Atualizar a versão do aplicativo de `3.5.1` para `3.5.2` em `package.json`, `whatsNewData.ts`, `whatsNewData.test.ts`, `src/api/app.ts` e `README.md`.
   - Adicionar uma nova entrada no topo do modal "O que há de novo" (`whatsNewData.ts`) destacando as 3 grandes frentes entregues nas Fases 1 a 6.

---

## 2. Análise Detalhada dos Módulos

### 2.1. IMP-013: Renderização de DocumentListPane e DadosItemsTable

#### Cenário Atual:
- **`DocumentListPane.tsx`:**
  - O container `<div className="flex-1 overflow-y-auto p-2 space-y-1.5">` renderiza `filteredDocuments.map((doc) => ...)` de forma monolítica.
  - Ao carregar 1.000+ documentos, 1.000 cards complexos (com botões, badges, tags e event listeners) são instanciados simultaneamente no DOM, consumindo memória e gerando *layout thrashing* durante o scroll.
  - Quando um documento é selecionado (`selectedDocumentId`) ou marcado no checkbox (`selectedDocIds`), todos os 1.000 itens sofrem re-renderização por ausência de memoização nos cards.
- **`DadosItemsTable.tsx`:**
  - Em notas de atacado com centenas de itens, o componente renderiza todas as tags `<tr>` de uma vez na tabela, gerando lentidão momentânea ao alternar para a aba "Dados da Nota".

#### Solução de Arquitetura Proposta:
1. **Renderização Progressiva com Chunking Adaptativo (`DocumentListPane.tsx`):**
   - Definir `INITIAL_BATCH_SIZE = 50` e `BATCH_INCREMENT = 30`.
   - Um estado local `renderedCount` inicializa com `INITIAL_BATCH_SIZE`.
   - Ao alterar `searchQuery`, `selectedFolderName` ou a referência de `filteredDocuments`, o `renderedCount` reinicializa para `INITIAL_BATCH_SIZE`.
   - A seleção em lote ("Selecionar todos") opera incondicionalmente sobre todos os documentos filtrados (`filteredDocuments`) e não apenas sobre os itens renderizados na viewport.
   - Se `selectedDocumentId` estiver além do índice `renderedCount`, o componente expande automaticamente o limite para garantir que o item ativo seja imediatamente visível.
   - Um listener de scroll com *passive event* no container detecta proximidade do final (`scrollHeight - scrollTop - clientHeight < 300px`) e incrementa `renderedCount`.
   - **Memoização Estrita (`DocumentCardItem`):**
     - Extração do card individual para um subcomponente memoizado (`React.memo`) que recebe apenas as propriedades essenciais (`doc`, `isSelected`, `isChecked`, `currentTheme` e callbacks).
     - Isso garante que alternar a seleção de um documento re-renderize apenas 2 nós no DOM (o desselecionado e o recém-selecionado), mantendo 60 FPS estáveis mesmo com milhares de itens carregados.
2. **Chunking e Paginação Transparente (`DadosItemsTable.tsx`):**
   - Para tabelas de itens, definir `INITIAL_ITEMS_LIMIT = 50`.
   - Se `items.length <= 50`, renderiza todos os itens de imediato.
   - Se `items.length > 50`, renderiza os primeiros 50 itens e disponibiliza no rodapé da tabela um botão elegante e discreto: `"Mostrar mais 50 itens (Exibindo X de Y)"` ou `"Mostrar todos os Y itens"`.
   - Garante que a abertura inicial da aba "Dados da Nota" seja instantânea (< 16ms) independentemente da quantidade de itens no XML.
3. **Preservação de Compatibilidade:**
   - Em testes unitários (`workspace.test.ts`), `filteredDocuments` possui 2 itens ou 0 itens; portanto, todos os itens são renderizados de primeira, sem exigir simulação de eventos de scroll nos testes existentes.

---

### 2.2. IMP-007: Pipeline CI/CD GitHub Actions

#### Arquivo a Criar: `.github/workflows/ci.yml`
- **Nome:** `CI / Testes & Build`
- **Eventos Disparadores:**
  ```yaml
  on:
    push:
      branches: [ main ]
    pull_request:
      branches: [ main ]
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```
- **Ambiente de Execução:** `ubuntu-latest`
  - *Variável de Ambiente:* `CI: true`
- **Etapas do Job:**
  1. `actions/checkout@v4`: Checkout do código.
  2. `actions/setup-node@v4`: Node.js 20.x com cache automático para `npm`.
  3. `npm ci`: Instalação determinística de dependências.
  4. `npm run lint`: Checagem rigorosa de tipos TypeScript (Web e Electron).
  5. `npm test`: Execução de todas as 83+ suítes de testes Vitest em modo headless sem watch (`vitest run`).
  6. `npm run build`: Compilação de assets de produção do Vite e bundles Electron via esbuild.

---

### 2.3. IMP-025: Release Notes What's New e Documentação Consolidada

#### Atualização de Versão: `v3.5.2`
- **Arquivos a Atualizar:**
  - `package.json`: `"version": "3.5.2"`
  - `src/api/app.ts`: `version: '3.5.2'`
  - `src/web/components/whats-new/whatsNewData.ts`:
    - Atualizar tipo `AppVersion`: incluir `'3.5.2'`.
    - Atualizar `CURRENT_APP_VERSION = '3.5.2'`.
    - Adicionar o bloco de versão `v3.5.2` no topo da lista com `isCurrent: true`, e marcar `v3.5.1` com `isCurrent: false`.
    - Conforme os testes de integridade (`whatsNewData.test.ts`), cada versão deve conter exatamente 3 cards temáticos com classes visuais padronizadas (`purple`, `blue`, `emerald`).
- **Cards Propostos para a v3.5.2:**
  1. **Card 1 (Roxo / Reforma Tributária 2026 & CNPJ Alfanumérico):**
     - *Título:* Reforma Tributária 2026 (IBS, CBS e IS) & CNPJ Alfanumérico
     - *Badge:* Conformidade Fiscal
     - *Bullets:* Extração híbrida (tags planas e nós oficiais `gIBSCBS`/`IBSCBSTot`), visualização condicional retrocompatível no DANFE e Módulo 11 alfanumérico oficial da RFB para CNPJs e chaves de acesso.
  2. **Card 2 (Verde / Banco SQLite Unificado & Arquitetura Resiliente):**
     - *Título:* SQLite Unificado em Modo WAL & Supervisor de Servidor
     - *Badge:* Infraestrutura & Dados
     - *Bullets:* Banco local consolidado com PRAGMA WAL e busy timeout de 5s, backup atômico com checksum SHA-256 e auto-recuperação do servidor local Express com backoff exponencial.
  3. **Card 3 (Azul / Alta Performance em Lotes, Observabilidade & CI/CD):**
     - *Título:* Performance de Renderização 60 FPS & Observabilidade Segura
     - *Badge:* Performance & Governança
     - *Bullets:* Renderização progressiva de lotes com milhares de XMLs, mascaramento LGPD automático de credenciais em logs e pipeline de CI/CD automatizado no GitHub Actions.
- **Atualização do `README.md`:**
  - Atualizar o badge de versão no topo para `3.5.2`.
  - Inserir a seção `### Versão 3.5.2 (Atual)` no topo do `Histórico de Versões e Novidades`.
  - Ajustar `Versão 3.5.1` para versão anterior.
- **Atualização de `whatsNewData.test.ts`:**
  - Atualizar asserções de `CURRENT_APP_VERSION` para `3.5.2`.
  - Atualizar lista de 8 versões suportadas (`'3.5.2', '3.5.1', ...`).
  - Validar que a `v3.5.2` possui os 3 cards formatados e `isCurrent === true`.

---

## 3. Matriz de Trade-offs Técnicos

| Dimensão | Opção A (Recomendada e Aprovada) | Opção B | Opção C |
| :--- | :--- | :--- | :--- |
| **Virtualização de Lista (IMP-013)** | **Renderização Progressiva (Chunking) + Memoização Estrita de Card**<br>• *Prós:* Zero dependências externas; sem risco de desalinhamento de altura dinâmica; 100% compatível com os testes existentes.<br>• *Contras:* Mantém nós anteriores no DOM durante scroll longo (desprezível para até milhares de itens em React 19). | **Virtualização Estrita com Biblioteca Externa (`react-window`)**<br>• *Prós:* Menor consumo de DOM em listas de 50.000 itens.<br>• *Contras:* Requer nova dependência no `package.json`; falha ou exige mocks complexos nos testes de componentes; problemas com altura variável dos cards. | **Paginação Tradicional com Botões (1, 2, 3...)**<br>• *Prós:* Simples.<br>• *Contras:* Quebra o fluxo ergonômico de workspace contínuo e scroll infinito dos usuários de desktop. |
| **Execução do CI/CD (IMP-007)** | **Pipeline em `ubuntu-latest` com cache de npm e CI: true**<br>• *Prós:* Execução ultra-rápida (~60-90s); menor custo de minutos no GitHub Actions; cancelamento automático de execuções concorrentes.<br>• *Contras:* Não roda script PowerShell nativo no runner de CI (validado via testes unitários com mocks de processo). | **Matriz Multi-OS (`ubuntu-latest` + `windows-latest`)**<br>• *Prós:* Roda teste no Windows nativo.<br>• *Contras:* Gasta 2x a 3x mais minutos de CI; runners Windows demoram o dobro para inicializar. | **Execução Apenas de Testes sem Lint nem Build**<br>• *Prós:* Mais rápido.<br>• *Contras:* Permite que falhas de tipagem ou de bundling do Vite/Electron passem despercebidas para o repositório. |
| **Versionamento da Release (IMP-025)** | **`v3.5.2` (Aprovado pelo Usuário)**<br>• *Prós:* Mantém a linha 3.5.x como sequência direta e estável, consolidando as correções e conformidades tributárias.<br>• *Contras:* Nenhum. | **`v3.6.0` (Minor)**<br>• *Prós:* SemVer alternativo.<br>• *Contras:* Descartado conforme diretriz do usuário. | **`v4.0.0` (Major)**<br>• *Prós:* Enfatiza Reforma 2026.<br>• *Contras:* Tradicionalmente reservado para quebras de contrato público. |

---

## 4. Plano de Verificação e Riscos Mitigados

1. **Risco de Regressão em `workspace.test.ts` e `dados-view.test.ts`:**
   - *Mitigação:* `INITIAL_BATCH_SIZE` configurado em 50 garante que qualquer lista de teste (que normalmente tem de 1 a 10 itens) seja integralmente renderizada no primeiro ciclo sem necessidade de acionamento de scroll.
2. **Risco de Falha no CI do GitHub Actions:**
   - *Mitigação:* O workflow executará exatamente a mesma sequência de validação executada localmente com sucesso: `npm ci` $\rightarrow$ `npm run lint` $\rightarrow$ `npm test` $\rightarrow$ `npm run build`, com `CI: true`.
3. **Risco de Inconsistência nos Dados de Whats New:**
   - *Mitigação:* `whatsNewData.test.ts` valida programmaticamente o formato das 3 cores, classes Tailwind de ícone e borda, textos de cabeçalho e contagem de versões.

---

## 4. Plano de Verificação e Riscos Mitigados

1. **Risco de Regressão em `workspace.test.ts` e `dados-view.test.ts`:**
   - *Mitigação:* `INITIAL_BATCH_SIZE` configurado em 50 garante que qualquer lista de teste (que normalmente tem de 1 a 10 itens) seja integralmente renderizada no primeiro ciclo sem necessidade de acionamento de scroll.
2. **Risco de Falha no CI do GitHub Actions:**
   - *Mitigação:* O workflow executará exatamente a mesma sequência de validação executada localmente com sucesso: `npm ci` $\rightarrow$ `npm run lint` $\rightarrow$ `npm test` $\rightarrow$ `npm run build`.
3. **Risco de Inconsistência nos Dados de Whats New:**
   - *Mitigação:* `whatsNewData.test.ts` valida programmaticamente o formato das 3 cores, classes Tailwind de ícone e borda, textos de cabeçalho e contagem de versões.

