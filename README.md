# Workspace Fiscal

Hub desktop corporativo para gestão, visualização, auditoria e impressão de documentos fiscais eletrônicos brasileiros e controle patrimonial com cálculo linear de depreciação de ativos imobilizados.

Repositório: [https://github.com/sAlly-19/workspace-fiscal](https://github.com/sAlly-19/workspace-fiscal)  
Versão: 2.5.0

---

## Sumário

- [Visão Geral](#visão-geral)
- [Principais Módulos](#principais-módulos)
  - [1. NF View (Documentos Fiscais)](#1-nf-view-documentos-fiscais)
  - [2. Depreciação Fiscal & Ativo Imobilizado](#2-depreciação-fiscal--ativo-imobilizado)
- [Formatos e Padrões Suportados](#formatos-e-padrões-suportados)
- [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Execução](#instalação-e-execução)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação das Dependências](#instalação-das-dependências)
  - [Modo de Desenvolvimento](#modo-de-desenvolvimento)
  - [Build e Empacotamento](#build-e-empacotamento)
  - [Testes Automatizados](#testes-automatizados)
  - [Validação de Tipos](#validação-de-tipos)
- [Segurança e Privacidade](#segurança-e-privacidade)
- [Licença e Autoria](#licença-e-autoria)

---

## Visão Geral

O **Workspace Fiscal** é uma aplicação desktop de alta performance construída para escritórios de contabilidade, setores fiscais e departamentos financeiros. A solução combina a leitura e organização de arquivos fiscais XML com um motor contábil para o controle e quotas de depreciação do ativo permanente, funcionando 100% offline com banco de dados local.

---

## Principais Módulos

### 1. NF View (Documentos Fiscais)

O módulo **NF View** centraliza a recepção, organização e visualização de arquivos XML de documentos fiscais brasileiros:

- **Visualizadores e Impressão Fiéis aos Padrões Oficiais:**
  - **DANFE (NF-e - Modelo 55):** Layout completo monocromático SEFAZ, código de barras, chave de acesso de 44 dígitos, impostos (ICMS, IPI, PIS, COFINS, ST), transportadora, volumes, duplicatas/faturas, dados dos produtos com NCM, CFOP, CST e alíquotas.
  - **DANFE NFC-e (Modelo 65):** Layout de cupom fiscal para consumidor com detalhamento de itens e totais.
  - **DANFSE (NFS-e - Padrão Nacional / ABRASF):** Layout oficial para serviços com discriminação detalhada dos impostos retidos na fonte (PIS, COFINS, INSS, IRRF, CSLL, ISS Retido e Outras Retenções) e dados cadastrais do prestador e tomador.
  - **DACTE (CT-e - Modelo 57):** Layout oficial para conhecimento de transporte rodoviário, contendo identificação de todas as partes (Emitente, Remetente, Destinatário, Expedidor, Recebedor e Tomador), discriminação de componentes do frete (Frete Peso, Frete Valor, Pedágio, GRIS, Outros), tributação do ICMS, características e peso da carga, documentos originários (NF-e vinculadas) e dados do modal rodoviário (RNTRC, placa, UF e motorista).
- **Importação Flexível e Recursiva:**
  - Upload por seleção ou arrastar e soltar (drag & drop).
  - Importação de arquivos XML individuais.
  - Importação de pastas inteiras com leitura recursiva de subdiretórios.
  - Importação e descompactação automática de pacotes compactados em formato `.zip`.
- **Organização em Árvore de Pastas (Workspace):**
  - Criação, renomeação e exclusão de pastas hierárquicas.
  - Movimentação de documentos individualmente ou em lote.
  - Seleção múltipla com contadores e ações em lote (impressão, movimentação, exclusão).
- **Filtros e Busca em Tempo Real:**
  - Pesquisa instantânea por número do documento, razão social, CNPJ/CPF ou chave de acesso.
- **Visualizador Técnico de XML:**
  - Aba com visualização do código-fonte XML original com destaque de sintaxe, formatação e botão de cópia.
- **Impressão e Exportação em Lote:**
  - Geração de HTML/PDF padronizado para impressão de múltiplos documentos simultaneamente com quebra de página automática.

---

### 2. Depreciação Fiscal & Ativo Imobilizado

O módulo de **Depreciação Fiscal** gerencia a vida útil e as quotas de depreciação mensal dos bens patrimoniais da empresa:

- **Gestão Multiempresa:**
  - Cadastro de múltiplas empresas por Razão Social e CNPJ.
  - Alternância rápida de contexto entre filiais e clientes.
- **Cadastro e Importação de Bens:**
  - Cadastro manual com data de aquisição, valor de custo, valor residual e categoria.
  - Importação inteligente de bens diretamente a partir dos itens de arquivos XML de NF-e de entrada.
- **Categorização Contábil:**
  - Cadastro de categorias com definição de taxa de depreciação anual (%) e anos de vida útil (ex.: Máquinas e Equipamentos, Veículos, Móveis e Utensílios, Edificações, Equipamentos de Informática).
- **Motor de Cálculo Linear Automatizado:**
  - Cálculo de quota de depreciação mensal por competência (AAAA-MM).
  - Cálculo proporcional (pro-rata die) no 1º mês com base nos dias restantes a partir da data de aquisição.
  - Ajuste residual de centavos na última parcela para zerar a diferença em relação ao valor depreciável.
  - Acompanhamento do valor contábil líquido e da depreciação acumulada mês a mês.
- **Depreciação Retroativa (Individual e em Lote):**
  - Geração em lote do histórico de competências passadas para ativos cadastrados com data de aquisição anterior à competência atual.
- **Controle de Baixa e Reativação:**
  - Registro de baixa patrimonial (venda, sucata, descarte ou perda) com data de cessação e motivo.
  - Possibilidade de reativação de ativos baixados.
- **Exportação Contábil e Relatórios:**
  - Exportação de dados formatados para integração contábil (compatível com layout Domínio Sistemas).
  - Demonstração visual do cronograma de competências com status de lançamento (Exportado, Atual, Não Lançado, Futuro).

---

## Formatos e Padrões Suportados

| Documento | Modelo | Padrão / Layout | Parser |
| :--- | :--- | :--- | :--- |
| **NF-e** | 55 | SEFAZ Nacional (ProcNFe / NFe) | `NFeParser` |
| **NFC-e** | 65 | SEFAZ Estadual | `NFeParser` |
| **NFS-e** | - | ABRASF / Sefin Nacional (CompNfse / Nfse) | `NFSeParser` |
| **CT-e** | 57 | SEFAZ DACTE Rodoviário (CteProc / CTe) | `CTeParser` |
| **ZIP** | - | Arquivos compactados contendo múltiplos XMLs | `adm-zip` |

---

## Arquitetura e Tecnologias

A aplicação adota uma arquitetura desacoplada que permite execução desktop nativa via Electron com um servidor local Express embutido e interface moderna em React:

```
[ Electron 33 (Desktop Runtime) ]
   ├── [ Webview / Renderer ] ── React 19 + Tailwind CSS + Lucide
   └── [ Node Main Process ]  ── IPC Seguro + Servidor Local Express
                                    ├── Parsers Fiscais (fast-xml-parser)
                                    └── Banco Local (SQLite + Drizzle ORM)
```

### Tecnologias Utilizadas

- **Frontend:**
  - React 19
  - TypeScript 5.8
  - Tailwind CSS 4
  - Motion (Framer Motion)
  - Lucide React (Iconografia)
  - Zustand (Gerenciamento de Estado Global)
  - React Resizable Panels
  - React Syntax Highlighter
- **Backend & Processamento:**
  - Node.js & Express 4
  - Fast-XML-Parser (Parser XML de alta performance com preservação de chaves)
  - Adm-Zip (Descompactação de lotes em memória)
  - Multer (Recepção de payloads multipart/form-data)
  - Pino / Pino-Pretty (Logging estruturado)
  - Helmet & Rate Limiting (Segurança de rotas)
  - Zod (Validação de schemas)
- **Persistência de Dados:**
  - SQLite (Banco local offline)
  - Drizzle ORM & Drizzle Kit (Mapeamento relacional e migrações tipadas)
  - LibSQL Client
- **Runtime Desktop:**
  - Electron 33
  - Electron Builder (Geração de instaladores NSIS e executáveis portáteis)
  - ESBuild (Compilação ultra-rápida do processo principal e preload)
- **Qualidade e Testes:**
  - Vitest (Suite de testes unitários dos parsers e regras de negócio)
  - TypeScript Compiler (`tsc --noEmit`)

---

## Estrutura do Projeto

```
workspace-fiscal/
├── electron/                   # Código do processo principal Electron
│   ├── main.ts                 # Ciclo de vida da janela, inicialização do Express e IPC
│   ├── preload.ts              # Script de contexto seguro exposto ao frontend
│   └── tsconfig.json           # Configuração TypeScript para o Electron
├── src/
│   ├── api/                    # Servidor de API REST local (Express)
│   │   ├── routes/             # Rotas de documentos, workspace, importação e depreciação
│   │   ├── services/           # Regras de negócio de importação, cálculo e exportação
│   │   └── app.ts              # Configuração dos middlewares e rotas Express
│   ├── core/                   # Núcleo de domínio e parsers fiscais
│   │   ├── parsers/            # Extratores de NF-e, NFC-e, NFS-e e CT-e
│   │   ├── danfe/              # Formatadores de CNPJ/CPF, datas, CEP, moedas e chaves
│   │   └── fiscal.types.ts     # Tipagem canônica de documentos e impostos
│   ├── db/                     # Camada de banco de dados
│   │   ├── schema.ts           # Definição das tabelas em Drizzle ORM
│   │   └── index.ts            # Inicialização e conexão com o SQLite
│   └── web/                    # Interface gráfica do usuário (React)
│       ├── components/         # Componentes compartilhados (TitleBar, Modais, Splash, Toasts)
│       ├── features/           # Módulos principais
│       │   ├── documents/      # Visualizadores DANFE, DANFSE, DACTE e lista de notas
│       │   ├── depreciation/   # Gestão de bens, competências, cronograma e relatórios
│       │   └── workspace/      # Gerenciamento da árvore de pastas fiscais
│       ├── layouts/            # Layout principal e navegação do sistema
│       ├── stores/             # Stores Zustand (workspace e depreciação)
│       ├── styles/             # Estilos globais e Tailwind CSS
│       └── main.tsx            # Ponto de entrada do React
├── public/                     # Ícones e ativos estáticos da aplicação
├── scripts/                    # Scripts auxiliares para execução e inicialização
├── package.json                # Dependências, scripts e configurações de build
├── vite.config.ts              # Configuração do Vite e plugins
└── tsconfig.json               # Configuração TypeScript do projeto
```

---

## Instalação e Execução

### Pré-requisitos

- **Node.js:** Versão 20.x ou superior recomendada.
- **npm:** Versão 10.x ou superior.

### Instalação das Dependências

Clone o repositório e instale os pacotes necessários:

```bash
git clone https://github.com/sAlly-19/workspace-fiscal.git
cd workspace-fiscal
npm install
```

### Modo de Desenvolvimento

Para iniciar o Vite e a janela do Electron simultaneamente em modo de desenvolvimento com hot-reload:

```bash
npm run dev
```

Caso queira executar apenas a interface Web no navegador:

```bash
npm run dev:web
```

### Build e Empacotamento

Para compilar o frontend e os scripts do Electron:

```bash
npm run build
```

Para gerar os instaladores de produção para Windows (`.exe` instalador NSIS e versão portátil):

```bash
npm run package
```

Os instaladores gerados serão disponibilizados no diretório `release/`.

### Testes Automatizados

Para executar a suite de testes unitários:

```bash
npm test
```

Para executar os testes em modo interativo de monitoramento:

```bash
npm run test:watch
```

### Validação de Tipos

Para verificar a integridade da tipagem TypeScript em todo o projeto:

```bash
npm run lint
```

---

## Segurança e Privacidade

- **Processamento 100% Local:** Os arquivos XML importados, dados cadastrais e cálculos de depreciação são gravados exclusivamente no banco de dados SQLite local da máquina do usuário.
- **Isolamento de Contexto:** A aplicação Electron opera com `contextIsolation: true` e `nodeIntegration: false`, restringindo o acesso do renderer exclusivamente às interfaces seguras declaradas no preload script.
- **Zero Telemetria ou Envio Externo:** Nenhum dado fiscal confidencial é transmitido para servidores de terceiros.

---

## Licença e Autoria

Desenvolvido para **Workspace Fiscal**.  
Projeto mantido por [sAlly-19](https://github.com/sAlly-19).
