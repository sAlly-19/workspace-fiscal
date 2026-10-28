# Storyboard & Roteiro Técnico — Apresentação Workspace Fiscal v3.5

**Formato:** Apresentação Interativa Web (1920x1080) + Vídeo MP4 Full HD (60fps)  
**Estilo:** 100% Visual (Cursor Animado, Spotlights com Zoom, Badges de Contexto e Legendas Lower-Thirds)  
**Duração Total:** 03:05 (185 segundos)  
**Identidade Visual:** Dark Mode Oficial (`#09090b`) com acentos em Azul (`#2563eb`), Roxo (`#7c3aed`) e Esmeralda (`#059669`).

---

## Cena 01: Abertura & Visão Geral do Hub Fiscal (00:00 – 00:25 | 25s)

### Visual na Tela
1. **00:00 – 00:08 (Intro Institucional)**:
   - Fundo escuro com orbes luminosos sutis (azul, ciano e violeta) e grid arquitetônico.
   - Entrada animada do ícone oficial do **Workspace Fiscal** com badge `v3.5 • Desktop Hub`.
   - Título de impacto: **"Bem-vindo ao seu Hub Fiscal Inteligente"**.
2. **00:08 – 00:25 (Visão do Hub Principal)**:
   - Revelação da interface principal (`Home`) com indicador superior: `1.428 documentos • 18 pastas • 3 empresas ativas`.
   - Apresentação dos 3 módulos integrados lado a lado:
     - **NF View (DANFE A4)**: Visualize, converta e organize XMLs fiscais em DANFE padrão SEFAZ.
     - **Depreciação (NOVO)**: Controle patrimonial completo com cálculo por dia e exportação CSV contábil.
     - **Buscador NF (SEFAZ & ADN)**: Consulta e distribuição direta na SEFAZ Nacional e ADN NFS-e.
   - O cursor percorre os três cards, ativando o efeito de brilho (hover glow) em cada módulo.

### Legendas (Lower-Thirds)
- **[00:01 – 00:08]** *"Workspace Fiscal: O ecossistema desktop definitivo para gestão de documentos fiscais e controle patrimonial."*
- **[00:08 – 00:16]** *"Três ferramentas especializadas reunidas em uma única interface rápida, moderna e 100% offline-first."*
- **[00:16 – 00:25]** *"Do download automático na SEFAZ à visualização de DANFE e apuração contábil de depreciação sem retrabalho."*

---

## Cena 02: Pastas Monitoradas & Reconciliação Automática (00:25 – 00:55 | 30s)

### Visual na Tela
1. **00:25 – 00:35 (Detecção em Tempo Real)**:
   - Na tela do Hub, surge no canto inferior direito o componente `FolderWatchPromptCard` com indicador pulsante azul.
   - Texto do card: **"PASTA MONITORADA • Indústria Metalúrgica Horizonte Ltda — 14 novos arquivos XML aguardando importação"**.
   - Spotlight destaca o card de notificação e o badge `Monitoramento em Tempo Real Ativo`.
2. **00:35 – 00:45 (Ação de Importação Instantânea)**:
   - O cursor se desloca suavemente até o botão **"Importar Agora"** e realiza o clique.
   - Barra de progresso rápida processa os 14 arquivos XML, validando chaves de acesso e prevenindo duplicidades.
3. **00:45 – 00:55 (Reconciliação Concluída)**:
   - Toast de confirmação verde: *"14 documentos importados e indexados com sucesso na pasta Entradas Outubro/2026"*.
   - O contador global do Hub sobe em tempo real de `1.428` para `1.442 documentos`.

### Legendas (Lower-Thirds)
- **[00:25 – 00:35]** *"Monitoramento Inteligente: O Workspace Fiscal vigia suas pastas locais ou de rede automaticamente em segundo plano."*
- **[00:35 – 00:45]** *"Ao detectar novos XMLs, você importa tudo com um único clique — sem arrastar arquivos manualmente."*
- **[00:45 – 00:55]** *"Reconciliação automática: cada XML é validado, indexado e protegido contra duplicidade instantaneamente."*

---

## Cena 03: Buscador NF — Sincronização SEFAZ & ADN NFS-e (00:55 – 01:30 | 35s)

### Visual na Tela
1. **00:55 – 01:05 (Painel do Buscador & Certificado A1)**:
   - Transição para o módulo **Buscador NF** (identidade em roxo/violeta).
   - Sidebar de empresas à esquerda mostra **Horizonte Metalúrgica S.A. (CNPJ 12.456.789/0001-90)** com badge verde: `Certificado A1 Ativo • 245 dias restantes` e `Último NSU: 000000000048920`.
2. **01:05 – 01:18 (Sincronização SEFAZ & ADN)**:
   - Cursor clica em **"Sincronizar SEFAZ"**.
   - Modal de progresso exibe consulta de distribuição DF-e: lotes de NF-e e CT-e baixados em segundos.
   - Cursor alterna brevemente a chave de modo no topo de `SEFAZ (NF-e / CT-e)` para `ADN / NFS-e`, exibindo também as Notas Fiscais de Serviço tomadas e prestadas.
3. **01:18 – 01:30 (Envio Direto para o NF View)**:
   - Seleção das notas recém-baixadas na tabela.
   - Na barra inferior (`FooterDownloadBar`), o cursor clica em **"Enviar para NF View"**, seleciona a pasta `"Outubro 2026 - Imobilizado & Compras"` e confirma.

### Legendas (Lower-Thirds)
- **[00:55 – 01:05]** *"Buscador NF: Conecte certificados digitais A1 de múltiplas empresas com monitoramento de saúde e validade."*
- **[01:05 – 01:18]** *"Sincronize NF-e e CT-e na SEFAZ Nacional com controle sequencial de NSU, além de NFS-e via portal ADN."*
- **[01:18 – 01:30]** *"Integração nativa: envie lotes inteiros de documentos baixados diretamente para suas pastas no NF View."*

---

## Cena 04: NF View — Gestão Documental, Busca e DANFE A4 (01:30 – 02:05 | 35s)

### Visual na Tela
1. **01:30 – 01:42 (Workspace Tree & Busca Rápida Ctrl+K)**:
   - Abertura do **NF View** com layout tripartido: Árvore de Pastas à esquerda, Lista de Notas ao centro e Preview à direita.
   - O cursor aciona a barra de busca superior (`Ctrl+K`), seleciona o filtro **"Fornecedor"** e digita `"Dell Computadores"`, filtrando instantaneamente a NF-e `Nº 000.458.912` no valor de `R$ 48.500,00`.
2. **01:42 – 01:54 (Visualização DANFE A4 & XML)**:
   - Ao clicar na nota, o painel direito renderiza o **DANFE A4 fiel ao padrão SEFAZ** com código de barras, chave de acesso formatada, quadro de cálculo do imposto (ICMS, IPI, PIS, COFINS) e itens da nota.
   - Cursor alterna rapidamente para a aba **"XML Estruturado"** com syntax highlighting e volta para **"DANFE PDF"**.
3. **01:54 – 02:05 (Ponte para Depreciação Patrimonial)**:
   - Na barra de ferramentas do documento (`PreviewToolbar`), um spotlight destaca o botão **"Depreciar Item"**.
   - O cursor clica em **"Depreciar Item"**, abrindo o modal inteligente de conversão em ativo imobilizado.

### Legendas (Lower-Thirds)
- **[01:30 – 01:42]** *"NF View: Organize milhares de documentos em pastas hierárquicas e localize qualquer nota em milissegundos com Ctrl+K."*
- **[01:42 – 01:54]** *"Geração instantânea de DANFE A4 pronto para impressão ou exportação em lote, com inspeção completa do XML."*
- **[01:54 – 02:05]** *"Identificou a compra de um bem durável? Converta o item da Nota Fiscal em ativo imobilizado com um clique."*

---

## Cena 05: Depreciação Patrimonial — Do XML ao CSV Contábil (02:05 – 02:40 | 35s)

### Visual na Tela
1. **02:05 – 02:17 (Modal Inteligente de Pré-preenchimento)**:
   - O modal `DepreciateDocumentModal` aparece com os dados já extraídos automaticamente do XML:
     - **Empresa Identificada**: *Horizonte Metalúrgica S.A. (Destinatário)*
     - **Item Selecionado**: *Servidor Rack Dell PowerEdge R760 XS (NCM 8471.50.10)*
     - **Valor de Aquisição**: *R$ 48.500,00* | **Plaqueta Sugerida**: `PAT-2026-0084`
   - O cursor seleciona a Categoria **"Equipamentos de Processamento de Dados (20% a.a. • 60 meses)"** e clica em **"Cadastrar Bem"**.
2. **02:17 – 02:30 (Dashboard Patrimonial & Cálculo Pro-Rata)**:
   - Transição para o módulo **Depreciação** (tema esmeralda `#059669`).
   - Cards de indicadores no topo: `Valor Imobilizado: R$ 1.845.200,00`, `Depreciação no Mês: R$ 24.680,45`, `Valor Contábil Líquido: R$ 1.312.890,10`.
   - Tabela de bens destaca o cálculo preciso em centavos e proporcional aos dias do mês de entrada (*pro-rata die*).
3. **02:30 – 02:40 (Exportação CSV Contábil Customizável)**:
   - O cursor clica em **"Exportar CSV Contábil"** para a competência `10/2026`.
   - Modal mostra mapeamento flexível de colunas e validação anti-duplicidade. Clique em **"Gerar Arquivo CSV"** com confirmação de sucesso.

### Legendas (Lower-Thirds)
- **[02:05 – 02:17]** *"Zero digitação manual: o sistema extrai NCM, fornecedor, chave de acesso e valores diretamente do XML da nota."*
- **[02:17 – 02:30]** *"Cálculo contábil rigoroso em centavos, proporcional por dia de aquisição, com suporte a baixas e cálculo retroativo."*
- **[02:30 – 02:40]** *"Exporte o lote mensal em CSV com layout personalizável para o seu sistema contábil e trava contra duplicidade."*

---

## Cena 06: Conclusão & Resumo de Benefícios (02:40 – 03:05 | 25s)

### Visual na Tela
1. **02:40 – 02:53 (Diagrama do Ciclo Completo)**:
   - Visão panorâmica conectando os 3 módulos em fluxo contínuo:
     1. **Buscador NF + Pastas Monitoradas** *(Captura Automática)*
     2. **NF View** *(Conferência, Organização e DANFE)*
     3. **Depreciação Patrimonial** *(Controle de Ativos e Integração Contábil)*
   - Três selos de impacto surgem com animação:
     - **+85% de Produtividade Operacional**
     - **100% Precisão Fiscal & Contábil**
     - **Arquitetura Local Rápida e Segura**
2. **02:53 – 03:05 (Assinatura Final)**:
   - Card central com o ícone do **Workspace Fiscal v3.5**, slogan *"O seu Hub Fiscal completo, inteligente e sem complicações"* e assinatura **Café — Sistemas & Softwares**.

### Legendas (Lower-Thirds)
- **[02:40 – 02:53]** *"Um fluxo fiscal e patrimonial completo: da captura automática na SEFAZ à integração contábil em segundos."*
- **[02:53 – 03:05]** *"Workspace Fiscal — Mais agilidade, controle e segurança para a sua operação fiscal diária."*

