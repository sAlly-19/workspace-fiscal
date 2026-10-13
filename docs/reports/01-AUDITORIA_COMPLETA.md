# Relatório 01: Auditoria Arquitetural e Funcional Completa

**Projeto:** `workspace-fiscal`  
**Versão Base:** v3.5.1 (`dbdf25d05224da83ec6a9822eaaca2206e8c08d2`)  
**Data:** 13 de Outubro de 2026  
**Ambiente:** Electron 32, Node.js 20, TypeScript 5.5, React 18, Vite 5, Express 4, SQLite/Drizzle ORM

---

## 1. Resumo Executivo

O repositório `workspace-fiscal` é uma plataforma desktop voltada à gestão contábil-fiscal e automação de documentos fiscais eletrônicos brasileiros (DF-e). O sistema consolida três grandes módulos em um Hub Principal:
1. **NFView / Workspace de Documentos:** Importação, validação, organização em árvore de competências, visualização de XMLs, timeline de eventos e impressão/geração de DANFE (NF-e), DACTE (CT-e), DANFSE (NFS-e) e NFC-e.
2. **Buscador Fiscal SEFAZ & NFS-e Nacional:** Captura automática de DF-e via WebServices SEFAZ (DistribuicaoDFe por NSU) e NFS-e Padrão Nacional (ADN e Sefin via NSU e chave de acesso), com autenticação mTLS via Windows Certificate Store.
3. **Controle de Depreciação e Ativo Imobilizado:** Gestão patrimonial por empresa e categoria, importação de bens via XML de NF-e, cálculo de quotas mensais e proporcionais em centavos, baixas e exportação CSV configurável.

### Diagnóstico Geral
O projeto apresenta alta maturidade funcional e passou recentemente por campanhas rigorosas de refatoração modular (componentização limpa e cobertura de testes automatizados com mais de 330 testes unitários passando).

Contudo, a auditoria estrutural identificou quatro dívidas arquiteturais críticas:
- **Bifurcação de Banco de Dados:** Coexistência de dois bancos SQLite independentes (`workspace-fiscal.sqlite` com Drizzle ORM para Express e `fiscal_storage.db` com `sql.js` para o Buscador).
- **Hibridismo de Transporte (HTTP Local vs. IPC):** Módulos NFView e Depreciação comunicam-se via HTTP local com Express (`http://127.0.0.1:3000`), enquanto o Buscador comunica-se nativamente via Electron IPC.
- **Duplicação de Parsers e Renderizadores:** Parsers XML e geradores de DANFE/DACTE estão duplicados entre backend Express, módulos do Buscador e componentes de visualização React.
- **Ponte PowerShell para mTLS:** O transporte SEFAZ/NFS-e invoca `powershell.exe` passando dados sensíveis em arquivos temporários, gerando sobrecarga de subprocessos e alertas em antivírus/EDR corporativos.

---

## 2. Mapeamento Arquitetural e Fluxo de Dados

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND REACT (src/web/)                               │
│  ┌─────────────────────┐  ┌─────────────────────────┐  ┌───────────────────────┐  │
│  │  NFView & Workspace │  │ Controle de Depreciação │  │    Buscador Fiscal    │  │
│  │ (workspace.store.ts)│  │ (depreciation.store.ts) │  │     (ui.store.ts)     │  │
│  └──────────┬──────────┘  └────────────┬────────────┘  └───────────┬───────────┘  │
└─────────────┼──────────────────────────┼───────────────────────────┼──────────────┘
              │ HTTP REST (lib/api.ts)   │ HTTP REST (lib/api.ts)    │ Electron IPC
              ▼                          ▼                           ▼ (preload.ts)
┌─────────────────────────────────────────────────────┐  ┌──────────────────────────┐
│           SERVIDOR EXPRESS (server.ts / app.ts)     │  │   IPC HANDLERS ELECTRON  │
│  Middlewares: securityHeaders, rateLimit, errorHdlr │  │ (electron/buscador/ipc/) │
│  Routes -> Services (import, depreciation, backup)  │  │  security.ts + handlers  │
│  Repositories (src/api/repositories/*.repository.ts)│  └───────────┬──────────────┘
└─────────────────────────┬───────────────────────────┘              │
                          │                                          ▼
                          │                              ┌──────────────────────────┐
                          │                              │  CORE BUSCADOR SERVICES  │
                          │                              │ - DistributionEngine     │
                          │                              │ - NfseSynchronizer       │
                          │                              │ - WindowsStoreCertProv   │
                          │                              │   (windows-bridge.ps1)   │
                          ▼                              └───────────┬──────────────┘
              ┌───────────────────────┐                              │
              │  SQLITE / DRIZZLE ORM │                              ▼
              │ workspace-fiscal.db   │                  ┌──────────────────────────┐
              │ (companies, documents,│                  │     SQLITE / SQL.JS      │
              │  assets, categories)  │                  │     fiscal_storage.db    │
              └───────────────────────┘                  │ (buscador_companies,     │
                                                         │  nfe_docs, nfse_docs)    │
                                                         └──────────────────────────┘
```

---

## 3. Matriz de Problemas Confirmados (PROB-01 a PROB-06)

| ID | Problema | Severidade | Impacto |
| :--- | :--- | :--- | :--- |
| **PROB-01** | Bifurcação de Banco SQLite | **Crítica** | Cadastros duplicados de empresas; backups incompletos |
| **PROB-02** | Duplicação de Parsers Fiscais | **Alta** | Manutenção duplicada de regras fiscais; inconsistência de parsing |
| **PROB-03** | Duplicação de Renderizadores DANFE | **Média** | Diferença visual entre preview em tela e impressão em lote |
| **PROB-04** | Hibridismo de Transporte (HTTP vs. IPC) | **Alta** | Dependência de porta TCP livre, overlay de queda de servidor |
| **PROB-05** | Dependência Frágil de PowerShell para mTLS | **Alta** | Lentidão por spawn de processo, criação de arquivos temporários, EDR blocking |
| **PROB-06** | Ausência de Manifestação SEFAZ Automática | **Alta** | XMLs retidos como apenas "Ciência da Operação" sem download do `procNFe` |

---

## 4. Riscos de Segurança e Confiabilidade (SEC-01 a SEC-05)

| ID | Risco | Classificação | Mitigação Proposta |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Execução de Script PowerShell Externo sem Sandbox | **Alta** | Envio de envelopes via `stdin` em memória; transição para driver mTLS nativo ou `.pfx` |
| **SEC-02** | API Express sem Token de Sessão em Porta TCP Local | **Alta** | Gerar token aleatório no boot do Electron e validar cabeçalho `X-Workspace-Token` |
| **SEC-03** | Risco de Concorrência e Lock no SQLite | **Média** | Unificação de banco com WAL mode (`journal_mode=WAL`) e `busy_timeout=5000` |
| **SEC-04** | Injeção de Path em Downloads e Backups | **Média** | Função centralizada de sanitização e verificação de traversal (`path.resolve`) |
| **SEC-05** | Manuseio de Certificados A1 em Memória e Senhas | **Média** | Descarte imediato de buffers sensíveis e criptografia de credenciais via `safeStorage` |

---

## 5. Sumário das 25 Melhorias Propostas (IMP-001 a IMP-025)

1. **IMP-001:** Blindagem do Servidor Express com Handshake de Token Local (`X-Workspace-Token`).
2. **IMP-002:** Eliminação de Arquivos Temporários na Ponte PowerShell (Comunicação via `stdin`).
3. **IMP-003:** Unificação dos Bancos de Dados SQLite em Schema Único Drizzle ORM.
4. **IMP-004:** Refinamento do Motor de Depreciação para Precisão Exata em Centavos e Resíduos.
5. **IMP-005:** Unificação dos Parsers Fiscais em Módulo Único de Domínio (`src/core/parsers/`).
6. **IMP-006:** Suporte à Reforma Tributária 2026 (Grupos IBS, CBS e Imposto Seletivo).
7. **IMP-007:** Fluxo Automatizado de Manifestação do Destinatário SEFAZ (Ciência e Confirmação).
8. **IMP-008:** Unificação dos Renderizadores DANFE/DACTE/DANFSE em Motor Único.
9. **IMP-009:** Sanitizador Global de Caminhos e Proteção Contra Path Traversal.
10. **IMP-010:** Provedor Nativo de Certificados A1 (`.pfx`) sem Dependência do PowerShell.
11. **IMP-011:** Normalização do Mapeamento de Status de DF-e entre Módulos.
12. **IMP-012:** Controle de Créditos de ICMS (CIAP) e PIS/COFINS no Ativo Imobilizado.
13. **IMP-013:** Fila de Download Assíncrono com Limite de Taxa da SEFAZ.
14. **IMP-014:** Serviço de Backup e Restauração Transacional Atômico.
15. **IMP-015:** Sincronização e Deduplicação Automática de Cadastros de Empresas.
16. **IMP-016:** Implementação de Handlers IPC para Operações de Documentos e Depreciação.
17. **IMP-017:** Camada de Abstração no Frontend (`UnifiedApiClient`) com Fallback IPC/HTTP.
18. **IMP-018:** Geração de DANFE Simplificado e Etiqueta para NFC-e.
19. **IMP-019:** Desativação Gradual e Opcional do Servidor Express no Ambiente Desktop.
20. **IMP-020:** Sistema de Resiliência com Retry e Circuit Breaker para WebServices SEFAZ/ADN.
21. **IMP-021:** Painel Unificado de Logs de Auditoria e Telemetria Operacional.
22. **IMP-022:** Verificação Automática de Integridade de Banco na Inicialização.
23. **IMP-023:** Validação e Valoração de CTe e CTe OS com Rateio de Frete no Imobilizado.
24. **IMP-025:** Exportação de Dados para SPED Fiscal (EFD ICMS/IPI Bloco G) e Contribuições.
25. **IMP-025:** Modo Headless / Agendador em Segundo Plano via Electron Tray e Worker Threads.

---

## 6. Visão do Roadmap de 6 Fases

- **Fase 1 (Segurança e Integridade Imediata):** IMP-001, IMP-002, IMP-004, IMP-009.
- **Fase 2 (Unificação do Banco de Dados):** IMP-003, IMP-014, IMP-015.
- **Fase 3 (Convergência de Motores Fiscais e Manifestação SEFAZ):** IMP-005, IMP-007, IMP-008, IMP-011, IMP-018.
- **Fase 4 (Migração de Transporte Express -> IPC):** IMP-016, IMP-017, IMP-019.
- **Fase 5 (Domínio Fiscal Avançado e Reforma Tributária 2026):** IMP-006, IMP-012, IMP-013, IMP-023.
- **Fase 6 (Observabilidade, Resiliência e Automações):** IMP-010, IMP-020, IMP-021, IMP-022, IMP-024, IMP-025.

