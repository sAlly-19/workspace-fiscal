# Plano de Componentização: DanfeDACTE.tsx

> **Meta:** Reduzir a complexidade de `src/web/features/documents/DanfeDACTE.tsx` (449 linhas) através de separação em submódulos coesos do layout oficial do DACTE (Documento Auxiliar do Conhecimento de Transporte Eletrônico), com **zero alteração de comportamento, integridade gráfica, fontes mono e cálculos de frete/ICMS**.

---

## 1. Diagnóstico Estrutural

O arquivo `DanfeDACTE.tsx` concentra as especificações visuais do DACTE rodoviário:
1. **Helpers de Domínio CT-e:** Mapeamento de papéis (`formatRole`) e unidades de medida (`formatUnit`).
2. **Cabeçalho DACTE:** Identificação do emitente/transportadora, caixa central DACTE (Mod 57, Série, Número, Folha) e chave de acesso com código de barras simulado.
3. **Protocolo e Rotas:** Natureza da operação, CFOP, protocolo de uso e início/término da prestação de transporte.
4. **Partes Envolvidas:** Tomador do serviço (com matriz de papéis em checkboxes), Remetente, Destinatário, Expedidor e Recebedor.
5. **Carga e Componentes do Frete:** Informações da carga (produto predominante, cubagem, volumes e pesos) e composição do frete (frete valor, seguro, taxas, total a receber).
6. **Impostos, Documentos Originários e Modal Rodoviário:** ICMS do frete, lista de NF-e transportadas, dados do veículo/RNTRC/CIOT/motorista e observações complementares.

---

## 2. Divisão de Submódulos

Diretório alvo: `src/web/features/documents/dacte/`

1. `dacte.helpers.ts`:
   - Funções utilitárias `formatRole` e `formatUnit`.
2. `DacteHeader.tsx`:
   - Emitente/transportadora, box DACTE e chave de acesso/código de barras.
3. `DacteRoute.tsx`:
   - CFOP, natureza da operação, protocolo e municípios de origem e destino da prestação.
4. `DacteParties.tsx`:
   - Quadro do tomador do serviço, remetente, destinatário, expedidor e recebedor.
5. `DacteCargoAndFreight.tsx`:
   - Dados da carga, pesos/medidas, componentes do frete e total do serviço.
6. `DacteFiscalAndRoad.tsx`:
   - Tributos ICMS, NF-e transportadas (documentos originários), modal rodoviário (RNTRC, placa, motorista) e dados adicionais do fisco.
7. `index.ts`:
   - Barrel export dos subcomponentes e helpers.
8. `dacte.test.ts`:
   - Suíte unitária cobrindo helpers e rendering dos blocos do DACTE.
9. `DanfeDACTE.tsx` (refatorado):
   - Orquestrador principal reduzido para ~60 linhas, mantendo exportação, interface de props e estilos de impressão.

---

## 3. Protocolo de Validação
- Vitest: executar com `--fileParallelism=false` confirmando todos os testes verdes.
- Lint: executar `npm run lint` sem erros.
- Build: executar `npm run build` com saída código 0.
- Auditoria do Agente 5 e commit local (sem `git push`).

