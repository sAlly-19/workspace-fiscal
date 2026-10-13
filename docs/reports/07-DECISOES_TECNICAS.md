# Relatório 07: Registro de Decisões Técnicas de Arquitetura (ADRs)

**Projeto:** `workspace-fiscal`  
**Referência:** Auditoria Arquitetural v3.5.1  
**Padrão:** Architecture Decision Record (ADR)

---

## ADR-01: Consolidação em um Único Banco SQLite com Drizzle ORM

### Contexto
Atualmente, o sistema opera com duas bases de dados SQLite separadas: `workspace-fiscal.sqlite` gerenciado pelo Drizzle ORM no servidor Express (`src/db/`) e `fiscal_storage.db` gerenciado por `sql.js` no processo Electron do Buscador (`src/core/buscador/database/`). Isso duplica o armazenamento de empresas, fragmenta logs e complica o backup.

### Decisão
Consolidar 100% das tabelas em um único arquivo de banco de dados (`workspace-fiscal.sqlite`) sob o gerenciador oficial **Drizzle ORM**.
- O banco será configurado no boot com `PRAGMA journal_mode = WAL` e `PRAGMA busy_timeout = 5000`.
- Um script de migração na inicialização importará os dados históricos de `fiscal_storage.db` se ele existir, preservando histórico e NSUs.
- Após migração validada, o banco secundário será arquivado com extensão `.legacy.bak`.

### Consequências
- **Positivas:** Ponto único de integridade e backup atômico com `VACUUM INTO`; consultas relacionais unificadas entre documentos baixados e bens patrimoniais.
- **Negativas:** Exige testes minuciosos de migração no primeiro boot de usuários existentes.

---

## ADR-02: Transição de Servidor HTTP Local para Electron IPC Nativo

### Contexto
A comunicação entre o frontend React e os módulos de Documentos/Depreciação depende de requisições HTTP REST contra um servidor Express interno escutando em `http://127.0.0.1:3000`. O Buscador, por sua vez, usa Electron IPC. A camada HTTP local gera risco de colisão de portas TCP, exige overlay de tratamento de queda (`ServerUnreachableOverlay`) e impõe sobrecarga de serialização de rede.

### Decisão
Migrar progressivamente todos os serviços para **Electron IPC Handlers** (`ipcMain.handle` / `ipcRenderer.invoke`).
- O frontend utilizará um cliente de dados unificado (`UnifiedApiClient`) que detecta a presença de `window.fiscalApi`: se presente, utiliza IPC nativo; se ausente, faz fallback para HTTP REST (permitindo desenvolvimento via navegador com Vite).
- Em builds finais de produção do Electron, o servidor Express pode ser desativado após conclusão da migração.

### Consequências
- **Positivas:** Redução de latência de 2x a 4x; imunidade a conflitos de portas locais e firewalls; menor consumo de memória.
- **Negativas:** Necessidade de manter a camada de adapters durante a transição.

---

## ADR-03: Motor Unificado de Parsing e Renderização Fiscal

### Contexto
Tanto o Express quanto o Buscador contêm parsers XML próprios para NF-e, CT-e e NFS-e. Adicionalmente, os layouts visuais de DANFE e DACTE estão duplicados entre geradores de HTML string (para impressão) e componentes React (para visualização em tela).

### Decisão
1. Padronizar `src/core/parsers/` como o único motor de parsing do sistema, orientando todos os módulos para as interfaces de `src/core/fiscal.types.ts`.
2. Adotar os componentes React do frontend como base única de layout visual, utilizando `renderToStaticMarkup` do React para exportação de HTML estático e impressão em lote no Electron.

### Consequências
- **Positivas:** Regras fiscais e correções de layout mantidas em um único ponto; garantia de paridade de 100% entre tela e impressão física.
- **Negativas:** Ajuste nos testes existentes para convergir para os tipos canônicos unificados.

---

## ADR-04: Transição da Ponte PowerShell para Stdin e Provedor Nativo .pfx

### Contexto
O transporte mTLS para comunicação com SEFAZ e NFS-e ADN no Windows utiliza o script PowerShell `windows-bridge.ps1`. O código atual grava envelopes XML e cabeçalhos JSON em arquivos no diretório temporário `%TEMP%` antes de chamar o processo PowerShell.

### Decisão
1. **Curto Prazo (Fase 1):** Alterar o provider para passar payloads exclusivamente via stream de entrada padrão (`stdin`) em memória, eliminando a escrita e deleção de arquivos temporários em disco.
2. **Médio Prazo (Fases 5 e 6):** Implementar suporte nativo a certificados A1 no formato `.pfx` utilizando o módulo `tls` e `crypto` do Node.js, sem necessidade de chamar subprocessos para usuários com arquivos `.pfx`.

### Consequências
- **Positivas:** Elimina resíduos de dados em `%TEMP%`; evita bloqueios de antivírus corporativos; melhora sensível de performance na consulta de lotes de documentos.
- **Negativas:** Requer sincronismo correto de streams assíncronos no processo Node.

---

## ADR-05: Emissão Automática de Manifestação do Destinatário (Ciência da Operação)

### Contexto
Ao consultar a SEFAZ via `DistribuicaoDFe`, documentos emitidos para o CNPJ do cliente são retornados com frequência na forma de resumo (`resNFe`). Como o sistema não emitia automaticamente o evento de Ciência da Operação (`tpEvento=210210`), os documentos ficavam estagnados no status "Ciência da Operação" e o XML completo com validade jurídica (`procNFe`) nunca era liberado pelo WebService governamental.

### Decisão
Implementar no `DistributionEngine` do Buscador o envio automático do evento de Ciência da Operação para todas as chaves onde apenas o resumo foi capturado. Na iteração seguinte de busca por NSU, o documento completo (`procNFe`) será recebido e atualizado na base.

### Consequências
- **Positivas:** Resolve definitivamente o problema de notas que não baixam o XML completo automaticamente; melhora drástica na usabilidade do módulo fiscal.
- **Negativas:** Exige consumo de cota de requisições de eventos na SEFAZ, demandando controle rigoroso de rate-limiting para evitar Rejeição 656.

