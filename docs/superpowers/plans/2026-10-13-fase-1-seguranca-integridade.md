# Fase 1: Segurança Local e Integridade Contábil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blindar a segurança do servidor Express com token de sessão timing-safe, eliminar escrita temporária no mTLS PowerShell via stdin UTF-8, garantir precisão exata em centavos no cálculo proporcional de depreciação e centralizar o sanitizador contra path traversal.

**Architecture:** Abordagem A modular em camadas: (1) geração de token criptográfico de 32 bytes no Electron propagado via IPC seguro para o Express e cliente `apiFetch`; (2) switch `-InputFromStdin` com `[Console]::InputEncoding = [System.Text.Encoding]::UTF8` no script PowerShell; (3) fórmula analítica inteira única para rateio proporcional de depreciação sem divisões flutuantes duplas; (4) módulo central `pathSanitizer` reexportado e integrado nas rotas de import/backup e storage.

**Tech Stack:** Node.js crypto, Electron 32 IPC, Express 4 middleware, PowerShell 5.1+, Vitest, TypeScript 5.5.

**Spec:** `docs/superpowers/specs/2026-10-13-fase-1-seguranca-integridade-design.md`

## Global Constraints
- Zero alterações de schema SQLite ou migração de banco de dados nesta fase.
- 100% de retrocompatibilidade com as 49 suítes e 337 testes unitários existentes.
- `BYPASS_LOCAL_AUTH=true` aceito estritamente apenas quando `process.env.NODE_ENV !== 'production'`.
- Validação de token com `crypto.timingSafeEqual` sobre buffers normalizados para prevenir timing attacks e buffer errors.
- Nenhuma dependência externa nova adicionada ao `package.json`.

## Review Focus
- Requisição com cabeçalho `X-Workspace-Token` de tamanho diferente do token original não deve estourar exceção em `crypto.timingSafeEqual` e deve retornar HTTP 401.
- Injeção de caracteres multibyte ou acentuados (UTF-8) via stdin para o script PowerShell não pode corromper envelopes XML da SEFAZ no Windows.
- Ativos com taxas anuais fracionadas ou aquisição em meses com 28, 29, 30 e 31 dias devem acumular depreciação com convergência exata ao valor de aquisição sem resíduo de 1 centavo.
- Parâmetro `filePaths` ou `filename` com nomes reservados do Windows (`NUL`, `CON`, `AUX`, `COM1`, `LPT1`) ou sequências `../../` deve ser bloqueado com erro 400 (`PathTraversalError`).
- Em ambiente de desenvolvimento web (Vite sem Electron), `apiFetch` deve operar sem travar na ausência de `window.api`.

---

### Task 1: IMP-004 — Precisão Exata em Centavos na Depreciação Proporcional

**Files:**
- Modify: `src/core/depreciation/calculate.ts:66-82`
- Test: `src/core/depreciation/calculate.test.ts`

**Interfaces:**
- Produces: `proportionalFirstMonthCents(acquisitionCents: number, annualRate: number, acquisitionDate: Date): number`
- Fórmula: `Math.round((acquisitionCents * annualRate * daysRemaining) / (1200 * dim))`

- [ ] **Step 1: Escrever teste de precisão e convergência sem desvio**

Adicionar testes em `src/core/depreciation/calculate.test.ts`:
```typescript
it('deve calcular proporcional do primeiro mes sem desvio por divisao flutuante dupla', () => {
  // Aquisição dia 15 num mês de 31 dias: dim=31, daysRemaining=17
  // acquisitionCents = 100000 (R$ 1.000,00), annualRate = 20%
  // Formula exata: round(100000 * 20 * 17 / (1200 * 31)) = round(34000000 / 37200) = 914 centavos (R$ 9,14)
  const date = new Date(2026, 0, 15); // Jan 15, 2026
  const prop = proportionalFirstMonthCents(100000, 20, date);
  expect(prop).toBe(914);
});

it('deve garantir convergencia exata de schedule proporcional com anos bissextos e taxas impares', () => {
  const schedule = generateSchedule({
    acquisitionValue: 100000,
    annualRate: 15,
    acquisitionDate: new Date(2024, 1, 15), // Fev 15, 2024 (ano bissexto dim=29, rem=15)
    depreciationRule: 'PROPORTIONAL',
  });
  const totalDepreciated = schedule.reduce((sum, item) => sum + item.depreciationValue, 0);
  expect(totalDepreciated).toBe(100000);
  expect(schedule[schedule.length - 1].currentValue).toBe(0);
});
```

- [ ] **Step 2: Executar testes de depreciação e verificar se passam ou falham**

Run: `npx vitest run src/core/depreciation/calculate.test.ts`

- [ ] **Step 3: Implementar fórmula analítica única em `calculate.ts`**

No arquivo `src/core/depreciation/calculate.ts`:
```typescript
export function proportionalFirstMonthCents(
  acquisitionCents: number,
  annualRate: number,
  acquisitionDate: Date
): number {
  const year = acquisitionDate.getFullYear();
  const month = acquisitionDate.getMonth() + 1;
  const day = acquisitionDate.getDate();
  const dim = daysInMonth(year, month);
  const daysRemaining = dim - day + 1; // inclusive
  
  // Operação inteira antes da divisão para evitar float drift
  return Math.round((acquisitionCents * annualRate * daysRemaining) / (1200 * dim));
}
```

- [ ] **Step 4: Executar testes e validar aprovação**

Run: `npx vitest run src/core/depreciation/calculate.test.ts`
Expected: PASS com 100% de asserções verdes.

- [ ] **Step 5: Commit local da Task 1**

```bash
git add src/core/depreciation/calculate.ts src/core/depreciation/calculate.test.ts
git commit -m "fix(depreciation): implement exact integer formula for proportional depreciation"
```

---

### Task 2: IMP-009 — Módulo Central de Sanitização contra Path Traversal

**Files:**
- Create: `src/core/security/pathSanitizer.ts`
- Create: `src/core/security/pathSanitizer.test.ts`

**Interfaces:**
- Produces:
  - `class PathTraversalError extends Error`
  - `sanitizeFileName(name: string): string`
  - `isPathSafe(baseDir: string, targetPath: string): boolean`
  - `assertInsideDirectory(baseDir: string, targetPath: string): string`

- [ ] **Step 1: Escrever testes unitários em `pathSanitizer.test.ts`**

Criar `src/core/security/pathSanitizer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import path from 'path';
import { sanitizeFileName, isPathSafe, assertInsideDirectory, PathTraversalError } from './pathSanitizer';

describe('pathSanitizer', () => {
  it('remove separadores de diretorio e traversal em nomes de arquivos', () => {
    expect(sanitizeFileName('../../test.xml')).toBe('test.xml');
    expect(sanitizeFileName('..\\..\\malicious.zip')).toBe('malicious.zip');
    expect(sanitizeFileName('foo/bar/baz.xml')).toBe('baz.xml');
  });

  it('neutraliza nomes reservados do Windows', () => {
    expect(sanitizeFileName('CON.xml')).toBe('_CON.xml');
    expect(sanitizeFileName('aux')).toBe('_aux');
    expect(sanitizeFileName('NUL.txt')).toBe('_NUL.txt');
    expect(sanitizeFileName('com1.pdf')).toBe('_com1.pdf');
  });

  it('detecta se caminho alvo permanece dentro do diretorio base', () => {
    const base = path.resolve('/safe/storage');
    expect(isPathSafe(base, path.join(base, 'file.xml'))).toBe(true);
    expect(isPathSafe(base, path.join(base, 'sub', 'file.xml'))).toBe(true);
    expect(isPathSafe(base, path.join(base, '..', 'evil.xml'))).toBe(false);
  });

  it('assertInsideDirectory lanca PathTraversalError se fora do diretorio', () => {
    const base = path.resolve('/safe/storage');
    expect(() => assertInsideDirectory(base, path.join(base, '..', 'root.xml'))).toThrow(PathTraversalError);
  });
});
```

- [ ] **Step 2: Executar testes para confirmar falha (RED)**

Run: `npx vitest run src/core/security/pathSanitizer.test.ts`
Expected: FAIL com módulo não encontrado.

- [ ] **Step 3: Implementar `src/core/security/pathSanitizer.ts`**

Criar `src/core/security/pathSanitizer.ts`:
```typescript
import path from 'path';

export class PathTraversalError extends Error {
  constructor(message = 'Acesso fora do diretório autorizado negado.') {
    super(message);
    this.name = 'PathTraversalError';
  }
}

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  const base = path.basename(name.trim());
  let sanitized = base
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .trim()
    .substring(0, 255);

  if (!sanitized) return 'unnamed_file';

  const baseNoExt = sanitized.split('.')[0] || '';
  if (WINDOWS_RESERVED_NAMES.test(baseNoExt.toLowerCase())) {
    sanitized = `_${sanitized}`;
  }

  return sanitized;
}

export function isPathSafe(baseDir: string, targetPath: string): boolean {
  if (!baseDir || !targetPath) return false;
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function assertInsideDirectory(baseDir: string, targetPath: string): string {
  if (!isPathSafe(baseDir, targetPath)) {
    throw new PathTraversalError(`Tentativa de violação de diretório: ${targetPath}`);
  }
  return path.resolve(targetPath);
}
```

- [ ] **Step 4: Executar testes unitários e validar aprovação (GREEN)**

Run: `npx vitest run src/core/security/pathSanitizer.test.ts`
Expected: PASS com 100% de asserções verdes.

- [ ] **Step 5: Commit local da Task 2**

```bash
git add src/core/security/pathSanitizer.ts src/core/security/pathSanitizer.test.ts
git commit -m "feat(security): create central pathSanitizer module with windows reserved name guards"
```

---

### Task 3: IMP-009 Integração — Unificação de Storage e Rotas de Import/Backup

**Files:**
- Modify: `src/core/buscador/storage/path-sanitizer.ts` (reexportar do central)
- Modify: `src/api/routes/import.routes.ts`
- Modify: `src/api/routes/backup.routes.ts`

**Interfaces:**
- Consumes: `sanitizeFileName`, `isPathSafe`, `assertInsideDirectory` de `src/core/security/pathSanitizer.ts`

- [ ] **Step 1: Atualizar `src/core/buscador/storage/path-sanitizer.ts` para reexportar**

```typescript
import path from 'path';
import type { DocumentType, SefazEnvironment } from '../domain/types';
import {
  sanitizeFileName as baseSanitizeFileName,
  isPathSafe as baseIsPathSafe,
  assertInsideDirectory,
  PathTraversalError,
} from '../../security/pathSanitizer';

export { assertInsideDirectory, PathTraversalError };

export function sanitizeFilename(filename: string): string {
  return baseSanitizeFileName(filename);
}

export function isSafeSubpath(baseDir: string, targetPath: string): boolean {
  return baseIsPathSafe(baseDir, targetPath);
}

export function buildSafeDocumentPath(
  baseDir: string,
  companyFolder: string,
  docType: DocumentType,
  environment: SefazEnvironment,
  year: string,
  month: string,
  filename: string
): string {
  const safeCompany = sanitizeFilename(companyFolder);
  const safeDocType = docType === 'NFE' ? 'NFe' : docType === 'CTE' ? 'CTe' : 'NFSE';
  const safeEnvironment = environment === 'production' ? 'production' : 'homologation';
  const safeYear = sanitizeFilename(year);
  const safeMonth = sanitizeFilename(month);
  const safeFilename = sanitizeFilename(filename);

  const fullPath = path.join(baseDir, safeCompany, safeDocType, safeEnvironment, safeYear, safeMonth, safeFilename);
  assertInsideDirectory(baseDir, fullPath);
  return fullPath;
}
```

- [ ] **Step 2: Proteger rotas de importação e backup**

Em `src/api/routes/import.routes.ts`:
- No loop de `for (const p of filePaths)`, verificar `isSafeLocalPath` ou rejeitar se contiver sequências maliciosas (`../`).
Em `src/api/routes/backup.routes.ts`:
- No `createBackup`, sanitizar `filename` via `sanitizeFileName` se fornecido.

- [ ] **Step 3: Executar testes de storage e importação**

Run: `npx vitest run src/core/buscador/storage/path-sanitizer.test.ts`
Expected: PASS sem regressão.

- [ ] **Step 4: Commit local da Task 3**

```bash
git add src/core/buscador/storage/path-sanitizer.ts src/api/routes/import.routes.ts src/api/routes/backup.routes.ts
git commit -m "refactor(security): unify path sanitization across storage, import and backup routes"
```

---

### Task 4: IMP-002 — Transporte mTLS PowerShell via Stream `stdin` com UTF-8

**Files:**
- Modify: `src/core/buscador/certificates/windows-bridge.ps1`
- Modify: `src/core/buscador/certificates/WindowsStoreCertificateProvider.ts`
- Test: `src/core/buscador/certificates/http-transport.test.ts`

**Interfaces:**
- Produces: Switch `-InputFromStdin` no PowerShell.
- Stdin Payload JSON: `{ envelope?: string, headers?: Record<string, string> }`

- [ ] **Step 1: Adicionar switch `-InputFromStdin` e encoding UTF-8 no `windows-bridge.ps1`**

No cabeçalho de parâmetros de `windows-bridge.ps1`:
```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Thumbprint,

    [Parameter(Mandatory=$false)]
    [string]$Url,

    [Parameter(Mandatory=$false)]
    [string]$SoapAction,

    [Parameter(Mandatory=$false)]
    [string]$EnvelopeFile,

    [Parameter(Mandatory=$false)]
    [string]$Method = "GET",

    [Parameter(Mandatory=$false)]
    [string]$HeadersFile,

    [Parameter(Mandatory=$false)]
    [int]$TimeoutSec = 30,

    [Parameter(Mandatory=$false)]
    [switch]$InputFromStdin
)

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::Expect100Continue = $false
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$stdinPayload = $null
if ($InputFromStdin) {
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    $rawStdin = [Console]::In.ReadToEnd()
    if ($rawStdin -and $rawStdin.Trim() -ne "") {
        try {
            $stdinPayload = $rawStdin | ConvertFrom-Json
        } catch {
            Write-Error "Falha ao desserializar JSON de entrada via stdin: $($_.Exception.Message)"
            exit 8
        }
    }
}
```

E no bloco `Action -eq "request"`:
```powershell
    $envelopeContent = ""
    if ($InputFromStdin -and $stdinPayload -and $stdinPayload.envelope) {
        $envelopeContent = $stdinPayload.envelope
    } elseif ($EnvelopeFile -and (Test-Path $EnvelopeFile)) {
        $envelopeContent = [System.IO.File]::ReadAllText($EnvelopeFile, [System.Text.Encoding]::UTF8)
    } else {
        Write-Error "Envelope SOAP não informado."
        exit 3
    }
```

E no bloco `Action -eq "http"`:
```powershell
    $headersJson = $null
    if ($InputFromStdin -and $stdinPayload -and $stdinPayload.headers) {
        $headers = $stdinPayload.headers
    } elseif ($HeadersFile -and (Test-Path $HeadersFile)) {
        $rawHeaders = [System.IO.File]::ReadAllText($HeadersFile, [System.Text.Encoding]::UTF8)
        if ($rawHeaders) { $headers = $rawHeaders | ConvertFrom-Json }
    }
```

- [ ] **Step 2: Atualizar `WindowsStoreCertificateProvider.ts` para enviar via `stdin`**

Em `WindowsStoreCertificateProvider.ts`:
1. Atualizar `executeSoapRequest`:
   - Invocar com `-Action request -Thumbprint cleanThumbprint -Url options.url -SoapAction options.soapAction -TimeoutSec options.timeoutSec -InputFromStdin`.
   - Passar payload `{ envelope: options.soapEnvelope }` para `runPowerShellWithStdin(args, JSON.stringify({ envelope: options.soapEnvelope }), options.signal)`.
   - Não criar arquivo temporário em disco!
2. Atualizar `executeHttpRequest`:
   - Invocar com `-Action http -Thumbprint validated.thumbprint -Url validated.url -Method validated.method -TimeoutSec validated.timeoutSec -InputFromStdin`.
   - Passar payload `{ headers: validated.headers || {} }` via `stdin`.
   - Não criar arquivo temporário em disco!

- [ ] **Step 3: Executar testes de transporte**

Run: `npx vitest run src/core/buscador/certificates/http-transport.test.ts`
Expected: PASS com mocks de transporte aprovados.

- [ ] **Step 4: Commit local da Task 4**

```bash
git add src/core/buscador/certificates/windows-bridge.ps1 src/core/buscador/certificates/WindowsStoreCertificateProvider.ts
git commit -m "feat(certificates): stream mTLS payloads via stdin UTF-8 eliminating temp files"
```

---

### Task 5: IMP-001 — Middleware `localAuth` Express com Comparação Timing-Safe

**Files:**
- Create: `src/api/middleware/localAuth.ts`
- Create: `src/api/middleware/localAuth.test.ts`
- Modify: `src/api/app.ts:40-60`

**Interfaces:**
- Produces:
  - `setApiToken(token: string): void`
  - `getApiToken(): string | null`
  - `localAuthMiddleware: RequestHandler`

- [ ] **Step 1: Escrever teste para o middleware em `localAuth.test.ts`**

Criar `src/api/middleware/localAuth.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { localAuthMiddleware, setApiToken } from './localAuth';

describe('localAuthMiddleware', () => {
  const SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

  beforeEach(() => {
    setApiToken(SECRET);
    delete process.env.BYPASS_LOCAL_AUTH;
  });

  it('permite acesso livre a /api/health sem token', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejeita com 401 requisições sem X-Workspace-Token', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));

    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized local session');
  });

  it('rejeita com 401 requisições com token invalido de tamanho diferente sem estourar timingSafeEqual', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));

    const res = await request(app).get('/api/documents').set('X-Workspace-Token', 'curto');
    expect(res.status).toBe(401);
  });

  it('permite requisicao com X-Workspace-Token valido', async () => {
    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));

    const res = await request(app).get('/api/documents').set('X-Workspace-Token', SECRET);
    expect(res.status).toBe(200);
  });

  it('permite bypass apenas se BYPASS_LOCAL_AUTH=true e NODE_ENV!==production', async () => {
    process.env.BYPASS_LOCAL_AUTH = 'true';
    process.env.NODE_ENV = 'development';

    const app = express();
    app.use(localAuthMiddleware);
    app.get('/api/documents', (_req, res) => res.json({ docs: [] }));

    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Executar teste e confirmar falha (RED)**

Run: `npx vitest run src/api/middleware/localAuth.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/api/middleware/localAuth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

let currentApiToken: string | null = null;

export function setApiToken(token: string): void {
  currentApiToken = token;
}

export function getApiToken(): string | null {
  return currentApiToken;
}

export function localAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. /api/health é aberto para probing
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  // 2. Preflight CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 3. Bypass configurado exclusivamente para dev/testes (ignorado em production)
  const isDevOrTest = process.env.NODE_ENV !== 'production';
  if (isDevOrTest && process.env.BYPASS_LOCAL_AUTH === 'true') {
    return next();
  }

  // Se nenhum token foi definido no boot (ex: dev standalone sem token configurado)
  if (!currentApiToken) {
    if (isDevOrTest) return next();
    res.status(401).json({ error: 'Unauthorized local session: token not initialized' });
    return;
  }

  const providedToken = req.headers['x-workspace-token'];
  if (!providedToken || typeof providedToken !== 'string') {
    res.status(401).json({ error: 'Unauthorized local session' });
    return;
  }

  const tokenBuffer = Buffer.from(currentApiToken, 'utf-8');
  const providedBuffer = Buffer.from(providedToken, 'utf-8');

  // Proteção contra timing attack e diferença de comprimento de buffer
  if (tokenBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(tokenBuffer, providedBuffer)) {
    res.status(401).json({ error: 'Unauthorized local session' });
    return;
  }

  next();
}
```

- [ ] **Step 4: Integrar middleware em `src/api/app.ts`**

Em `src/api/app.ts`:
- Adicionar `X-Workspace-Token` ao cabeçalho `Access-Control-Allow-Headers`.
- Aplicar `app.use('/api', localAuthMiddleware);` antes dos roteadores da API.

- [ ] **Step 5: Executar testes de `localAuth` e validar aprovação (GREEN)**

Run: `npx vitest run src/api/middleware/localAuth.test.ts`
Expected: PASS com 100% de asserções verdes.

- [ ] **Step 6: Commit local da Task 5**

```bash
git add src/api/middleware/localAuth.ts src/api/middleware/localAuth.test.ts src/api/app.ts
git commit -m "feat(api): secure Express server with timing-safe local session token"
```

---

### Task 6: IMP-001 Integração — Handshake Electron IPC e Injeção em `apiFetch`

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/web/lib/api.ts`

- [ ] **Step 1: Atualizar `electron/main.ts`**

No `startApiServer` em `electron/main.ts`:
- Gerar `const localToken = crypto.randomBytes(32).toString('hex');`
- Chamar `setApiToken(localToken);`
- Registrar IPC handler: `ipcMain.handle('auth:get-api-token', () => localToken);`

- [ ] **Step 2: Expor `getApiToken` em `electron/preload.ts`**

Adicionar em `electron/preload.ts`:
```typescript
getApiToken: (): Promise<string> => ipcRenderer.invoke('auth:get-api-token'),
```

- [ ] **Step 3: Injetar token automaticamente em `src/web/lib/api.ts`**

Em `src/web/lib/api.ts`:
```typescript
let _cachedApiToken: string | null = null;

export async function getApiToken(): Promise<string | null> {
  if (_cachedApiToken) return _cachedApiToken;
  if (typeof window !== 'undefined' && window.api?.getApiToken) {
    try {
      _cachedApiToken = await window.api.getApiToken();
      return _cachedApiToken;
    } catch {}
  }
  return null;
}
```

E em `apiFetch`:
```typescript
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = await getApiBaseUrl();
  const token = await getApiToken();
  const url = base + (path.startsWith('/') ? path : '/' + path);

  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('X-Workspace-Token')) {
    headers.set('X-Workspace-Token', token);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
  };

  try {
    return await fetch(url, mergedInit);
  } catch (err) {
    // Tratamento de overlay...
    throw err;
  }
}
```

- [ ] **Step 4: Executar suítes de teste de API**

Run: `npm test`
Expected: Todas as suítes passam normalmente.

- [ ] **Step 5: Commit local da Task 6**

```bash
git add electron/main.ts electron/preload.ts src/web/lib/api.ts
git commit -m "feat(ipc): bridge local api token to electron preload and web client"
```

---

### Task 7: Verificação Geral de Regressão, Lint e Build

**Files:**
- N/A (Verificação de Integridade Completa)

- [ ] **Step 1: Executar suite completa de testes unitários**

Run: `npm test`
Expected: 50+ suítes passando (>340 testes verdes).

- [ ] **Step 2: Executar verificação de tipagem TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 erros de compilação.

- [ ] **Step 3: Executar linter**

Run: `npm run lint`
Expected: 0 warnings ou erros.

- [ ] **Step 4: Executar build de produção**

Run: `npm run build`
Expected: Vite build e Electron build gerados com sucesso.

