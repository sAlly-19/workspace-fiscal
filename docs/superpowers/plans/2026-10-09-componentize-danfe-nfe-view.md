# Plano de Componentização: DanfeNFeView.tsx

> **Meta:** Reduzir a complexidade de `src/web/features/documents/preview/DanfeNFeView.tsx` (576 linhas) através de separação em submódulos coesos seguindo o layout canônico do DANFE da SEFAZ, com **zero alteração de comportamento, layout gráfico, fontes, bordas e fidelidade de impressão**.

---

## 1. Diagnóstico Estrutural

O arquivo `DanfeNFeView.tsx` é a representação visual impressa do DANFE (Documento Auxiliar da Nota Fiscal Eletrônica). Atualmente possui 576 linhas mesclando 8 blocos gráficos rígidos regulamentados pela SEFAZ:
1. **Canhoto de Recebimento:** Protocolo de entrega destacável com identificação do recebedor, data e número da nota.
2. **Cabeçalho SEFAZ & Emitente:** Quadro do emitente, quadro central do DANFE (entrada/saída, folha, número/série) e quadro da chave de acesso com código de barras, natureza da operação e inscrições.
3. **Destinatário / Remetente:** Identificação do destinatário, endereçamento completo, telefones e datas/horas de saída.
4. **Fatura / Duplicatas:** Resumo financeiro da fatura e lista visual de duplicatas.
5. **Cálculo do Imposto (Totais):** 18 campos fiscais distribuídos em duas linhas de totais (ICMS, ST, IPI, PIS, COFINS, Frete, Seguro, Total da Nota).
6. **Transportador / Volumes:** Modalidade de frete, dados do veículo/transportador e volumes/pesos.
7. **Itens / Produtos (Grade Fiscal 15 colunas):** Tabela detalhada com NCM, CST, CFOP, quantidade, alíquotas e impostos por item.
8. **Dados Adicionais:** Informações complementares de interesse do contribuinte e área reservada ao fisco.

---

## 2. Divisão de Submódulos

Diretório alvo: `src/web/features/documents/preview/danfe/`

1. `DanfeCanhoto.tsx`:
   - Canhoto de recebimento destacável.
2. `DanfeHeader.tsx`:
   - Identificação do emitente, DANFE central, código de barras simulado, chave de acesso, natureza de operação e dados cadastrais do emitente.
3. `DanfeRecipient.tsx`:
   - Quadro completo do destinatário/remetente e datas/horas de emissão e saída.
4. `DanfeBilling.tsx`:
   - Fatura e lista de duplicatas/parcelas.
5. `DanfeTaxTotals.tsx`:
   - Grid de duas linhas com cálculo do imposto e totais da nota.
6. `DanfeTransport.tsx`:
   - Quadro de transportador, frete, veículo e volumes transportados.
7. `DanfeItemsTable.tsx`:
   - Tabela canônica de 15 colunas com produtos e serviços.
8. `DanfeAdditionalInfo.tsx`:
   - Informações complementares e reservado ao fisco.
9. `index.ts`:
   - Barrel export dos subcomponentes do DANFE.
10. `danfe-nfe-view.test.ts`:
   - Testes unitários validando a instanciação, contratos de props e renderização de todos os subcomponentes.
11. `DanfeNFeView.tsx` (refatorado):
   - Container principal unificando os blocos no layout A4 com suporte aos temas Claro/Escuro e estilos de impressão `@media print`.

---

## 3. Protocolo de Validação
- Vitest: executar com `--fileParallelism=false` confirmando todos os testes verdes.
- Lint: executar `npm run lint` sem erros.
- Build: executar `npm run build` com saída código 0.
- Auditoria do Agente 5 e commit local (sem `git push`).

