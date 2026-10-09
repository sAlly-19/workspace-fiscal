# Plano de Componentização: DadosView.tsx

> **Meta:** Reduzir a complexidade de `src/web/features/documents/preview/DadosView.tsx` (602 linhas) através de separação em submódulos coesos e reutilizáveis, com **zero alteração de comportamento, integridade de layout, temas Light/Dark e formatações fiscais**.

---

## 1. Diagnóstico Estrutural

O arquivo `DadosView.tsx` concentra atualmente 5 blocos visuais e lógicos distintos em um único componente monolítico:
1. **Destaques e Chave de Acesso:** Cards de topo com Tipo, Número/Série, Emissão, Valor Total e Chave de Acesso formatada em blocos de 4 dígitos.
2. **Partes Envolvidas (Emitente e Destinatário):** Dados cadastrais, razão social/nome e CNPJ/CPF do emissor e tomador.
3. **Fatura, Duplicatas e Cobrança:** Resumo de valores (original, desconto, líquido), grid responsivo de parcelas e lista de modalidades de pagamento com cálculo agregado.
4. **Quadro de Tributos e Retenções:** Exibição condicional de impostos (ICMS, ICMS ST, IPI, PIS, COFINS, ISS, INSS, IRRF, CSLL, retenções) com bases de cálculo e tratamento retrocompatível (`doc.totals.taxes` vs `doc.taxes`).
5. **Tabela de Itens/Produtos:** Tabela completa com código, descrição, NCM, CFOP, unidade, quantidade, valor unitário e total.

---

## 2. Divisão de Submódulos

Diretório alvo: `src/web/features/documents/preview/dados/`

1. `DadosHeaderSection.tsx`:
   - Highlights superiores (Tipo, Número/Série, Data, Valor Total).
   - Card da Chave de Acesso de 44 dígitos com quebra e formatação.
2. `DadosPartiesSection.tsx`:
   - Cards de Emitente e Destinatário/Remetente com formatação de documento.
3. `DadosBillingSection.tsx`:
   - Resumo da fatura, lista de parcelas/duplicatas e resumo de formas de pagamento.
4. `DadosTaxesSection.tsx`:
   - Grid de tributos e retenções fiscais com suporte pleno a dark/light mode.
5. `DadosItemsTable.tsx`:
   - Tabela de itens da nota com rolagem horizontal e responsividade.
6. `index.ts`:
   - Barrel export dos componentes e interfaces de props.
7. `dados-view.test.ts`:
   - Suíte de testes unitários garantindo que todos os subcomponentes lidem corretamente com propriedades preenchidas, opcionais e temas claro/escuro.
8. `DadosView.tsx` (refatorado):
   - Orquestrador principal reduzido para ~50 linhas.

---

## 3. Protocolo de Validação
- Vitest: executar suíte com `--fileParallelism=false` confirmando todos os testes verdes.
- Lint: executar `npm run lint` sem erros de tipagem TypeScript.
- Build: executar `npm run build` com saída código 0.
- Auditoria do Agente 5 e commit local (sem `git push`).

