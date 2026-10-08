# Componentização Segura: DocumentPreview.tsx

> **Para agentes de execução:** Esta tarefa segue estritamente a diretriz de zero alteração de comportamento. Cada subcomponente deve reproduzir exatamente os mesmos nós JSX, classes Tailwind, estilos e props do original.

## Checklist de Execução Incremental

- [ ] **Step 1.1:** Criar diretório `src/web/features/documents/preview/`
- [ ] **Step 1.2:** Extrair `XmlPreviewPane.tsx`
  - Painel de visualização com SyntaxHighlighter, estilo `vscDarkPlus` e loading state.
  - Gate de validação: `tsc --noEmit`
- [ ] **Step 1.3:** Extrair `PreviewToolbar.tsx`
  - Toolbar de ações, abas (DANFE/Dados/XML com `motion/react` pill), zoom e botões (copiar, baixar, imprimir).
  - Gate de validação: `tsc --noEmit`
- [ ] **Step 1.4:** Extrair `DadosView.tsx`
  - Seções de Destaques, Chave, Partes, Fatura/Cobrança, Tributos e Itens da Nota.
  - Gate de validação: `tsc --noEmit`
- [ ] **Step 1.5:** Extrair `DanfeNFeView.tsx` e `DanfeView.tsx`
  - Layout SEFAZ oficial da NF-e (canhoto, cabeçalho, código de barras, impostos, transportador, itens e dados adicionais).
  - Roteador de tipos (NFCE, CTE, NFSE, NFE).
  - Gate de validação: `tsc --noEmit`
- [ ] **Step 1.6:** Atualizar `DocumentPreview.tsx` (Orquestrador)
  - Reduzir monólito de 1.252 linhas para ~130 linhas importando os novos módulos.
  - Gate de validação: `tsc --noEmit`
- [ ] **Step 1.7:** Validação Geral do Arquivo 1 contra a Baseline
  - `npx vitest run` (163 testes verdes)
  - `npm run lint` (0 erros)
  - `npm run build` (build web e electron com sucesso)
  - Commit local: `refactor(documents): componentize DocumentPreview into dedicated subcomponents`

