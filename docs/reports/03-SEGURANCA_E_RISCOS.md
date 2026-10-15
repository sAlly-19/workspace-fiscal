# Relatório 03: Análise de Riscos de Segurança e Confiabilidade (Consolidado v3.5.2)

**Projeto:** `workspace-fiscal`  
**Versão Consolidada:** v3.5.2  
**Status de Segurança:** Todos os Riscos SEC-01 a SEC-05 e Vulnerabilidades de Dependências estão **BLINDADOS E MITIGADOS**.

---

## 1. Matriz de Avaliação de Riscos e Status Consolidado

| ID | Descrição do Risco | Nível Original | Status v3.5.2 | Mitigação Implementada |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Script PowerShell sem Sandbox | Alto | **MITIGADO** | Passagem de envelopes e headers estritamente via `stdin` em memória; zero arquivos em `%TEMP%`. |
| **SEC-02** | API Express sem Token Local | Alto | **MITIGADO** | Middleware `src/api/middleware/localAuth.ts` ativo exigindo `X-Workspace-Token` criptográfico. |
| **SEC-03** | Lock e Concorrência no SQLite | Médio | **MITIGADO** | Banco único unificado configurado com `PRAGMA journal_mode = WAL`, `busy_timeout = 5000` e índices otimizados. |
| **SEC-04** | Vulnerabilidade a Path Traversal | Médio | **MITIGADO** | Sanitizador em `src/core/security/pathSanitizer.ts` com validação de limites de diretório autorizados. |
| **SEC-05** | Exposição de Chaves e Dados Sensíveis | Médio | **MITIGADO** | Redação de dados via `dataRedactor.ts`, descarte de buffers e encriptação via `safeStorage`. |

---

## 2. Hardening e Proteções Defensivas Adicionais (v3.5.2)

### 2.1. Proteção contra Ataques de Descompressão Gzip Bomb (IMP-T01)
- **Vetor Mitigado:** Payloads maliciosos ou corrompidos vindos de WebServices SEFAZ/NFS-e compactados em gzip (`gzDocZip`) que se expandem para múltiplos gigabytes em memória.
- **Implementação:** Em `src/core/buscador/fiscal/utils/compression.ts`, a chamada `zlib.gunzipSync` foi protegida com a opção `{ maxOutputLength: 15 * 1024 * 1024 }` (15 MB), garantindo que arquivos legítimos de lote sejam descompactados com folga enquanto tentativas de exaustão de memória lançam erro controlado `ERR_BUFFER_TOO_LARGE`.
- **Cobertura:** Suíte automatizada `src/core/buscador/fiscal/utils/compression.test.ts`.

### 2.2. Guarda de Tamanho Máximo para Parsing XML (IMP-T02)
- **Vetor Mitigado:** XML Bomb e ataques de DoS por exaustão de pilha SAX/DOM via upload de arquivos gigantescos.
- **Implementação:** Em `src/core/parsers/base.parser.ts`, o método `parseXml` verifica o tamanho em bytes do conteúdo recebido antes de invocar o `fast-xml-parser`. Se o payload exceder `DEFAULT_MAX_XML_BYTES = 25 * 1024 * 1024` (25 MB), a execução é abortada imediatamente com erro explicativo.
- **Cobertura:** Suíte automatizada `src/core/parsers/parsers.test.ts`.

### 2.3. Validação Tipada de Contratos de Entrada REST (IMP-T03)
- **Vetor Mitigado:** Injeção de tipos inesperados, payloads nulos, arrays anômalos ou poluição de parâmetros nas rotas Express.
- **Implementação:** Desenvolvida a camada `src/api/validators/` com validadores tipados (`workspace.validator.ts`, `documents.validator.ts`, `settings.validator.ts`, `company.validator.ts`, `asset.validator.ts`, `category.validator.ts`), retornando consistentemente HTTP 400 com formato padronizado `{ error: string, details: string[] }`.
- **Cobertura:** Suítes automatizadas `src/api/validators/validators.test.ts` e `src/api/routes/validation-routes.test.ts`.

### 2.4. Integridade Criptográfica SHA-256 e Isolamento de Backup (IMP-T05)
- **Vetor Mitigado:** Alteração maliciosa de dados dentro do arquivo de backup `.wfb` ou restauração de módulos incompletos.
- **Implementação:** O manifesto do backup calcula hash SHA-256 independente para cada entrada (`manifest.checksums`). Se qualquer arquivo for alterado ou corrompido, o `backup-inspector.ts` rejeita o arquivo informando a divergência do hash antes de iniciar a transação de restauração.
- **Cobertura:** Suíte automatizada `src/api/services/backup/backup-modules.test.ts`.

### 2.5. Resolução Integral de Vulnerabilidades npm (IMP-T09)
- **Vetor Mitigado:** CVEs em dependências de produção transitivas (`proxy-addr`, `multer`, `adm-zip`, `source-map-js`, `qs`).
- **Implementação:** Inclusão de bloco `"overrides"` no `package.json` para:
  - `proxy-addr`: `^2.0.8` (correção crítica de IP spoofing).
  - `multer`: `^2.4.0` (correção de DoS por descritores de arquivo e multipart).
  - `adm-zip`: `^0.6.1` (correção de path traversal e DoS).
  - `source-map-js`: `^1.2.2` (correção de DoS de loop de eventos).
  - `qs`: `^6.16.1` (correção de bypass de array limit).
- **Validação:** `npm audit --omit=dev --audit-level=high` retorna **0 vulnerabilidades**. Passo audit incluído no pipeline do GitHub Actions (`.github/workflows/ci.yml`) e validado por `tests/ci-workflow.test.ts`.
