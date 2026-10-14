# Fase 5: Conformidade Fiscal e Tributária 2026 — Plano de Implementação TDD

- **Data**: 2026-10-14
- **Status**: Concluído (100% dos testes, lint e build aprovados)
- **Escopo**: IMP-006, IMP-016 e IMP-019
- **Escopo Excluído**: IMP-024, FUNC-03 e FUNC-04
- **Documento de Design**: `docs/superpowers/specs/2026-10-14-fase-5-conformidade-fiscal-2026-design.md`
- **Diretrizes Estritas**:
  - TDD Estrito: Red -> Green -> Commit local por tarefa.
  - Zero dependências pesadas externas.
  - 100% de aprovação e retrocompatibilidade nas 83 suítes existentes (479 testes).
  - **NUNCA executar `git push`. Apenas commits locais.**

---

## 3 Salvaguardas Técnicas da Fase 5

1. **IMP-006 (Extrator `<IBSCBS>` e `<IS>`)**: Suportar tanto as tags planas (`vBCIBS`, `pIBS`, `vIBS`, `vBCCBS`, `pCBS`, `vCBS`, `vIS`, `pIS`, `vBCIS`) quanto a estrutura aninhada da NT 2024.002/2025.002 (`gIBSCBS` / `gIBS` / `gCBS` nos itens e em `IBSCBSTot` nos totais).
2. **IMP-016 (Validação Posicional Estrita)**:
   - No CNPJ Alfanumérico, garantir via regex `/^[A-Z0-9]{12}[0-9]{2}$/` que os 2 dígitos verificadores finais sejam sempre numéricos `[0-9]{2}`.
   - Na Chave de Acesso de 44 caracteres, permitir caracteres alfanuméricos `[A-Z0-9]` estritamente nas posições do CNPJ (índices 6 a 17 para a raiz/ordem, com índices 18 e 19 sendo os DVs numéricos do CNPJ), exigindo dígitos estritamente numéricos `[0-9]` em todos os demais campos da chave (cUF, AAMM, mod, serie, nNF, tpEmis, cNF, cDV).
3. **IMP-019 (Códigos cStat SEFAZ)**:
   - `cStat === '100'` e `'150'` (autorização fora de prazo) -> "Autorizada" (selo verde).
   - `cStat === '101'`, `'151'`, `'110'`, `'301'`, `'302'`, `'303'` (ou `doc.status === 'CANCELLED'`) -> "Cancelada/Denegada" (selo vermelho).
   - Sem protocolo -> "Não Homologada / Sem Protocolo" (selo âmbar).

---

## Estrutura de Tarefas TDD

### Task 1: IMP-016 — CNPJ Alfanumérico RFB 2026 e Chave de Acesso com Módulo 11 Posicional
- [x] **Red 1.1**: Criar testes unitários em `src/core/buscador/domain/cnpj.test.ts` cobrindo:
  - CNPJ numérico tradicional válido e inválido.
  - CNPJ alfanumérico válido da IN RFB 2.229/2024 (ex: `12ABC34501DE35`).
  - Rejeição de CNPJ com letras nos 2 dígitos finais (ex: `12ABC34501DEAB`).
  - Sanitização e formatação `XX.XXX.XXX/XXXX-XX`.
- [x] **Red 1.2**: Criar testes unitários em `src/core/buscador/domain/access-key.test.ts` cobrindo:
  - Chave de acesso 44 dígitos numérica válida e inválida.
  - Chave de acesso 44 dígitos com CNPJ alfanumérico válida e cálculo Módulo 11.
  - Rejeição de chave de acesso com letras fora das posições 6..17.
- [x] **Green 1.3**: Implementar a lógica unificada em `src/core/buscador/domain/cnpj.ts` e `src/core/buscador/domain/access-key.ts`.
- [x] **Commit 1.4**: `feat(fiscal): implement rfb alphanumeric cnpj and positional modulo 11 access key validation`

---

### Task 2: IMP-006 — Reforma Tributária 2026 nos Tipos e Parsers XML (NF-e, CT-e, NFS-e)
- [x] **Red 2.1**: Criar testes unitários em `src/core/parsers/rtc-taxes.test.ts` cobrindo:
  - Extração de tags planas (`vBCIBS`, `pIBS`, `vIBS`, `vBCCBS`, `pCBS`, `vCBS`, `vIS`, `pIS`, `vBCIS`).
  - Extração de tags aninhadas NT 2024.002 (`gIBSCBS`, `gIBS`, `gCBS`, `IBSCBSTot`, `ISTot`).
  - Parsing de NF-e, CT-e e NFS-e com dados de RTC.
- [x] **Green 2.2**: Atualizar `src/core/fiscal.types.ts` com as novas propriedades de `FiscalTaxes` e `FiscalItem`.
- [x] **Green 2.3**: Criar helper `src/core/parsers/utils/rtc-taxes.utils.ts` e integrá-lo em `src/core/parsers/nfe.parser.ts`, `src/core/parsers/cte/cte-fiscal.parser.ts` e `src/core/parsers/nfse/nfse-sefin.parser.ts`.
- [x] **Commit 2.4**: `feat(parsers): add 2026 tax reform extraction supporting flat and nested ibs cbs is tags`

---

### Task 3: IMP-019 — Detecção de Assinatura XML (`<Signature>`) e Protocolo de Autorização
- [x] **Red 3.1**: Criar testes unitários em `src/core/parsers/xml-signature-protocol.test.ts` cobrindo:
  - XML assinado com `<Signature>` (presença de `SignedInfo`, `SignatureValue`, `DigestValue`).
  - XML com protocolo de autorização (`infProt` com `nProt`, `cStat`, `xMotivo`).
  - XML sem assinatura e sem protocolo (rascunho / pendente).
  - Enriquecimento sob demanda em `src/api/services/document-enricher.service.ts`.
- [x] **Green 3.2**: Atualizar `FiscalDocument` em `src/core/fiscal.types.ts` (`hasSignature`, `hasAuthorizationProtocol`, `protocolStatus`, `protocolStatusDescription`, `signatureDigest`).
- [x] **Green 3.3**: Implementar a detecção em `src/core/parsers/nfe.parser.ts`, `src/core/parsers/cte.parser.ts` e `src/core/parsers/nfse.parser.ts`, repassando em `enrichDocumentFromXml`.
- [x] **Commit 3.4**: `feat(parsers): detect xmldsig signature and sefaz authorization protocol status`

---

### Task 4: IMP-006 — Exibição Retrocompatível de IBS, CBS e IS no Frontend e Renderers
- [x] **Red 4.1**: Criar testes em `src/web/features/documents/preview/dados/DadosTaxesSection.test.ts` e `src/web/features/documents/preview/danfe/DanfeTaxTotals.test.ts` verificando:
  - Renderização dos quadros de IBS, CBS e IS quando os valores existirem.
  - Ocultação completa dos quadros quando os valores forem zero ou inexistentes (notas legadas).
- [x] **Green 4.2**: Atualizar `DadosTaxesSection.tsx` e `DanfeTaxTotals.tsx`.
- [x] **Green 4.3**: Atualizar `nfe.view-model.ts` e `danfe-nfe.renderer.ts` para incluir o bloco condicional de RTC 2026.
- [x] **Commit 4.4**: `feat(ui): display 2026 tax reform totals in dados view and danfe layout conditionally`

---

### Task 5: IMP-019 — Indicador Visual de Validade Jurídica no Header e Toolbar
- [x] **Red 5.1**: Criar testes em `src/web/features/documents/preview/dados/DadosHeaderSection.test.ts` e `src/web/features/documents/preview/PreviewToolbar.test.ts` verificando:
  - Exibição de selo verde "Uso Autorizado" para `cStat === '100'` ou `'150'`.
  - Exibição de selo vermelho "Cancelada/Denegada" para `cStat === '101'`, `'151'`, etc.
  - Exibição de selo âmbar "Não Homologada" para documentos sem protocolo.
  - Indicador de assinatura digital XMLDSig.
- [x] **Green 5.2**: Implementar os badges e cards em `DadosHeaderSection.tsx` e pílula de status em `PreviewToolbar.tsx`.
- [x] **Commit 5.3**: `feat(ux): display visual authenticity and protocol badges with cstat status mapping`

---

### Task 6: Verificação Final, Regressão Completa e Conclusão
- [x] **6.1**: Executar `npm test` confirmando 100% de aprovação em todas as suítes (83 suítes, 479 testes passando).
- [x] **6.2**: Executar `npm run lint` (`tsc --noEmit` web e electron).
- [x] **6.3**: Executar `npm run build` (build web e esbuild electron).
- [x] **6.4**: Commit local de release e elaboração do Relatório Executivo Final.
