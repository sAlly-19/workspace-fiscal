export interface DadosHeaderSectionProps {
  doc: any;
  isLight: boolean;
}

export function DadosHeaderSection({ doc, isLight }: DadosHeaderSectionProps) {
  return (
    <>
      {/* Top Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Tipo de Documento
          </div>
          <div className="text-sm font-bold text-blue-400">{doc.type || 'NF-e'}</div>
        </div>
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Número / Série
          </div>
          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            Nº {doc.number || 'S/N'} • Série {doc.series || '0'}
          </div>
        </div>
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Data de Emissão
          </div>
          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-green-50 border-green-200' : 'border-green-500/30 bg-green-500/5'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-green-700' : 'text-emerald-300'}`}>
            Valor Total da Nota
          </div>
          <div className={`text-base font-black ${isLight ? 'text-green-700' : 'text-emerald-300'}`}>
            {doc.totalAmount ? `R$ ${doc.totalAmount.toFixed(2)}` : 'R$ 0,00'}
          </div>
        </div>
      </div>

      {/* Access Key */}
      {doc.accessKey && (
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Chave de Acesso (44 dígitos)
          </div>
          <div className={`font-mono text-xs font-semibold break-all ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
            {doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey}
          </div>
        </div>
      )}
    </>
  );
}

