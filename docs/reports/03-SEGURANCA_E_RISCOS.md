# Relatório 03: Análise de Riscos de Segurança e Confiabilidade

**Projeto:** `workspace-fiscal`  
**Referência:** Auditoria Arquitetural v3.5.1  
**Escopo:** Avaliação de Vetores Locais, Gerenciamento de Chaves, Processos e Integridade

---

## 1. Matriz de Avaliação de Riscos (SEC-01 a SEC-05)

| ID | Descrição do Risco | Nível de Risco | CVSS (Estimado) | Vetor Principal |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Execução de Script PowerShell Externo sem Sandbox | **Alto** | 7.3 (Local) | Processo Filho / Injeção / Arquivos Temporários |
| **SEC-02** | Exposição da API Express em Porta TCP Local sem Token | **Alto** | 7.1 (Local) | Rede Loopback / Cross-Process Attack |
| **SEC-03** | Trava de Concorrência e Lock (`SQLITE_BUSY`) no SQLite | **Médio** | 5.2 (Disponibilidade) | Escrita Simultânea sem WAL Mode |
| **SEC-04** | Vulnerabilidade a Path Traversal em Arquivos Locais | **Médio** | 5.5 (Integridade) | Parâmetros de Entrada de Arquivos / Backups |
| **SEC-05** | Exposição Residual de Chaves Privadas e Certificados | **Médio** | 5.9 (Confidencialidade) | Garbage Collection / Arquivos Temporários em Disco |

---

## 2. Detalhamento e Plano de Mitigação dos Riscos

### SEC-01: Execução de Script PowerShell Externo sem Sandbox
- **Vetor de Risco:** 
  O método `WindowsStoreCertificateProvider.ts` executa `powershell.exe` com parâmetros como `-EnvelopeFile` e `-HeadersFile`, apontando para caminhos gerados em `os.tmpdir()`. 
- **Problemas Associados:**
  1. Criação de arquivos no diretório temporário (`%TEMP%`) contendo envelopes SOAP SEFAZ e headers HTTP. Se a aplicação falhar de forma inesperada, arquivos com dados fiscais podem permanecer em disco.
  2. Scripts PowerShell executados com `-ExecutionPolicy Bypass` disparam alarmes em softwares antivírus e EDRs corporativos (CrowdStrike, Defender for Endpoint, SentinelOne), gerando bloqueio silencioso da busca fiscal.
  3. Risco de injeção de parâmetros caso argumentos passem por concatenação de strings sem escape rígido.
- **Mitigação Recomendada (Fase 1 / IMP-002):**
  - Eliminar gravação em disco: o envelope XML e os headers JSON devem ser passados diretamente pelo stream `stdin` do processo filho.
  - O script PowerShell deve ler os dados via `$input` / `[Console]::In.ReadToEnd()`.
  - Validar e sanitizar thumbprints e URLs estritamente antes do `spawn`.

---

### SEC-02: Exposição da API Express em Porta TCP Local sem Token
- **Vetor de Risco:**
  O servidor Express escuta em `http://127.0.0.1:3000` (ou porta dinâmica). Qualquer outro processo não privilegiado em execução na mesma máquina do usuário (ou abas de navegadores web explorando vulnerabilidades de loopback) pode emitir requisições HTTP REST diretas para os endpoints de importação, exclusão e backup sem nenhuma credencial de autorização.
- **Mitigação Recomendada (Fase 1 / IMP-001):**
  - No início do ciclo de vida da aplicação (no processo principal do Electron ou no boot do Express), gerar um segredo criptográfico aleatório de alta entropia (`crypto.randomBytes(32).toString('hex')`).
  - Implementar middleware em `src/api/middlewares/authToken.ts` exigindo o cabeçalho `X-Workspace-Token: <token>`.
  - Injetar este token via variável de ambiente ou via preload IPC para o frontend web, rejeitando qualquer requisição sem token com HTTP 403 Forbidden.

---

### SEC-03: Trava de Concorrência e Lock (`SQLITE_BUSY`) no SQLite
- **Vetor de Risco:**
  Como existem dois bancos SQLite distintos e o Express executa múltiplas threads assíncronas de importação, requisições simultâneas de gravação podem disparar erros de concorrência (`SQLITE_BUSY: database is locked`), corrompendo a consistência transacional.
- **Mitigação Recomendada (Fase 2 / IMP-003):**
  - Unificar os bancos de dados em uma única conexão gerenciada pelo Drizzle ORM.
  - Habilitar obrigatoriamente o modo Write-Ahead Logging:
    ```sql
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
    ```
  - Isso permite leituras simultâneas sem bloqueio durante transações de escrita.

---

### SEC-04: Vulnerabilidade a Path Traversal em Arquivos Locais
- **Vetor de Risco:**
  Endpoints de importação de documentos e restauração de backups manipulam caminhos de diretórios informados via payload ou query params. Se sequências como `../` ou separadores de caminho não forem tratados, há potencial para leitura ou escrita arbitrária fora do workspace pretendido.
- **Mitigação Recomendada (Fase 1 / IMP-009):**
  - Criar um módulo utilitário centralizado (`src/core/security/pathSanitizer.ts`).
  - Aplicar `path.resolve` e verificar rigorosamente se o caminho resultante é estritamente filho do diretório base autorizado:
    ```typescript
    export function ensureInsideDirectory(baseDir: string, targetPath: string): string {
      const resolved = path.resolve(baseDir, targetPath);
      if (!resolved.startsWith(path.resolve(baseDir))) {
        throw new Error('Acesso negado: tentativa de path traversal detectada.');
      }
      return resolved;
    }
    ```

---

### SEC-05: Exposição Residual de Chaves Privadas e Certificados
- **Vetor de Risco:**
  Ao importar certificados A1 no formato `.pfx` ou manipular senhas de certificados para descriptografia, buffers de memória contendo a chave privada e a senha podem permanecer no heap do Node.js por tempo indeterminado até a execução do garbage collector.
- **Mitigação Recomendada (Fase 5 / IMP-010):**
  - Sobrescrever buffers de senhas com zeros (`buffer.fill(0)`) imediatamente após o uso.
  - Armazenar credenciais e senhas salvas de certificados utilizando a API nativa do sistema operacional (`electron.safeStorage.encryptString()`), evitando qualquer armazenamento de senhas em texto puro no banco de dados.

