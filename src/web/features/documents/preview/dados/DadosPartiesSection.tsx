export interface DadosPartiesSectionProps {
  doc: any;
  isLight: boolean;
}

export function DadosPartiesSection({ doc, isLight }: DadosPartiesSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}
      >
        <div className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
          Emitente
        </div>
        <div className={`text-sm font-bold mb-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          {doc.issuerName || 'Não Informado'}
        </div>
        <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
          CNPJ/CPF:{' '}
          <span className={`font-mono font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.issuerDocument || 'Não Informado'}
          </span>
        </div>
      </div>
      <div
        className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}
      >
        <div className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
          Destinatário / Remetente
        </div>
        <div className={`text-sm font-bold mb-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          {doc.recipientName || 'Não Informado / Consumidor Final'}
        </div>
        <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
          CNPJ/CPF:{' '}
          <span className={`font-mono font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.recipientDocument || 'Não Informado'}
          </span>
        </div>
      </div>
    </div>
  );
}

