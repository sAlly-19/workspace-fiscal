# Fase 1: Segurança Local e Integridade Contábil — Especificação de Design

- **Data**: 2026-10-13
- **Status**: Aprovado (Abordagem A — Modular com Retrocompatibilidade Segura e Salvaguardas Cirúrgicas)
- **Escopo**: IMP-001, IMP-002, IMP-004, IMP-009
- **Restrições**: Zero alterações de schema SQLite; 100% de retrocompatibilidade com as 49 suítes (337 testes) existentes.

---

## 1. IMP-001: Blindagem do Servidor Express (`X-Workspace-Token`)

### 1.1. Objetivo
Impedir que outros processos locais, páginas web abertas no navegador (CSRF/DNS Rebinding) ou dispositivos na mesma rede acessem as rotas da API Express sem autorização.

### 1.2. Arquitetura e Fluxo
1. **Geração no Processo Principal (`electron/main.ts`)**:
   - Na inicialização, gerar `const apiToken = crypto.randomBytes(32).toString('hex')`.
   - Passar `apiToken` para a inicialização do servidor Express (`server.ts` / `src/api/app.ts`) e garantir o bind em `127.0.0.1`.
   - Registrar handler IPC `auth:get-api-token` retornando o token para a janela autenticada.
2. **Ponte Segura (`electron/preload.ts` e `src/types/fiscal-api.d.ts`)**:
   - Expor `getApiToken: () => Promise<string>` no objeto global `window.api`.
3. **Middleware Express (`src/api/middleware/localAuth.ts`)**:
   - Ignorar autenticação apenas para `GET /api/health` (usado pelo `ServerUnreachableOverlay.tsx`).
   - Permitir bypass apenas quando `process.env.BYPASS_LOCAL_AUTH === 'true'` E `process.env.NODE_ENV !== 'production'`. Em produção, o bypass é estritamente ignorado.
   - Validar o header `X-Workspace-Token` usando `crypto.timingSafeEqual` com buffers de tamanho igual para prevenir ataques de temporização (timing attacks). Caso ausente ou inválido, retornar `401 Unauthorized` (`{ error: 'Unauthorized local session' }`).
4. **Cliente HTTP Frontend (`src/web/lib/api.ts`)**:
   - No utilitário `apiFetch`, resolver e armazenar em cache de memória o token via `window.api?.getApiToken?.()` e injetá-lo automaticamente no cabeçalho `X-Workspace-Token`.

---

## 2. IMP-002: Transporte mTLS PowerShell via Stream `stdin`

### 2.1. Objetivo
Eliminar a criação e exclusão de arquivos temporários contendo envelopes fiscais e cabeçalhos em `os.tmpdir()` (`%TEMP%`) durante chamadas mTLS do Buscador.

### 2.2. Arquitetura e Fluxo
1. **Script PowerShell (`src/core/buscador/certificates/windows-bridge.ps1`)**:
   - Adicionar switch `[switch]$InputFromStdin`.
   - Quando `$InputFromStdin` estiver ativo:
     - Forçar `[Console]::InputEncoding = [System.Text.Encoding]::UTF8` antes da leitura para evitar corrupção de acentuação em envelopes XML.
     - Ler payload JSON da entrada padrão (`$rawInput = [Console]::In.ReadToEnd() | ConvertFrom-Json`).
     - Extrair `$rawInput.envelope` e `$rawInput.headers`.
   - Manter parâmetros `-EnvelopeFile` e `-HeadersFile` funcionais como fallback para testes legados.
2. **Provedor de Certificados (`src/core/buscador/certificates/WindowsStoreCertificateProvider.ts` e `http-transport.ts`)**:
   - Validar `thumbprint` com regex estrito `/^[A-Fa-f0-9]{40}$/` antes de instanciar o processo.
   - Invocar o PowerShell passando `-InputFromStdin`.
   - Escrever `JSON.stringify({ envelope, headers })` diretamente em `proc.stdin.write(..., 'utf-8')` seguido de `proc.stdin.end()`.

---

## 3. IMP-004: Precisão Exata em Centavos na Depreciação Proporcional

### 3.1. Objetivo
Eliminar desvios de ponto flutuante decorrentes de divisões intermediárias no cálculo da quota proporcional do primeiro mês de depreciação.

### 3.2. Fórmula Matemática Canônica
No arquivo `src/core/depreciation/calculate.ts` (função `proportionalFirstMonthCents`), substituir o cálculo intermediário em duas etapas pela operação inteira única antes do arredondamento:

$$\text{proporcional} = \text{Math.round}\left(\frac{\text{acquisitionCents} \times \text{annualRate} \times \text{daysRemaining}}{1200 \times \text{dim}}\right)$$

Onde:
- $\text{acquisitionCents}$: base depreciável em centavos inteiros.
- $\text{annualRate}$: taxa anual percentual (ex.: $20$ para $20\%$).
- $\text{daysRemaining}$: dias de uso do ativo no mês de aquisição.
- $\text{dim}$: total de dias do mês de aquisição.

---

## 4. IMP-009: Módulo Central de Sanitização contra Path Traversal

### 4.1. Objetivo
Centralizar a validação de nomes de arquivos e diretórios para bloquear ataques de *Path Traversal* (`../`, caminhos absolutos indevidos, null bytes e nomes reservados do Windows).

### 4.2. Arquitetura e Integração
1. **Novo Módulo (`src/core/security/pathSanitizer.ts`)**:
   - `sanitizeFileName(name: string): string`: remove separadores de diretório, caracteres de controle, null bytes e trata nomes reservados do Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
   - `isPathSafe(baseDir: string, targetPath: string): boolean`: resolve os caminhos com `path.resolve` e valida via `path.relative(resolvedBase, resolvedTarget)` se o destino permanece estritamente dentro de `baseDir` (sem iniciar com `..` nem `path.isAbsolute`).
   - `assertInsideDirectory(baseDir: string, targetPath: string): string`: retorna o caminho resolvido ou lança `PathTraversalError` (status HTTP `400`).
2. **Unificação e Rotas Protegidas**:
   - Atualizar `src/core/buscador/storage/path-sanitizer.ts` para reexportar e consumir `src/core/security/pathSanitizer.ts`, evitando duplicação de regras no repositório.
   - Integrar `assertInsideDirectory` e `sanitizeFileName` em `src/api/routes/import.routes.ts`, `src/api/routes/backup.routes.ts` e `src/api/services/backup/backup-restorer.ts`.

---

## 5. Plano de Verificação e Testes da Fase 1
- **Unitários Novos**:
  - `src/api/middleware/localAuth.test.ts`: testa rejeição `401` sem token, aceitação `200` com token válido, liberação de `/api/health` e restrição da flag `BYPASS_LOCAL_AUTH`.
  - `src/core/security/pathSanitizer.test.ts`: testa vetores `../../etc/passwd`, `..\..\Windows\System32`, null bytes e nomes reservados.
  - `src/core/depreciation/calculate.test.ts`: adiciona casos de teste de precisão em centavos para `proportionalFirstMonthCents`.
  - `src/core/buscador/certificates/http-transport.test.ts`: valida envio via `stdin` com `-InputFromStdin`.
- **Regressão Completa**:
  - Executar `npm test` garantindo aprovação das 49 suítes existentes + novas suítes da Fase 1.

