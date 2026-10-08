import {
  FileText,
  Table,
  Code2,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Download,
  Printer,
} from 'lucide-react';
import { motion } from 'motion/react';

export type PreviewMode = 'visualizar' | 'dados' | 'xml';

interface TabItem {
  id: PreviewMode;
  label: string;
  shortLabel?: string;
  icon: typeof FileText;
}

const TABS: TabItem[] = [
  { id: 'visualizar', label: 'DANFE (PDF)', shortLabel: 'DANFE', icon: FileText },
  { id: 'dados', label: 'Dados da Nota', shortLabel: 'Dados', icon: Table },
  { id: 'xml', label: 'XML Original', shortLabel: 'XML', icon: Code2 },
];

export interface PreviewToolbarProps {
  currentTheme: string;
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
  onBackToList?: () => void;
  // Zoom
  zoomLevel: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleFitWidth: () => void;
  // Ações
  accessKey?: string;
  copiedKey: boolean;
  handleCopyKey: () => void;
  copiedXml: boolean;
  handleCopyXml: () => void;
  handleDownloadXml: () => void;
  handlePrint: () => void;
}

export function PreviewToolbar({
  currentTheme,
  mode,
  setMode,
  onBackToList,
  zoomLevel,
  handleZoomIn,
  handleZoomOut,
  handleZoomReset,
  handleFitWidth,
  accessKey,
  copiedKey,
  handleCopyKey,
  copiedXml,
  handleCopyXml,
  handleDownloadXml,
  handlePrint,
}: PreviewToolbarProps) {
  return (
    <div
      className={`min-h-[48px] py-1.5 border-b flex flex-wrap items-center px-3 md:px-4 justify-between shrink-0 print:hidden gap-2 ${
        currentTheme === 'light' ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mobile Back Button */}
        {onBackToList && (
          <button
            onClick={onBackToList}
            className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] border-[#cbd5e1]'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title="Voltar à lista de documentos"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Lista</span>
          </button>
        )}

        {/* Mode Switcher with Animated Tab Indicator */}
        <div
          className={`flex items-center gap-1 p-0.5 rounded-xl border relative ${
            currentTheme === 'light' ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`relative flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer select-none z-10 ${
                  isActive
                    ? 'text-white'
                    : currentTheme === 'light'
                    ? 'text-[#475569] hover:text-[#0f172a] hover:bg-white/60'
                    : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="previewActiveTabPill"
                    className={`absolute inset-0 rounded-lg shadow-md ${
                      currentTheme === 'light' ? 'bg-blue-600' : 'bg-blue-600 shadow-blue-500/20'
                    }`}
                    transition={{
                      type: 'spring',
                      stiffness: 450,
                      damping: 32,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Zoom Controls (Active in Visualizar mode) */}
        {mode === 'visualizar' && (
          <div
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded-xl border select-none ${
              currentTheme === 'light'
                ? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#334155]'
                : 'bg-[#09090b] border-[#27272a] text-[#fafafa]'
            }`}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              title="Diminuir Zoom (Ctrl -)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                currentTheme === 'light'
                  ? 'hover:bg-white text-[#475569]'
                  : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white'
              }`}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              title="Resetar Zoom para 100% (Ctrl 0)"
              className={`px-1.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer min-w-[48px] text-center ${
                currentTheme === 'light' ? 'hover:bg-white text-blue-600' : 'hover:bg-[#18181b] text-blue-400'
              }`}
            >
              {zoomLevel}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 250}
              title="Aumentar Zoom (Ctrl +)"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                currentTheme === 'light'
                  ? 'hover:bg-white text-[#475569]'
                  : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div
              className={`w-[1px] h-3.5 mx-0.5 ${
                currentTheme === 'light' ? 'bg-[#cbd5e1]' : 'bg-[#27272a]'
              }`}
            />
            <button
              onClick={handleFitWidth}
              title="Ajustar à largura da janela"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                currentTheme === 'light'
                  ? 'hover:bg-white text-[#475569]'
                  : 'hover:bg-[#18181b] text-[#a1a1aa] hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
        {accessKey && (
          <button
            onClick={handleCopyKey}
            title="Copiar chave de acesso de 44 dígitos"
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border rounded-md text-xs transition-all cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                : 'bg-[#18181b] border-[#27272a] text-[#fafafa] hover:bg-[#27272a]'
            }`}
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedKey ? 'Chave copiada!' : 'Copiar Chave'}</span>
          </button>
        )}

        {mode === 'xml' && (
          <button
            onClick={handleCopyXml}
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border rounded-md text-xs transition-all cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                : 'bg-[#18181b] border-[#27272a] text-[#fafafa] hover:bg-[#27272a]'
            }`}
          >
            {copiedXml ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedXml ? 'XML copiado!' : 'Copiar XML'}</span>
          </button>
        )}

        <button
          onClick={handleDownloadXml}
          className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border rounded-md text-xs transition-all cursor-pointer ${
            currentTheme === 'light'
              ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
              : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
          }`}
          title="Baixar arquivo XML"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Baixar XML</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium rounded-md text-xs shadow-md transition-all cursor-pointer"
          title="Imprimir ou Salvar em PDF (A4)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / PDF</span>
        </button>
      </div>
    </div>
  );
}

