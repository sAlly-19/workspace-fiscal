# Relatório 04: Catálogo de Melhorias Priorizadas (IMP-001 a IMP-025)

**Projeto:** `workspace-fiscal`  
**Referência:** Auditoria Arquitetural v3.5.1  
**Total de Propostas:** 25 melhorias estruturadas com Critérios de Aceite

---

## 1. Matriz de Priorização (Impacto vs. Esforço)

| ID | Título da Melhoria | Prioridade | Esforço | Impacto | Fase |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IMP-001** | Blindagem da API Express com Token de Sessão Local | P0 (Imediata) | Baixo | Alto | Fase 1 |
| **IMP-002** | Ponte PowerShell via Stdin sem Arquivos em Disco | P0 (Imediata) | Baixo | Alto | Fase 1 |
| **IMP-003** | Unificação dos Bancos de Dados em Schema Único SQLite | P1 (Alta) | Alto | Alto | Fase 2 |
| **IMP-004** | Precisão Exata em Centavos e Rateio sem Desvio | P0 (Imediata) | Baixo | Alto | Fase 1 |
| **IMP-005** | Unificação dos Parsers Fiscais em Módulo Único | P1 (Alta) | Médio | Alto | Fase 3 |
| **IMP-006** | Suporte aos Grupos IBS, CBS e Imposto Seletivo (Reforma 2026) | P2 (Média) | Médio | Alto | Fase 5 |
| **IMP-007** | Manifestação do Destinatário Automática SEFAZ (210210) | P1 (Alta) | Médio | Alto | Fase 3 |
| **IMP-008** | Unificação de Layouts DANFE/DACTE com React Server DOM | P2 (Média) | Médio | Médio | Fase 3 |
| **IMP-009** | Sanitizador Global de Caminhos contra Path Traversal | P0 (Imediata) | Baixo | Médio | Fase 1 |
| **IMP-010** | Provedor Nativo de Certificados A1 (`.pfx`) sem PowerShell | P2 (Média) | Médio | Alto | Fase 6 |
| **IMP-011** | Normalização de Mapeamento de Status de DF-e | P2 (Média) | Baixo | Médio | Fase 3 |
| **IMP-012** | Controle de Créditos de ICMS (CIAP) e PIS/COFINS | P3 (Evolutiva)| Alto | Alto | Fase 5 |
| **IMP-013** | Fila Assíncrona de Download com Rate-Limiting SEFAZ | P2 (Média) | Médio | Alto | Fase 5 |
| **IMP-014** | Rotina Transacional Atômica de Backup e Restauração | P1 (Alta) | Médio | Alto | Fase 2 |
| **IMP-015** | Sincronização e Deduplicação de Cadastros de Empresas | P1 (Alta) | Médio | Alto | Fase 2 |
| **IMP-016** | Handlers Electron IPC para Rotas de Documentos e Ativos | P1 (Alta) | Médio | Alto | Fase 4 |
| **IMP-017** | `UnifiedApiClient` no Frontend com Fallback IPC/HTTP | P1 (Alta) | Médio | Alto | Fase 4 |
| **IMP-018** | Emissão de DANFE Simplificado e Etiqueta NFC-e | P3 (Evolutiva)| Médio | Médio | Fase 3 |
| **IMP-019** | Desativação Gradual e Opcional do Express em Produção | P2 (Média) | Médio | Médio | Fase 4 |
| **IMP-020** | Resiliência com Circuit Breaker e Backoff Exponencial | P2 (Média) | Médio | Médio | Fase 6 |
| **IMP-021** | Painel Unificado de Logs de Auditoria e Telemetria | P2 (Média) | Médio | Médio | Fase 6 |
| **IMP-022** | Verificação Automática de Integridade de Banco no Boot | P2 (Média) | Baixo | Médio | Fase 6 |
| **IMP-023** | Valoração de CTe e Rateio de Frete no Ativo Imobilizado | P3 (Evolutiva)| Médio | Médio | Fase 5 |
| **IMP-024** | Módulo de Exportação para SPED Fiscal (Bloco G) | P3 (Evolutiva)| Alto | Alto | Fase 6 |
| **IMP-025** | Execução Headless com Agendador em Segundo Plano (Tray) | P3 (Evolutiva)| Alto | Alto | Fase 6 |

---

## 2. Detalhamento e Critérios de Aceite por Melhoria

### IMP-001: Blindagem da API Express com Token de Sessão Local
- **Objetivo:** Impedir acessos não autorizados por outros processos ou páginas no browser local.
- **Critérios de Aceite:**
  1. Boot do Electron gera chave de 32 bytes via `crypto.randomBytes`.
  2. Middleware Express rejeita requisições sem `X-Workspace-Token` válido com HTTP 403.
  3. Frontend inclui o token em todos os cabeçalhos de requisição via `src/web/lib/api.ts`.
  4. Testes automatizados cobrindo requisições válidas e rejeitadas.

### IMP-002: Ponte PowerShell via Stdin sem Arquivos em Disco
- **Objetivo:** Eliminar gravação de XMLs e tokens em arquivos temporários `%TEMP%`.
- **Critérios de Aceite:**
  1. `WindowsStoreCertificateProvider.ts` passa envelopes SOAP e headers JSON via `stdin`.
  2. `windows-bridge.ps1` lê o payload via stream sem gerar arquivos no disco.
  3. Nenhum arquivo temporário é criado em `os.tmpdir()`.
  4. Testes de unidade e integração validando requisições SOAP e HTTP mTLS.

### IMP-003: Unificação dos Bancos de Dados SQLite
- **Objetivo:** Consolidar `workspace-fiscal.sqlite` e `fiscal_storage.db` sob Drizzle ORM.
- **Critérios de Aceite:**
  1. Schema unificado em `src/db/schema.ts` contendo tabelas do Express e do Buscador.
  2. Migração automática de dados existentes do banco legado para a nova estrutura.
  3. Conexão ativada em `WAL mode` com timeout de concorrência.
  4. Testes unitários do schema e das migrações passando.

### IMP-004: Precisão Exata em Centavos e Rateio sem Desvio
- **Objetivo:** Eliminar desvios de arredondamento em depreciações proporcionais.
- **Critérios de Aceite:**
  1. O cálculo de proporcionalidade não aplica divisões intermediárias flutuantes.
  2. A soma de todas as quotas mensais equivale a `valor_aquisicao - valor_residual` com precisão de 0 centavos.
  3. Bateria de testes com valores ímpares, dízimas e dias bissextos.

### IMP-005: Unificação dos Parsers Fiscais XML
- **Objetivo:** Centralizar parsing de NF-e, CT-e e NFS-e em `src/core/parsers/`.
- **Critérios de Aceite:**
  1. `src/core/buscador/fiscal/parsers/` é descontinuado e redireciona para `src/core/parsers/`.
  2. Todas as entidades fiscais utilizam as interfaces de `src/core/fiscal.types.ts`.
  3. Suporte completo a todas as versões de layout (NF-e 4.00, CT-e 4.00, NFS-e Padrão Nacional).

### IMP-006: Suporte aos Grupos IBS, CBS e Imposto Seletivo (Reforma 2026)
- **Objetivo:** Preparar a aplicação para a Reforma Tributária Nacional (EC 132/2023).
- **Critérios de Aceite:**
  1. Modelos tipados e parsers extraem tags `<IBS>`, `<CBS>` e `<IS>`.
  2. Componentes visuais exibem resumo de tributos da nova reforma quando presentes.
  3. Exportação e relatórios contêm colunas dedicadas aos novos tributos.

### IMP-007: Manifestação do Destinatário Automática SEFAZ
- **Objetivo:** Resolver o problema de XMLs que ficam apenas como "Ciência da Operação".
- **Critérios de Aceite:**
  1. Ao receber `resNFe`, o sistema emite automaticamente o evento `210210` (Ciência da Operação).
  2. Na rodada seguinte de consulta por NSU, o sistema obtém e armazena o `procNFe` completo.
  3. Interface permite registrar manualmente Confirmação (`210200`) ou Desconhecimento (`210220`).

### IMP-008: Unificação dos Motores de Layout DANFE/DACTE
- **Objetivo:** Garantir 100% de paridade visual entre preview interativo e impressão em lote.
- **Critérios de Aceite:**
  1. Layouts compartilham componentes visuais React.
  2. O gerador de impressão estática utiliza `renderToStaticMarkup`.
  3. Impressão em lote preserva quebras de página A4 e cabeçalhos normatizados.

### IMP-009: Sanitizador Global de Caminhos contra Path Traversal
- **Objetivo:** Impedir manipulação arbitrária de diretórios do sistema de arquivos.
- **Critérios de Aceite:**
  1. Implementação de `pathSanitizer.ts` com validação de limites de diretório.
  2. Validação obrigatória em rotas de importação, exportação e restauração de backup.
  3. Testes unitários com vetores de ataque conhecidos (`../../`, caminhos absolutos, caracteres nulos).

### IMP-010 a IMP-025: Detalhamento Técnico
- **IMP-010:** Provedor de certificado `.pfx` em Node.js usando `tls.createSecureContext` em memória sem PowerShell.
- **IMP-014:** Backup transacional com snapshot atômico do SQLite via `VACUUM INTO`.
- **IMP-015:** Deduplicação inteligente de empresas por CNPJ com fusão de metadados.
- **IMP-016 & IMP-017:** Camada unificada de transporte com fallback inteligente entre IPC e HTTP.
- **IMP-020:** Retry com backoff exponencial e circuit breaker para serviços externos governamentais.
- **IMP-021:** Painel de auditoria com exportação de logs técnicos em JSON/CSV.
- **IMP-022:** Verificação automática de `PRAGMA integrity_check` na inicialização da aplicação.
- **IMP-024:** Gerador do Bloco G do SPED Fiscal (Controle do Crédito de ICMS do Ativo Permanente).
- **IMP-025:** Modo silencioso minimizado na bandeja do sistema (System Tray) para monitoramento contínuo.

