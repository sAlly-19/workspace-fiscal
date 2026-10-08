import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Layers,
  Download,
  ShieldCheck,
  Search,
  KeyRound,
  RefreshCw,
  FileSpreadsheet,
  Filter,
  Tag,
  SlidersHorizontal,
  ZoomIn,
  FolderTree,
  Archive,
} from 'lucide-react';

export type AppVersion = '3.5.0' | '3.0.0' | '2.5.3' | '2.5.2' | '2.5.1' | '2.5.0';

export const CURRENT_APP_VERSION = '3.5.0';

export interface VersionBulletPoint {
  boldPrefix?: string;
  text: string;
}

export interface VersionCardData {
  id: string;
  icon: ComponentType<LucideProps>;
  iconClasses: string;
  hoverBorderClasses: string;
  title: string;
  badgeText: string;
  badgeClasses: string;
  description: string;
  bullets?: VersionBulletPoint[];
}

export interface VersionSectionData {
  id: AppVersion;
  label: string;
  isCurrent?: boolean;
  subtitleText: string;
  cards: VersionCardData[];
}

export const WHATS_NEW_VERSIONS: VersionSectionData[] = [
  {
    id: '3.5.0',
    label: 'v3.5.0 (Atual)',
    isCurrent: true,
    subtitleText: 'Lançamento mais recente',
    cards: [
      {
        id: '3.5.0-filtro-nfe-gestao',
        icon: Layers,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Filtro Rápido de NFS-e & Gestão Completa de Empresas',
        badgeText: 'Interface & UX',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description: 'Aprimoramentos de navegação e controles no módulo Buscador NF:',
        bullets: [
          {
            boldPrefix: 'Filtro Rápido por Modelo no Card: ',
            text: 'O card da empresa ativa conta agora com grade de 4 botões (NF-e, CT-e, NFS-e e Todos) com indicador do filtro ativo e alternância imediata para o workspace ADN NFS-e.',
          },
          {
            boldPrefix: 'Edição e Exclusão Segura: ',
            text: 'Botões de ação para editar ou excluir empresas diretamente pela barra lateral ou pelo rodapé do modal de edição, com confirmação e remoção atômica local.',
          },
        ],
      },
      {
        id: '3.5.0-sync-toolbar-download',
        icon: Download,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Sincronização na Toolbar e Download em Lote para NFS-e',
        badgeText: 'Produtividade',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description: 'Operações em lote unificadas e maior ergonomia no fluxo de consulta fiscal:',
        bullets: [
          {
            boldPrefix: 'Sincronização Reposicionada: ',
            text: 'O botão Sincronizar foi integrado diretamente à barra de filtros/NSU do workspace, ao lado dos botões Reset NF-e e Reset CT-e.',
          },
          {
            boldPrefix: 'Download em Lote para NFS-e Nacional: ',
            text: 'Seleção de notas no módulo NFS-e conectada à barra inferior fixa para geração de pacotes compactados em ZIP com os XMLs oficiais.',
          },
          {
            boldPrefix: 'Indicação de Formatos: ',
            text: 'Desabilitação automática e aviso orientador sobre a indisponibilidade de PDF para o padrão NFS-e Nacional.',
          },
        ],
      },
      {
        id: '3.5.0-certificados-diagnostico',
        icon: ShieldCheck,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Filtro de Certificados Válidos e Diagnóstico Amigável',
        badgeText: 'Estabilidade',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description: 'Maior clareza e facilidade na gestão de certificados digitais do Windows:',
        bullets: [
          {
            boldPrefix: 'Certificados Válidos por Padrão: ',
            text: 'O modal de vinculação exibe apenas certificados dentro do prazo de vigência, com alternância para "Mostrar expirados".',
          },
          {
            boldPrefix: 'Mensagens Humanizadas de Erro: ',
            text: 'Substituição de logs técnicos brutos de PowerShell por explicações claras com orientação para ativação em gerenciadores de certificados digitais externos.',
          },
          {
            boldPrefix: 'Detalhes Técnicos Preservados: ',
            text: 'Caixa dedicada de detalhes técnicos com botão "Copiar erro" para suporte e auditoria.',
          },
        ],
      },
    ],
  },
  {
    id: '3.0.0',
    label: 'v3.0.0',
    subtitleText: 'Versão anterior',
    cards: [
      {
        id: '3.0.0-modulo-buscador',
        icon: Search,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Novo Módulo: Buscador NF (SEFAZ e NFS-e Nacional)',
        badgeText: 'Novo Módulo',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description:
          'Integração nativa com os Web Services oficiais da SEFAZ e as APIs REST do Ambiente de Dados Nacional (ADN) e SEFIN:',
        bullets: [
          {
            boldPrefix: 'Distribuição Automatizada: ',
            text: 'Consulta e distribuição incremental de NF-e, CT-e e NFS-e Nacional emitidas para o CNPJ cadastrado.',
          },
          {
            boldPrefix: 'Protocolos Oficiais e Eventos: ',
            text: 'Comunicação direta com ADN/SEFIN baseada em schemas OpenAPI oficiais, com suporte a cancelamentos e cartas de correção.',
          },
          {
            boldPrefix: 'Controle Inteligente de NSU: ',
            text: 'Persistência rigorosa de cursores NSU, prevenção contra bloqueios de consumo indevido (cStat 656) e tratamento nativo de HTTP 404 como ausência de novos documentos.',
          },
          {
            boldPrefix: 'Ambientes Flexíveis: ',
            text: 'Alternância entre Produção e Homologação (SEFAZ) e Produção e Produção Restrita (NFS-e).',
          },
        ],
      },
      {
        id: '3.0.0-certificados-a1',
        icon: KeyRound,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Certificados Digitais ICP-Brasil (A1) e Segurança Local',
        badgeText: 'Segurança',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description: 'Gerenciamento local e criptografado de credenciais e certificados A1 (.pfx / .p12):',
        bullets: [
          {
            boldPrefix: 'Criptografia e Chaves Locais: ',
            text: 'Extração segura em memória com senha protegida, sem expor chaves privadas fora da sua máquina.',
          },
          {
            boldPrefix: 'Validação de Validade: ',
            text: 'Verificação instantânea de vencimento, dados do titular e autoridade certificadora emissora.',
          },
          {
            boldPrefix: 'Multiempresa: ',
            text: 'Suporte a certificados digitais independentes por empresa cadastrada.',
          },
        ],
      },
      {
        id: '3.0.0-exportacao-config',
        icon: Download,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Download em Lote, Exportação ZIP e Central de Configurações',
        badgeText: 'Produtividade',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description: 'Integração harmônica com a experiência visual e a infraestrutura do Workspace Fiscal:',
        bullets: [
          {
            boldPrefix: 'Exportação e Lotes ZIP: ',
            text: 'Download de XMLs autorizados com descompactação gzip automática e geração de lotes em .zip.',
          },
          {
            boldPrefix: 'Central de Configurações Unificada: ',
            text: 'Nova aba dedicada "Buscador NF" nas Configurações para gerenciar pastas de destino e certificados.',
          },
          {
            boldPrefix: 'Layout Unificado em 3 Módulos: ',
            text: 'Tela inicial com NF View, Depreciação e Buscador NF distribuídos horizontalmente com tema Claro/Escuro completo.',
          },
        ],
      },
    ],
  },
  {
    id: '2.5.3',
    label: 'v2.5.3',
    subtitleText: 'Versão anterior',
    cards: [
      {
        id: '2.5.3-auto-update',
        icon: RefreshCw,
        iconClasses: 'bg-blue-500/10 text-blue-500',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Atualização Integrada no Próprio Aplicativo',
        badgeText: 'Novo Recurso',
        badgeClasses: 'text-blue-500',
        description:
          'O processo de atualização agora acontece de ponta a ponta dentro do próprio Workspace Fiscal, sem necessidade de abrir navegadores externos:',
        bullets: [
          {
            boldPrefix: 'Download Interno: ',
            text: 'O pacote é baixado e verificado automaticamente na pasta protegida do sistema.',
          },
          {
            boldPrefix: 'Barra de Progresso Real: ',
            text: 'Acompanhe em tempo real a velocidade de download (MB/s), bytes transferidos e porcentagem calculada diretamente do evento do updater.',
          },
          {
            boldPrefix: 'Instalação com um Clique: ',
            text: 'Ao concluir, basta clicar em "Instalar e reiniciar" para aplicar a atualização e reabrir o app na nova versão.',
          },
          {
            boldPrefix: 'Cancelamento e Flexibilidade: ',
            text: 'Cancele o download a qualquer momento ou clique em "Depois" para manter o arquivo baixado e reiniciar mais tarde.',
          },
        ],
      },
      {
        id: '2.5.3-csv-deprec',
        icon: FileSpreadsheet,
        iconClasses: 'bg-blue-500/10 text-blue-500',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Exportação Direta de CSV no Painel de Depreciação',
        badgeText: 'Aprimoramento',
        badgeClasses: 'text-emerald-500',
        description: 'Ações dos botões da tabela de competência separadas com precisão:',
        bullets: [
          {
            boldPrefix: 'Exportar CSV: ',
            text: 'Executa a exportação imediatamente com base na sua última configuração salva, sem abrir modais intermediárias.',
          },
          {
            boldPrefix: 'Colunas do CSV: ',
            text: 'Permite personalizar a ordem, visibilidade e nomes das colunas da planilha quando você desejar alterar o layout.',
          },
        ],
      },
      {
        id: '2.5.3-modularizacao-deprec',
        icon: Layers,
        iconClasses: 'bg-purple-500/10 text-purple-500',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Modularização e Estabilidade da Depreciação',
        badgeText: 'Desempenho',
        badgeClasses: 'text-purple-500',
        description: 'Refatoração estrutural completa do módulo de depreciação contábil:',
        bullets: [
          {
            boldPrefix: 'Módulos Especializados: ',
            text: 'Separação em submódulos dedicados para cálculos, exportação CSV, gerenciamento de regras e componentes de visualização.',
          },
          {
            boldPrefix: 'Preservação Absoluta: ',
            text: '100% das fórmulas, taxas fiscais e integridade de dados preservadas com todos os testes automatizados validados.',
          },
        ],
      },
    ],
  },
  {
    id: '2.5.2',
    label: 'v2.5.2',
    subtitleText: 'Versão anterior',
    cards: [
      {
        id: '2.5.2-filtros-bens',
        icon: Filter,
        iconClasses: 'bg-blue-500/10 text-blue-500',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Filtros Avançados e Ordenação na Lista de Bens',
        badgeText: 'Novo Recurso',
        badgeClasses: 'text-blue-500',
        description: 'Localize e organize o patrimônio da empresa com rapidez e precisão:',
        bullets: [
          {
            boldPrefix: 'Filtros Rápidos: ',
            text: 'Filtre simultaneamente por Categoria, Status (Ativos / Baixados) e Ano de Aquisição.',
          },
          {
            boldPrefix: 'Busca Instantânea: ',
            text: 'Pesquise em tempo real por razão do fornecedor, número de nota fiscal ou descrição com botão de limpeza rápida.',
          },
          {
            boldPrefix: 'Ordenação Interativa: ',
            text: 'Clique diretamente nos cabeçalhos das colunas (Fornecedor, NF, Aquisição, Categoria, Valor, Taxa) com setas indicativas de direção.',
          },
          {
            boldPrefix: 'Resumo em Tempo Real: ',
            text: 'Indicadores automáticos com a contagem de bens filtrados e o somatório patrimonial em reais.',
          },
        ],
      },
      {
        id: '2.5.2-deprec-retroativa',
        icon: FileSpreadsheet,
        iconClasses: 'bg-emerald-500/10 text-emerald-600',
        hoverBorderClasses: 'hover:border-emerald-300 dark:hover:border-emerald-500/30',
        title: 'Depreciação Retroativa em Lote com Gravação de Arquivo',
        badgeText: 'Aprimoramento',
        badgeClasses: 'text-emerald-600',
        description: 'Ao clicar em "Gerar Lançamentos" no modal de depreciação retroativa em lote:',
        bullets: [
          {
            boldPrefix: 'Cálculo Exato: ',
            text: 'O modal exibe com precisão o somatório real da depreciação retroativa para o intervalo selecionado.',
          },
          {
            boldPrefix: 'Diálogo Nativo: ',
            text: 'O sistema solicita diretamente onde você deseja salvar a planilha CSV no seu computador via diálogo de gravação.',
          },
          {
            boldPrefix: 'Geração Completa: ',
            text: 'Todas as competências do intervalo selecionado são recalculadas e exportadas para o Excel, mesmo se já haviam sido processadas anteriormente.',
          },
          {
            boldPrefix: 'Compatibilidade Excel: ',
            text: 'Arquivo exportado com UTF-8 BOM (\\uFEFF) e quebras de linha Windows CRLF para evitar qualquer problema de acentuação.',
          },
        ],
      },
      {
        id: '2.5.2-edicao-categorias',
        icon: Tag,
        iconClasses: 'bg-purple-500/10 text-purple-500',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Edição e Gerenciamento de Categorias',
        badgeText: 'Novo Recurso',
        badgeClasses: 'text-purple-500',
        description:
          'Agora é possível editar categorias já existentes (nome e taxa anual padrão) diretamente na listagem de categorias, atualizando automaticamente os bens vinculados.',
      },
    ],
  },
  {
    id: '2.5.1',
    label: 'v2.5.1',
    subtitleText: 'Versão anterior',
    cards: [
      {
        id: '2.5.1-colunas-csv',
        icon: SlidersHorizontal,
        iconClasses: 'bg-blue-500/10 text-blue-500',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Layout Customizável de Colunas no CSV',
        badgeText: 'Produtividade',
        badgeClasses: 'text-blue-500',
        description:
          'Escolha livremente as colunas (A, B, C, D, E, F, G...) de cada campo contábil, pré-visualize a planilha em tempo real e altere delimitadores.',
      },
      {
        id: '2.5.1-zoom-danfe',
        icon: ZoomIn,
        iconClasses: 'bg-purple-500/10 text-purple-500',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Visualizador de DANFE: Zoom Interativo e Cópia de Dados',
        badgeText: 'Visualização',
        badgeClasses: 'text-purple-500',
        description:
          'Controles de zoom (botões e atalhos Ctrl + Scroll / +, -, 0) e seleção de texto liberada para copiar CNPJs e descrições com rapidez.',
      },
      {
        id: '2.5.1-atualizacoes-github',
        icon: RefreshCw,
        iconClasses: 'bg-emerald-500/10 text-emerald-600',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Atualizações Automáticas via GitHub',
        badgeText: 'Sistema',
        badgeClasses: 'text-emerald-600',
        description:
          'Verificação diária e integrada com os releases do GitHub para download e instalação automática das versões mais recentes do aplicativo.',
      },
    ],
  },
  {
    id: '2.5.0',
    label: 'v2.5.0 (Base)',
    subtitleText: 'Lançamento do Hub Fiscal',
    cards: [
      {
        id: '2.5.0-modulo-nfview',
        icon: FolderTree,
        iconClasses: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        hoverBorderClasses: 'hover:border-purple-300 dark:hover:border-purple-500/30',
        title: 'Módulo NF View: Gestão e Leitura Oficial de Documentos Fiscais',
        badgeText: 'Lançamento',
        badgeClasses: 'text-purple-600 dark:text-purple-400',
        description:
          'Plataforma desktop completa para visualização e organização de notas fiscais eletrônicas brasileiras:',
        bullets: [
          {
            boldPrefix: 'Modelos Fiscais Suportados: ',
            text: 'NF-e (Mod. 55), NFC-e (Mod. 65), CT-e (Mod. 57) e NFS-e (Padrão Nacional e ABRASF).',
          },
          {
            boldPrefix: 'Impressão Oficial: ',
            text: 'Visualizadores fiéis de DANFE, DANFE NFC-e, DACTE e DANFSE com detalhamento de tributos, retenções e duplicatas.',
          },
          {
            boldPrefix: 'Workspaces em Árvore: ',
            text: 'Criação de pastas estruturadas, movimentação em lote e visualizador técnico de código XML com destaque de sintaxe.',
          },
        ],
      },
      {
        id: '2.5.0-modulo-depreciacao',
        icon: FileSpreadsheet,
        iconClasses: 'bg-emerald-500/10 text-emerald-600',
        hoverBorderClasses: 'hover:border-emerald-300 dark:hover:border-emerald-500/30',
        title: 'Módulo de Depreciação Fiscal & Ativo Imobilizado',
        badgeText: 'Contabilidade',
        badgeClasses: 'text-emerald-600',
        description: 'Controle patrimonial com cálculo rigoroso de quotas mensais de depreciação:',
        bullets: [
          {
            boldPrefix: 'Precisão em Centavos: ',
            text: 'Cálculo linear estritamente em números inteiros, eliminando imprecisões de ponto flutuante.',
          },
          {
            boldPrefix: 'Taxas da Receita Federal: ',
            text: 'Categorias pré-configuradas com taxas anuais oficiais e suporte a ajuste proporcional (pro-rata die).',
          },
          {
            boldPrefix: 'Gestão Patrimonial: ',
            text: 'Acompanhamento de valor contábil líquido, registro de baixas e reativação de bens.',
          },
        ],
      },
      {
        id: '2.5.0-importacao-massa',
        icon: Archive,
        iconClasses: 'bg-blue-500/10 text-blue-500',
        hoverBorderClasses: 'hover:border-blue-300 dark:hover:border-blue-500/30',
        title: 'Importação em Massa e Descompactação Automática',
        badgeText: 'Produtividade',
        badgeClasses: 'text-blue-500',
        description: 'Importação simplificada de arquivos e diretórios inteiros:',
        bullets: [
          {
            boldPrefix: 'Arrastar e Soltar: ',
            text: 'Arraste múltiplos arquivos XML ou pastas diretamente para a janela do sistema.',
          },
          {
            boldPrefix: 'Varredura Recursiva: ',
            text: 'Leitura inteligente de diretórios com centenas de notas em subpastas.',
          },
          {
            boldPrefix: 'Lotes Compactados: ',
            text: 'Descompactação automática de arquivos .zip com processamento imediato dos documentos fiscais.',
          },
        ],
      },
    ],
  },
];
