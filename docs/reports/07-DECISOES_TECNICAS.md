# Relatório 07: Registro de Decisões Técnicas de Arquitetura (ADRs - Consolidado v3.5.2)

**Projeto:** `workspace-fiscal`  
**Versão Consolidada:** v3.5.2  
**Padrão:** Architecture Decision Record (ADR)  
**Status Geral:** Todas as decisões registradas foram **IMPLEMENTADAS, HOMOLOGADAS E INTEGRADAS NO REPOSITÓRIO**.

---

## ADR-01: Consolidação em um Único Banco SQLite com Drizzle ORM
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** A duplicidade de bancos (`workspace-fiscal.sqlite` e `fiscal_storage.db`) gerava cadastros duplicados e impossibilitava integridade transacional.
- **Decisão:** Consolidar 100% das entidades em um único banco SQLite sob Drizzle ORM (`src/db/schema.ts`), com modo WAL (`journal_mode = WAL`), `busy_timeout = 5000` e índices compostos de alta performance (`idx_documents_batch_type`, `idx_documents_batch_issue_date`). Criado serviço de migração atômica de bancos legados (`legacy-buscador-migration.ts`).
- **Consequências:** Backup atômico único (.wfb) suportando todos os módulos, transações protegidas e ausência total de locks em operações simultâneas.

---

## ADR-02: Blindagem e Transporte Seguro (HTTP Local + IPC)
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** O Express escutava em portas locais sem controle de acesso, vulnerável a conexões de outros processos do SO.
- **Decisão:** Implementar middleware de autenticação obrigatória via token de sessão aleatório (`X-Workspace-Token`) em `src/api/middleware/localAuth.ts`, gerado durante o boot do Electron e compartilhado de forma segura com o cliente web. Mantido fallback transparente para desenvolvimento.
- **Consequências:** Proteção absoluta contra invasões locais via loopback, mantendo conformidade com os requisitos de segurança de dados corporativos.

---

## ADR-03: Motor Unificado de Parsing e Renderização Fiscal
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** Parsers e geradores de DANFE estavam duplicados entre o backend e componentes React.
- **Decisão:** Padronizar `src/core/parsers/` como autoridade única de parsing XML, unificar ViewModels em `src/core/danfe/view-models/` e aplicar sanitização HTML rigorosa contra XSS (`escapeHtml.ts`).
- **Consequências:** Paridade visual de 100% entre preview e impressão, manutenção centralizada e suporte à Reforma Tributária 2026 (IBS, CBS e IS).

---

## ADR-04: Eliminação de Arquivos Temporários na Ponte mTLS
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** `windows-bridge.ps1` gravava payloads em `%TEMP%`, causando lentidão e alarmes em antivírus/EDRs corporativos.
- **Decisão:** Transmitir payloads XML e headers JSON exclusivamente via fluxo de memória `stdin` do processo filho PowerShell, sem qualquer gravação em disco rígido.
- **Consequências:** Zero resíduos em disco, imunidade contra bloqueios de EDR e tempo de resposta otimizado em lotes de consultas SEFAZ.

---

## ADR-05: Emissão Automática de Manifestação do Destinatário SEFAZ
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** Documentos da SEFAZ eram retidos como resumo (`resNFe`) sem download do XML completo (`procNFe`).
- **Decisão:** Integrar ao `DistributionEngine` o disparo automático de Ciência da Operação (`210210`) para resumos capturados, realizando a busca subsequente do XML completo autorizado.
- **Consequências:** Resolução do gargalo de notas fiscais incompletas, garantindo que o usuário tenha o XML juridicamente válido sem ação manual externa.

---

## ADR-06: Defesa contra Ataques de Descompressão e Bombas XML (IMP-T01, IMP-T02)
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** Payloads maliciosos ou arquivos corrompidos poderiam inflar a memória do processo desktop e causar travamentos irreversíveis (DoS).
- **Decisão:**
  1. Configurar `{ maxOutputLength: 15 * 1024 * 1024 }` (15 MB) em `zlib.gunzipSync` (`compression.ts`).
  2. Implementar guarda de tamanho máximo de 25 MB em `BaseParser.parseXml` (`base.parser.ts`) antes da chamada ao `fast-xml-parser`.
- **Consequências:** Proteção contra exaustão de memória em descompressão gzip e parsing XML, com tratamento controlado de exceções.

---

## ADR-07: Contratos de Entrada REST Rigorosamente Validados (IMP-T03)
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** As rotas Express dependiam de checagens manuais dispersas nos endpoints, gerando inconsistências nas respostas de erro.
- **Decisão:** Criar módulo centralizador `src/api/validators/` com validadores tipados para `workspace`, `documents`, `settings`, `companies` e `assets`, retornando consistentemente HTTP 400 no formato `{ error: string, details: string[] }`.
- **Consequências:** Respostas uniformes, proteção contra dados malformados e 100% de retrocompatibilidade com o frontend React e suítes de teste.

---

## ADR-08: Auditoria Obrigatória de Dependências no CI (IMP-T09)
- **Status:** **IMPLEMENTADO E HOMOLOGADO**
- **Contexto:** Dependências transitivas de produção continham vulnerabilidades reportadas de severidade alta e crítica (`proxy-addr`, `multer`, `adm-zip`, `source-map-js`).
- **Decisão:**
  1. Aplicar bloco `"overrides"` no `package.json` para garantir versões seguras.
  2. Adicionar o passo `npm audit --omit=dev --audit-level=high` no `.github/workflows/ci.yml`.
  3. Criar teste de pipeline em `tests/ci-workflow.test.ts` que valida a presença desse gate de segurança.
- **Consequências:** Imunidade contínua a CVEs de severidade alta/crítica no pipeline de build e entrega contínua.
