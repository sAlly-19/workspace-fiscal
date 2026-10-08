export interface MainFooterProps {
  currentTheme: string;
  selectedFolderName: string;
  documentsCount: number;
  selectedCount: number;
}

export function MainFooter({
  currentTheme,
  selectedFolderName,
  documentsCount,
  selectedCount,
}: MainFooterProps) {
  return (
    <footer
      className={`h-6 border-t flex items-center px-4 justify-between text-[11px] z-20 shrink-0 print:hidden ${
        currentTheme === 'light'
          ? 'bg-white border-[#e2e8f0] text-[#64748b]'
          : 'bg-[#09090b] border-[#27272a] text-[#71717a]'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-blue-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Pasta ativa:{' '}
          <strong className={currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'}>
            {selectedFolderName}
          </strong>
        </span>
        <span>•</span>
        <span>
          {documentsCount} {documentsCount === 1 ? 'documento' : 'documentos'}
        </span>
        {selectedCount > 0 && (
          <>
            <span>•</span>
            <span className="text-blue-500 font-semibold">{selectedCount} selecionados</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>Arraste documentos para pastas ou crie qualquer estrutura hierárquica</span>
      </div>
    </footer>
  );
}

