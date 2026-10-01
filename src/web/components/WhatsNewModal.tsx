import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  SlidersHorizontal,
  FileSpreadsheet,
  ZoomIn,
  RefreshCw,
  Check,
  Filter,
  Tag,
  Layers,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { apiFetch } from '../lib/api';

export const CURRENT_APP_VERSION = '2.5.4';
const SEEN_VERSION_KEY = 'workspace_fiscal_seen_version';

interface WhatsNewModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme) || 'dark';
  const isLight = currentTheme === 'light';

  const [internalOpen, setInternalOpen] = useState(false);
  const [activeVersion, setActiveVersion] = useState<'2.5.3' | '2.5.2' | '2.5.1'>('2.5.3');

  useEffect(() => {
    if (open !== undefined) {
      setInternalOpen(open);
      return;
    }

    let isMounted = true;
    const checkSeen = async () => {
      // 1. Tenta verificar primeiro no SQLite (persistente mesmo com porta randômica no Electron)
      try {
        const res = await apiFetch('/api/settings/seen-version');
        if (res.ok) {
          const data = await res.json();
          if (data?.version === CURRENT_APP_VERSION) {
            if (isMounted) setInternalOpen(false);
            return;
          }
        }
      } catch {}

      // 2. Fallback via localStorage
      try {
        const seen = localStorage.getItem(SEEN_VERSION_KEY);
        if (seen === CURRENT_APP_VERSION) {
          if (isMounted) setInternalOpen(false);
          return;
        }
      } catch {}

      if (isMounted) setInternalOpen(true);
    };

    checkSeen();
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleClose = async () => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, CURRENT_APP_VERSION);
    } catch {}
    try {
      await apiFetch('/api/settings/seen-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: CURRENT_APP_VERSION }),
      });
    } catch {}
    setInternalOpen(false);
    if (onClose) onClose();
  };

  if (!internalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh] ${
            isLight
              ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
              : 'bg-[#18181b] border-[#3f3f46] text-white'
          }`}
        >
          {/* Header */}
          <div
            className={`px-6 py-5 border-b flex items-center justify-between ${
              isLight
                ? 'bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border-[#e2e8f0]'
                : 'bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-[#18181b] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base tracking-tight">
                    Novidades da Versão
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-xs">
                    v{CURRENT_APP_VERSION}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Atualizado
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Confira as principais melhorias e novos recursos disponíveis no Workspace Fiscal.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
              }`}
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas de Navegação entre Versões */}
          <div
            className={`px-6 py-2.5 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-[#e2e8f0]' : 'bg-[#141418] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold mr-1 uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Versão:
              </span>
              <button
                onClick={() => setActiveVersion('2.5.3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeVersion === '2.5.3'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isLight
                      ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                <span>v2.5.3 (Atual)</span>
                {activeVersion === '2.5.3' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
              <button
                onClick={() => setActiveVersion('2.5.2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeVersion === '2.5.2'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isLight
                      ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                <span>v2.5.2</span>
              </button>
              <button
                onClick={() => setActiveVersion('2.5.1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeVersion === '2.5.1'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isLight
                      ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                <span>v2.5.1</span>
              </button>
            </div>
            <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
              {activeVersion === '2.5.3' ? 'Lançamento mais recente' : 'Versão anterior'}
            </span>
          </div>

          {/* Cards Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            {activeVersion === '2.5.3' ? (
              <>
                {/* 1. Auto-atualização Integrada */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Atualização Integrada no Próprio Aplicativo</span>
                        <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Novo Recurso</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        O processo de atualização agora acontece de ponta a ponta dentro do próprio Workspace Fiscal, sem necessidade de abrir navegadores externos:
                      </p>
                      <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        <li><b>Download Interno:</b> O pacote é baixado e verificado automaticamente na pasta protegida do sistema.</li>
                        <li><b>Barra de Progresso Real:</b> Acompanhe em tempo real a velocidade de download (MB/s), bytes transferidos e porcentagem calculada diretamente do evento do updater.</li>
                        <li><b>Instalação com um Clique:</b> Ao concluir, basta clicar em "Instalar e reiniciar" para aplicar a atualização e reabrir o app na nova versão.</li>
                        <li><b>Cancelamento e Flexibilidade:</b> Cancele o download a qualquer momento ou clique em "Depois" para manter o arquivo baixado e reiniciar mais tarde.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2. Exportação Direta de CSV */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Exportação Direta de CSV no Painel de Depreciação</span>
                        <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Aprimoramento</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Ações dos botões da tabela de competência separadas com precisão:
                      </p>
                      <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        <li><b>Exportar CSV:</b> Executa a exportação imediatamente com base na sua última configuração salva, sem abrir modais intermediárias.</li>
                        <li><b>Colunas do CSV:</b> Permite personalizar a ordem, visibilidade e nomes das colunas da planilha quando você desejar alterar o layout.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 3. Arquitetura e Modularização */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-purple-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Modularização e Estabilidade da Depreciação</span>
                        <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Desempenho</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Refatoração estrutural completa do módulo de depreciação contábil:
                      </p>
                      <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        <li><b>Módulos Especializados:</b> Separação em submódulos dedicados para cálculos, exportação CSV, gerenciamento de regras e componentes de visualização.</li>
                        <li><b>Preservação Absoluta:</b> 100% das fórmulas, taxas fiscais e integridade de dados preservadas com todos os testes automatizados validados.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : activeVersion === '2.5.2' ? (
              <>
                {/* 1. Filtros e Ordenação na Lista de Bens */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Filter className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Filtros Avançados e Ordenação na Lista de Bens</span>
                        <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Novo Recurso</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Localize e organize o patrimônio da empresa com rapidez e precisão:
                      </p>
                      <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        <li><b>Filtros Rápidos:</b> Filtre simultaneamente por <b>Categoria</b>, <b>Status</b> (Ativos / Baixados) e <b>Ano de Aquisição</b>.</li>
                        <li><b>Busca Instantânea:</b> Pesquise em tempo real por razão do fornecedor, número de nota fiscal ou descrição com botão de limpeza rápida.</li>
                        <li><b>Ordenação Interativa:</b> Clique diretamente nos cabeçalhos das colunas (<i>Fornecedor, NF, Aquisição, Categoria, Valor, Taxa</i>) com setas indicativas de direção.</li>
                        <li><b>Resumo em Tempo Real:</b> Indicadores automáticos com a contagem de bens filtrados e o somatório patrimonial em reais.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2. Depreciação Retroativa com Seleção de Arquivo */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-emerald-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Depreciação Retroativa em Lote com Gravação de Arquivo</span>
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Aprimoramento</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Ao clicar em <b>"Gerar Lançamentos"</b> no modal de depreciação retroativa em lote:
                      </p>
                      <ul className={`list-disc list-inside text-[11px] space-y-1 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        <li><b>Cálculo Exato:</b> O modal exibe com precisão o somatório real da depreciação retroativa para o intervalo selecionado.</li>
                        <li><b>Diálogo Nativo:</b> O sistema solicita diretamente onde você deseja salvar a planilha CSV no seu computador via diálogo de gravação.</li>
                        <li><b>Geração Completa:</b> Todas as competências do intervalo selecionado são recalculadas e exportadas para o Excel, mesmo se já haviam sido processadas anteriormente.</li>
                        <li><b>Compatibilidade Excel:</b> Arquivo exportado com <b>UTF-8 BOM (\uFEFF)</b> e quebras de linha Windows CRLF para evitar qualquer problema de acentuação.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 3. Edição de Categorias */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-purple-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Edição e Gerenciamento de Categorias</span>
                        <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Novo Recurso</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Agora é possível editar categorias já existentes (nome e taxa anual padrão) diretamente na listagem de categorias, atualizando automaticamente os bens vinculados.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 1. Seleção de Colunas do CSV */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Layout Customizável de Colunas no CSV</span>
                        <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Produtividade</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Escolha livremente as colunas (A, B, C, D, E, F, G...) de cada campo contábil, pré-visualize a planilha em tempo real e altere delimitadores.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Zoom e Seleção de Texto nos Documentos */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Visualizador de DANFE: Zoom Interativo e Cópia de Dados</span>
                        <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Visualização</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Controles de zoom (botões e atalhos Ctrl + Scroll / +, -, 0) e seleção de texto liberada para copiar CNPJs e descrições com rapidez.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Verificação de Atualizações */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                      : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="font-bold text-sm flex items-center justify-between">
                        <span>Atualizações Automáticas via GitHub</span>
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Sistema</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Verificação diária e integrada com os releases do GitHub para download e instalação automática das versões mais recentes do aplicativo.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Este aviso é exibido apenas uma vez por atualização.
            </div>
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Entendido, vamos começar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
