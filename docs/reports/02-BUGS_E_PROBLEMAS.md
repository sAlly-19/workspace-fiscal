# Relatório 02: Catálogo de Bugs, Problemas e Dívidas Técnicas

**Projeto:** `workspace-fiscal`  
**Referência:** Auditoria Arquitetural v3.5.1  
**Status:** Mapeado para Correção Progressiva

---

## 1. Visão Geral dos Problemas Confirmados

| ID | Título | Severidade | Módulos Afetados | Arquivos Principais |
| :--- | :--- | :--- | :--- | :--- |
| **PROB-01** | Bifurcação de Bancos de Dados SQLite | Crítica | DB, API, Buscador | `src/db/`, `src/core/buscador/database/` |
| **PROB-02** | Duplicação de Parsers Fiscais XML | Alta | Core, Parsers, Buscador | `src/core/parsers/`, `src/core/buscador/fiscal/` |
| **PROB-03** | Duplicação de Motores de Layout DANFE | Média | Core DANFE, Frontend | `src/core/danfe/`, `src/web/features/documents/` |
| **PROB-04** | Hibridismo de Transporte (HTTP vs. IPC) | Alta | API, IPC, Frontend | `server.ts`, `electron/preload.ts`, `src/web/lib/api.ts` |
| **PROB-05** | Dependência Frágil de Processos PowerShell | Alta | Buscador, Certificados | `src/core/buscador/certificates/` |
| **PROB-06** | Ausência de Manifestação SEFAZ Automática | Alta | Buscador, SEFAZ | `src/core/buscador/fiscal/` |

---

## 2. Detalhamento dos Problemas

### PROB-01: Bifurcação de Bancos de Dados SQLite
- **Descrição:** O sistema mantém duas bases SQLite distintas rodando em paralelo no mesmo desktop:
  1. `workspace-fiscal.sqlite`: gerenciada por Drizzle ORM no processo Express (`src/db/`), contendo tabelas de empresas, documentos importados, ativos e categorias de depreciação.
  2. `fiscal_storage.db`: gerenciada por `sql.js` no processo Electron Buscador (`src/core/buscador/database/`), contendo certificados, empresas monitoradas, NSUs e documentos capturados da SEFAZ/NFS-e.
- **Causa Raiz:** O Buscador Fiscal foi desenvolvido originalmente como subsistema isolado antes da unificação sob o Hub Principal.
- **Impacto:** Cadastros de empresas não sincronizados, risco de locks em concorrência, rotinas de backup divididas em dois arquivos e impossibilidade de consultas analíticas cruzadas (ex: cruzar XML capturado com bem imobilizado sem sync manual).
- **Correção Recomendada:** Consolidar todas as tabelas em um único banco SQLite via Drizzle ORM (`src/db/schema.ts`), com migrações automatizadas e pool único ativado com `WAL mode`.

---

### PROB-02: Duplicação de Parsers Fiscais XML
- **Descrição:** Existem duas implementações independentes de parsers para documentos fiscais (NF-e, CT-e, NFS-e e NFC-e):
  - Camada 1: `src/core/parsers/nfe.parser.ts`, `cte.parser.ts`, `nfse.parser.ts`.
  - Camada 2: `src/core/buscador/fiscal/parsers/NFeParser.ts`, `CTeParser.ts`, `NFSeParser.ts`.
- **Causa Raiz:** Falta de compartilhamento de domínio quando os submódulos foram integrados ao monorepo.
- **Impacto:** Divergência na extração de campos (ex: faturas, duplicatas, tags fiscais específicas), duplicidade de testes unitários e esforço duplo para incorporar alterações tributárias (como a Reforma Tributária 2026).
- **Correção Recomendada:** Estabelecer `src/core/parsers/` como única autoridade de parsing no domínio da aplicação, exportando modelos tipados (`src/core/fiscal.types.ts`) e descontinuando a camada interna do Buscador.

---

### PROB-03: Duplicação de Motores de Layout DANFE/DACTE
- **Descrição:** A renderização de documentos auxiliares possui duas lógicas separadas:
  - Renderizadores de string HTML (`src/core/danfe/renderers/`): utilizados na geração de PDF e impressão em lote.
  - Componentes React TSX (`src/web/features/documents/`): utilizados na pré-visualização interativa na tela.
- **Causa Raiz:** O preview foi criado como SPA interativa com Tailwind, enquanto a impressão foi modelada em HTML string estático com estilos embutidos para impressão direta via Electron BrowserWindow.
- **Impacto:** Discrepâncias visuais entre o que o usuário enxerga no preview interativo e o que é impresso em folha A4 no lote de impressão.
- **Correção Recomendada:** Unificar a geração de layouts utilizando componentes React renderizados via `renderToStaticMarkup` do `react-dom/server` para a geração de HTML de impressão, garantindo paridade visual absoluta de 100%.

---

### PROB-04: Hibridismo de Transporte (Express HTTP Local vs. Electron IPC)
- **Descrição:** O frontend React consome a API do NFView e Depreciação através de requisições `fetch` HTTP para `http://127.0.0.1:3000` (ou porta dinâmica). Já o Buscador utiliza chamadas nativas assíncronas via `window.fiscalApi` (Electron IPC).
- **Causa Raiz:** O backend foi estruturado inicialmente como uma API REST Express independente para possibilitar execução standalone.
- **Impacto:**
  - Se a porta 3000 estiver ocupada, a aplicação depende de porta randômica ou falha.
  - Necessidade de tratamento constante de queda de servidor na interface (`ServerUnreachableOverlay.tsx`).
  - Overhead desnecessário de pilha de rede TCP local para chamadas internas de desktop.
- **Correção Recomendada:** Criar camada de IPC Handlers para as rotas da API e implementar um `UnifiedApiClient` no frontend que utiliza IPC quando disponível no Electron e HTTP como fallback para desenvolvimento em browser.

---

### PROB-05: Dependência Frágil de Processos PowerShell para mTLS
- **Descrição:** As requisições mTLS para SEFAZ e NFS-e ADN no Windows são executadas invocando `powershell.exe -ExecutionPolicy Bypass -File windows-bridge.ps1`.
- **Causa Raiz:** Necessidade de acessar a chave privada do certificado digital armazenada na Windows Certificate Store (CryptoAPI / CNG) sem expor ou exportar a chave privada em disco.
- **Impacto:**
  - Latência de 500ms a 1500ms por requisição devido ao tempo de subida do runtime PowerShell.
  - Gravação de arquivos temporários em disco (`os.tmpdir()`) contendo payloads XML e tokens JSON.
  - Risco de bloqueio por softwares corporativos de segurança (Windows Defender, EDRs, AppLocker).
- **Correção Recomendada:**
  1. Imediato: Migrar a passagem de parâmetros do PowerShell para `stdin` em memória, eliminando a criação de arquivos temporários no disco.
  2. Definitivo: Adicionar provedor nativo para certificados `.pfx` em memória e avaliar addon nativo Node C++ para WinCrypt/CNG.

---

### PROB-06: Ausência de Manifestação SEFAZ Automática
- **Descrição:** Ao consultar documentos via WebService SEFAZ (`DistribuicaoDFe`), a SEFAZ frequentemente retorna apenas o resumo do documento (`resNFe`), mantendo o status no sistema como "Ciência da Operação".
- **Causa Raiz:** A legislação fiscal brasileira (Ajuste SINIEF 07/05) exige que o destinatário envie um evento de manifestação de Ciência da Operação (`tpEvento=210210`) para que a SEFAZ libere o XML completo com validade jurídica (`procNFe`).
- **Impacto:** Documentos importantes permanecem sem o XML completo baixado até que o usuário execute manifestação manual em software externo.
- **Correção Recomendada:** Implementar no motor de distribuição a emissão automática do evento de Ciência da Operação para todas as chaves onde apenas o resumo foi capturado, seguido de requisição subsequente para download do `procNFe`.

