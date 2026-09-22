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
  ChevronRight
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspace.store';

export const CURRENT_APP_VERSION = '2.5.1';
const SEEN_VERSION_KEY = 'workspace_fiscal_seen_version';

interface WhatsNewModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  const currentTheme = useWorkspaceStore((s) => s.settings.theme) || 'dark';
  const isLight = currentTheme === 'light';

  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (open !== undefined) {
      setInternalOpen(open);
      return;
    }

    try {
      const seen = localStorage.getItem(SEEN_VERSION_KEY);
      if (seen !== CURRENT_APP_VERSION) {
        // Exibe automaticamente uma única vez nesta versão
        setInternalOpen(true);
      }
    } catch {
      setInternalOpen(false);
    }
  }, [open]);

  const handleClose = () => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, CURRENT_APP_VERSION);
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

          {/* Cards Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
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
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-bold text-sm flex items-center justify-between">
                    <span>Módulo Depreciação: Layout Customizável de Colunas no CSV</span>
                    <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Novo Recurso</span>
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                    Agora você pode escolher exatamente quais colunas (letras <b>A, B, C, D, E, F, G...</b>) cada campo gerado ocupará no arquivo CSV exportado.
                  </p>
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] space-y-1 font-mono ${
                      isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#18181b] border-[#3f3f46]'
                    }`}
                  >
                    <div className="font-semibold font-sans text-blue-600 dark:text-blue-400">Layout Padrão Definido:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      <div>• <b>Coluna A</b>: Data</div>
                      <div>• <b>Coluna B</b>: Descrição</div>
                      <div>• <b>Coluna C</b>: <i>(Vazia delimitada)</i></div>
                      <div>• <b>Coluna D</b>: Categoria</div>
                      <div>• <b>Coluna E</b>: <i>(Vazia delimitada)</i></div>
                      <div>• <b>Coluna F</b>: Nº Doc</div>
                      <div>• <b>Coluna G</b>: Valor</div>
                    </div>
                  </div>
                  <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                    Inclui modal com <b>pré-visualização da planilha em tempo real</b>, alteração de separador e persistência automática das suas preferências.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Correção de Acentos no Excel */}
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
                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-sm flex items-center justify-between">
                    <span>Compatibilidade com Excel e Acentuação Perfeita</span>
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Correção</span>
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                    Fim dos caracteres estranhos (como <code className="bg-red-500/10 text-red-500 px-1 py-0.5 rounded">Ã§</code>, <code className="bg-red-500/10 text-red-500 px-1 py-0.5 rounded">Ã£</code>, <code className="bg-red-500/10 text-red-500 px-1 py-0.5 rounded">Âº</code>) ao abrir os arquivos no Microsoft Excel e no Windows.
                  </p>
                  <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                    Os relatórios agora são gerados com assinatura <b>BOM UTF-8 (\uFEFF)</b> e quebra de linha padrão Windows CRLF (\r\n), preservando perfeitamente todas as palavras acentuadas e cedilhas.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Zoom e Seleção de Texto nos Documentos */}
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
                    <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">Produtividade</span>
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                    Adicionado controle de visualização em todos os modelos de notas fiscais (NF-e, NFC-e, CT-e e NFS-e):
                  </p>
                  <ul className={`list-disc list-inside text-[11px] space-y-0.5 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                    <li>Botões de Zoom: <b>Diminuir (−)</b>, <b>Aumentar (+)</b>, <b>100%</b> e <b>Ajustar à Tela</b>.</li>
                    <li>Atalhos de teclado: <kbd className="px-1 py-0.5 bg-black/10 rounded">Ctrl + '+'</kbd>, <kbd className="px-1 py-0.5 bg-black/10 rounded">Ctrl + '-'</kbd>, <kbd className="px-1 py-0.5 bg-black/10 rounded">Ctrl + '0'</kbd> e <kbd className="px-1 py-0.5 bg-black/10 rounded">Ctrl + Scroll</kbd>.</li>
                    <li>Seleção de texto com mouse liberada para copiar CNPJs, descrições e valores diretamente para a área de transferência.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. Verificação Diária de Atualizações */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isLight
                  ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300'
                  : 'bg-[#111114] border-[#27272a] hover:border-blue-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-sm flex items-center justify-between">
                    <span>Auto-Update e Verificação Diária via GitHub</span>
                    <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Sistema</span>
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                    O sistema agora verifica diariamente se uma nova release foi publicada no repositório GitHub, avisando você assim que houver novidades prontas para download.
                  </p>
                </div>
              </div>
            </div>
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

