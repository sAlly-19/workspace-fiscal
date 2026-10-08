# Plano de Componentização: documents.routes.ts

> **Meta:** Reduzir a complexidade de `src/api/routes/documents.routes.ts` (1.893 linhas) através de separação em camadas limpas, com **zero alteração de comportamento, regras fiscais, contratos HTTP ou lógica de negócio**.

---

## 1. Diagnóstico e Problema Arquitetural

O arquivo `documents.routes.ts` continha originalmente 1.893 linhas, misturando:
1. **Definição de Rotas Express:** Endpoints CRUD de documentos fiscais (`/`, `/bulk-delete`, `/bulk-move`, `/batch-print`, `/:id/move`, `/:id`, `/:id/xml`, `/:id/print`).
2. **Serviço de Enriquecimento On-Demand:** Leitura de XML via Storage, parsing fiscal, atualização de cobrança (`billing`) no banco e injeção de detalhes fiscais complementares.
3. **Mecanismo de Geração de DANFE HTML para Impressão (~1.630 linhas):**
   - Templates HTML completos para NF-e (DANFE tradicional SEFAZ).
   - Templates de cupom NFC-e (com QR Code SVG e 80mm).
   - Templates de CT-e (DACTE Rodoviário padrão oficial).
   - Templates de NFS-e (DANFSe Municipal Padrão ABRASF/Nacional).
   - Gerador de lote `generateDanfeBatchHtml` com toolbar de impressão, controles de zoom, atalhos de teclado e CSS `@media print`.

---

## 2. Estratégia de Modularização

1. **`src/core/danfe/renderers/danfe-html.generator.ts`**:
   - Isolamento puro da engine de geração de HTML/CSS de impressão.
   - Preservação estrita de todos os templates, cálculos de exibição, regras `@media print` e scripts.

2. **`src/core/danfe/index.ts`**:
   - Reexportação central de helpers e da engine de DANFE HTML.

3. **`src/api/services/document-enricher.service.ts`**:
   - Função `enrichDocumentFromXml(doc: any)` encapsulando a lógica de enriquecimento sob demanda.

4. **`src/api/routes/documents.routes.ts`**:
   - Enxuto e desacoplado, focado unicamente no roteamento REST do Express.
   - Reduzido de 1.893 linhas para ~170 linhas (-91%).

5. **`src/core/danfe/danfe-html.test.ts`**:
   - Suíte de 8 testes unitários cobrindo NF-e, NFC-e, CT-e, NFS-e, dispatch por modelo e lote.

---

## 3. Validações Executadas
- Vitest: 35 arquivos de teste, 233 testes passando, 0 falhas.
- Lint & Typecheck: 0 erros em Web e Electron.
- Build: Código de saída 0.
