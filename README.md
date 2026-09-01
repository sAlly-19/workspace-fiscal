# Workspace Fiscal — Hub Fiscal Desktop

Hub fiscal **desktop-first** com 2 módulos: **NF View** (visualização de XMLs em DANFE A4) e **Depreciação** (controle patrimonial com CSV contábil). Electron + React + SQLite local.

![Electron](https://img.shields.io/badge/Electron-33-blue?style=flat-square&logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?style=flat-square&logo=sqlite)

---

## Funcionalidades

### 1. NF View — Visualizador DANFE
- NF-e (55), NFC-e (65), CT-e (57), NFS-e (ABRASF / Sefin Nacional / Municipal)
- Detecção automática + parsers dedicados
- DANFE/DACTE/DANFSE em padrão SEFAZ A4 com impressão direta e `batch-print`
- Workspace com pastas, busca server-side, drag & drop, impressão em lote

### 2. Depreciação — Controle Patrimonial
- **Empresas** (razão social + CNPJ) — empresa selecionada sempre visível no topo
- **Categorias** com taxa padrão (ex: Computadores 20%, Máquinas 10%)
- **Bens/NFs** (fornecedor, data, nº NF, valor em centavos, NCM, descrição, taxa anual) + **Dar Baixa** (baixa com data/motivo, histórico truncado, reativação)
- **Cálculo em centavos** com mês proporcional (`dias restantes / dias no mês`) e ajuste de residual no último mês para zerar exato
- **Regra configurável por empresa:** `PROPORCIONAL` | `MÊS_DA_AQUISIÇÃO` | `MÊS_SEGUINTE`
- **Histórico por bem** com status `Exportado (verde) / Atual (azul) / Futuro (branco)` — meses passados não exportados permanecem `Futuro` até gerar retroativa; baixados truncados
- **Tela mensal** (competência = último mês fechado, ex: em agosto fecha julho) com totais, contagem de bens e `Gerar CSV`
- **CSV `;` UTF-8 com BOM** compatível Excel, `Data;Descrição;Tipo;Nº Doc;Valor` (valores `500,00` sem `R$`)
- **Prevenção de duplicidade:** `409` se competência já exportada → modal `Visualizar / Gerar novamente / Cancelar`
- **Retroativa:** ao cadastrar bem com aquisição ≤ último fechado, pergunta se deseja gerar arquivo com todas as competências desde a aquisição até o fechado

---

## Stack

| Camada | Tech |
|---|---|
| Desktop | Electron 33 (sandbox:true, TitleBar custom, IPC harden) |
| Frontend | Vite 6 + React 19 + Tailwind 4 + Zustand + Motion + Lucide |
| Backend | Express 4 + Drizzle ORM + SQLite (`@libsql/client`, WAL, `busy_timeout`) |
| Parsers | `fast-xml-parser` |
| Linguagem | TypeScript 5.8 |

---

## Pré-requisitos

- Node.js 20+ e npm 10+

## Instalação e uso

```bash
# 1. Clonar e instalar
git clone <seu-repo>.git
cd workspace-fiscal
npm install

# 2. Rodar web (API em :3000 + Vite HMR)
npm run dev
# http://localhost:3000  e  http://localhost:5173

# 3. Rodar Electron em dev (requer Vite em :5173)
npm run electron:dev

# 4. Build produção
npm run build              # gera dist/ + dist-electron/
npm run electron:start     # build + abre Electron prod
```

> **Primeira execução** cria `sqlite.db` (dev) ou `AppData/Roaming/Electron/workspace-fiscal.sqlite` (prod, migra `nfview.sqlite` automaticamente) + `storage/documents` automaticamente. Seed de 8 categorias padrão.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | `tsx server.ts` (Express + Vite middleware) |
| `npm run dev:web` | Apenas Vite |
| `npm run electron:dev` | Vite + Electron dev |
| `npm run build` | `build:web && build:electron` |
| `npm run build:web` | `vite build` → `dist/` |
| `npm run build:electron` | `esbuild` → `dist-electron/` |
| `npm run lint` | `tsc --noEmit` |

## Variáveis de ambiente

Veja `.env.example`:

```env
# Opcional — se não definido, usa cwd (dev) ou AppData (prod)
NFVIEW_DB_PATH=./sqlite.db
NFVIEW_STORAGE_PATH=./storage
PORT=3000
NODE_ENV=development
```

## Estrutura do projeto

```
electron/
  main.ts          # BrowserWindow, IPC harden, API em porta aleatória
  preload.ts       # contextBridge (sandbox:true)
src/
  core/
    parsers/       # NFe, CTe, NFSe + detector
    danfe/helpers.ts
    depreciation/calculate.ts  # motor em centavos
  db/
    schema.ts      # companies, categories, assets, depreciation_*
    index.ts       # WAL, backup de corrupção, seed
  api/
    app.ts         # factory Express compartilhada
    routes/        # import, documents, workspace, companies, assets, depreciation...
    services/      # storage, import, depreciation
    middleware/securityHeaders.ts
  web/
    features/
      home/Home.tsx
      depreciation/DepreciationApp.tsx
      documents/   # DANFE previews
      workspace/   # tree
    stores/        # workspace, depreciation
    components/TitleBar.tsx
public/
  icon.png
  favicon.png
```

## Dados locais e Git

Arquivos **não versionados** (recriados automaticamente, vide `.gitignore`):

- `node_modules/`, `dist/`, `dist-electron/`, `build/`, `coverage/`
- `sqlite.db`, `*.db`, `storage/` (XMLs/PDFs), `*.log`
- `.env`, `.env.local`
- `bun.lock` (projeto usa `npm` + `package-lock.json`)

Para subir ao GitHub manualmente:

```bash
git init
git add .
git commit -m "feat: hub fiscal com NF View e depreciação"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/<seu-repo>.git
git push -u origin main
```

## Licença

Apache-2.0 — ver `LICENSE` se aplicável.
