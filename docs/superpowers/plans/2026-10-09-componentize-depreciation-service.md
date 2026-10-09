# Plano de Componentização: depreciation.service.ts

> **Meta:** Reduzir a complexidade de `src/api/services/depreciation.service.ts` (572 linhas) através de separação em submódulos de serviço coesos, com **zero alteração de comportamento, regras contábeis em centavos, persistência SQLite e integridade de exportação**.

---

## 1. Diagnóstico Estrutural

O arquivo `depreciation.service.ts` é o backend do motor de depreciação e acumula atualmente 5 fluxos distintos:
1. **Contratos e Tipos:** `DepreciationRow`.
2. **Cálculo de Competência e Histórico de Bens (`getMonthlyDepreciation`, `getAssetHistory`):** Geração de cronograma, filtragem por competência de baixa (`disposedAt`), marcação de status contábil (`exported`, `current`, `not_issued`, `future`) e sincronização de saldo acumulado.
3. **Exportação e Persistência de Lançamentos (`generateCsv`, `generateRetroactiveForAsset`):** Montagem do arquivo CSV formatado, inserção/atualização atômica em `depreciation_entries` e registro do lote em `depreciation_exports`.
4. **Recálculo de Cronograma (`recalculateAsset`):** Proteção de competências já exportadas contra alteração acidental, limpeza de meses pendentes e reinserção dos novos valores recalculados.
5. **Dashboard e Métricas Contábeis (`getDashboard`):** Agregação de ativos por empresa, cálculo do valor contábil líquido acumulado e contagem de bens 100% depreciados.

---

## 2. Divisão de Submódulos

Diretório alvo: `src/api/services/depreciation/`

1. `depreciation.types.ts`:
   - Interfaces e tipos (`DepreciationRow`).
2. `depreciation-monthly.service.ts`:
   - Lógica de `getMonthlyDepreciation` e `getAssetHistory`.
3. `depreciation-export.service.ts`:
   - Geração de CSV mensal e individual retroativo com persistência das `depreciation_entries` e `depreciation_exports`.
4. `depreciation-recalc.service.ts`:
   - Rotina de recálculo seguro de bens preservando meses exportados.
5. `depreciation-dashboard.service.ts`:
   - Métricas agregadas de patrimônio, bens ativos e valor residual para o dashboard.
6. `index.ts`:
   - Barrel export atualizado re-exportando todos os módulos novos e existentes (`depreciation-batch.service`, `depreciation-csv.formatter`, `depreciation-disposal.utils`).
7. `depreciation-modules.test.ts`:
   - Suíte unitária dedicada cobrindo os cálculos, helpers e contratos.
8. `depreciation.service.ts` (refatorado):
   - Fachada limpa orquestrando a classe `DepreciationService` mantendo 100% da API pública e o singleton `depreciationService`.

---

## 3. Protocolo de Validação
- Vitest: executar com `--fileParallelism=false` confirmando todos os testes verdes.
- Lint: executar `npm run lint` sem erros de tipagem TypeScript.
- Build: executar `npm run build` com saída código 0.
- Auditoria do Agente 5 e commit local (sem `git push`).

