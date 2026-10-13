# Relatório 06: Plano de Testes e Matriz de Rastreabilidade

**Projeto:** `workspace-fiscal`  
**Referência:** Auditoria Arquitetural v3.5.1  
**Ferramentas:** Vitest, React Testing Library, Electron Test Mocks, TypeScript Compiler

---

## 1. Estratégia de Qualidade e Pirâmide de Testes

```
              ┌────────────────────────┐
              │  E2E / Smoke Desktop   │  10% (Fluxos críticos de emissão/busca)
              ├────────────────────────┤
              │ Testes de Integração   │  30% (API, IPC Handlers, Drizzle SQLite)
              ├────────────────────────┤
              │    Testes Unitários    │  60% (Parsers, Cálculos, Validadores, Hooks)
              └────────────────────────┘
```

---

## 2. Cenários de Teste por Fase

### Fase 1: Segurança e Integridade
- **Caso T1.1 (Token Express):**
  - Tentar requisição sem `X-Workspace-Token` -> Retornar HTTP 403 Forbidden.
  - Tentar requisição com token inválido -> Retornar HTTP 403 Forbidden.
  - Enviar requisição com token gerado no boot -> Retornar HTTP 200 OK.
- **Caso T1.2 (PowerShell Stdin):**
  - Enviar envelope SOAP grande (>1MB) via `stdin` -> PowerShell consome sem truncamento.
  - Verificar pasta `%TEMP%` antes e depois da execução -> Zero arquivos criados.
- **Caso T1.3 (Precisão Centavos Depreciação):**
  - Aquisição de R$ 1.000,00 no dia 15/01 com taxa de 10% a.a. sob regra `PROPORTIONAL`.
  - Soma de todos os meses até zerar deve ser exatamente igual a R$ 1.000,00 (100.000 centavos).
  - Casos com taxas ímpares (ex: 3.33% a.a.) e anos bissextos.
- **Caso T1.4 (Path Traversal):**
  - Enviar payloads com `../../Windows/System32` ou `/etc/passwd` -> Rejeitar com exceção de segurança.

---

### Fase 2: Unificação de Banco de Dados
- **Caso T2.1 (Migração Automática):**
  - Subir ambiente com `fiscal_storage.db` contendo 50 documentos capturados e 2 empresas.
  - Executar rotina de boot -> Dados devem ser transferidos para `workspace-fiscal.sqlite`.
  - Nenhuma duplicidade de CNPJ em `companies`.
- **Caso T2.2 (Concorrência SQLite WAL):**
  - Disparar 20 escritas simultâneas de importação de documentos enquanto ocorre leitura da árvore de competências.
  - Zero erros de `SQLITE_BUSY`.

---

### Fase 3: Motores Fiscais e Manifestação
- **Caso T3.1 (Parsing Unificado):**
  - Parsear lote contendo NF-e 4.00, CT-e 4.00, NFC-e 4.00 e NFS-e ADN.
  - Todos os campos canônicos devem estar preenchidos conforme `src/core/fiscal.types.ts`.
- **Caso T3.2 (Manifestação Automática SEFAZ):**
  - Mock de retorno SEFAZ com `resNFe` (apenas resumo).
  - Motor deve despachar automaticamente o envelope de Ciência (`210210`).
  - Na chamada seguinte, processar o `procNFe` e salvar o XML definitivo.
- **Caso T3.3 (Paridade Visual DANFE):**
  - Comparar estrutura DOM renderizada no preview React com a string HTML gerada para impressão em lote.

---

### Fase 4: Migração de Transporte IPC
- **Caso T4.1 (IPC Handlers):**
  - Executar listagem de empresas, importação de XML e cálculo de depreciação via `ipcRenderer.invoke`.
  - Comparar tempo de resposta: IPC deve ser em média 2x a 3x mais rápido que HTTP REST local.
- **Caso T4.2 (Fallback Browser):**
  - Em ambiente sem Electron (`window.fiscalApi === undefined`), chamadas devem rotear automaticamente para HTTP Express sem quebras de interface.

---

### Fase 5 e 6: Domínio 2026 e Resiliência
- **Caso T5.1 (Tags IBS/CBS/IS):**
  - Injetar XML mockado contendo grupo `<IBSCBS>` e `<IS>` da Reforma Tributária.
  - Verificar correta extração nos campos do parser e exibição no card de tributos.
- **Caso T6.1 (Provedor A1 .pfx Nativo):**
  - Carregar arquivo `.pfx` com senha -> Efetuar handshake mTLS contra endpoint mockado sem invocar `powershell.exe`.
- **Caso T6.2 (Circuit Breaker):**
  - Simular indisponibilidade da SEFAZ (5 falhas consecutivas de timeout).
  - Motor deve pausar requisições temporariamente e aguardar janela de reabertura sem travar o app.

---

## 3. Matriz de Rastreabilidade

| Melhoria | Caso de Teste | Arquivo de Teste Previsto |
| :--- | :--- | :--- |
| **IMP-001** | T1.1 | `src/api/middlewares/authToken.test.ts` |
| **IMP-002** | T1.2 | `src/core/buscador/certificates/WindowsStoreCertificateProvider.test.ts` |
| **IMP-004** | T1.3 | `src/core/depreciation/calculate.test.ts` |
| **IMP-009** | T1.4 | `src/core/security/pathSanitizer.test.ts` |
| **IMP-003** | T2.1, T2.2 | `src/db/db-migration.test.ts` |
| **IMP-005** | T3.1 | `src/core/parsers/unified-parsers.test.ts` |
| **IMP-007** | T3.2 | `src/core/buscador/fiscal/DistributionEngine.test.ts` |
| **IMP-008** | T3.3 | `src/core/danfe/danfe-parity.test.ts` |
| **IMP-016** | T4.1 | `electron/buscador/ipc/documentHandlers.test.ts` |
| **IMP-017** | T4.2 | `src/web/lib/api.test.ts` |
| **IMP-006** | T5.1 | `src/core/parsers/nfe.parser.test.ts` |
| **IMP-010** | T6.1 | `src/core/buscador/certificates/PfxCertificateProvider.test.ts` |
| **IMP-020** | T6.2 | `src/core/buscador/resilience/CircuitBreaker.test.ts` |

