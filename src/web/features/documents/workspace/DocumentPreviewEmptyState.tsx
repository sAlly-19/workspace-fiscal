import { UploadCloud, Sparkles, FileCheck, Printer } from 'lucide-react';

export interface DocumentPreviewEmptyStateProps {
  currentTheme: string;
}

export function DocumentPreviewEmptyState({ currentTheme }: DocumentPreviewEmptyStateProps) {
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto ${
        currentTheme === 'light' ? 'bg-[#f1f5f9]' : 'bg-[#131317]'
      }`}
    >
      <div
        className={`max-w-md w-full p-8 border-2 border-dashed rounded-2xl shadow-xl transition-all flex flex-col items-center ${
          currentTheme === 'light'
            ? 'border-[#cbd5e1] hover:border-blue-500 bg-white'
            : 'border-[#27272a] hover:border-blue-500/60 bg-[#0d0d10]'
        }`}
      >
        <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3
          className={`text-base font-bold mb-1 ${
            currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
          }`}
        >
          Visualizador e Conversor DANFE (PDF)
        </h3>

        <p
          className={`text-xs leading-relaxed mb-6 ${
            currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#a1a1aa]'
          }`}
        >
          Selecione uma nota fiscal na lista ou arraste arquivos XML para visualizar o DANFE em PDF no padrão A4 oficial com impressão direta.
        </p>

        <div
          className={`grid grid-cols-3 gap-3 w-full pt-4 border-t text-left ${
            currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]'
          }`}
        >
          <div
            className={`p-2.5 rounded-lg border ${
              currentTheme === 'light'
                ? 'bg-[#f8fafc] border-[#e2e8f0]'
                : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
            <div
              className={`text-[11px] font-bold ${
                currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
              }`}
            >
              Workspaces
            </div>
            <div
              className={`text-[10px] ${
                currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'
              }`}
            >
              Pastas livres
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg border ${
              currentTheme === 'light'
                ? 'bg-[#f8fafc] border-[#e2e8f0]'
                : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <FileCheck className="w-4 h-4 text-blue-500 mb-1" />
            <div
              className={`text-[11px] font-bold ${
                currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
              }`}
            >
              DANFE A4
            </div>
            <div
              className={`text-[10px] ${
                currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'
              }`}
            >
              Padrão SEFAZ
            </div>
          </div>
          <div
            className={`p-2.5 rounded-lg border ${
              currentTheme === 'light'
                ? 'bg-[#f8fafc] border-[#e2e8f0]'
                : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <Printer className="w-4 h-4 text-green-500 mb-1" />
            <div
              className={`text-[11px] font-bold ${
                currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
              }`}
            >
              Impressão
            </div>
            <div
              className={`text-[10px] ${
                currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'
              }`}
            >
              PDF Direto
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

