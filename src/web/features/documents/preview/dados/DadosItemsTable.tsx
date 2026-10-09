export interface DadosItemsTableProps {
  items?: any[];
  isLight: boolean;
}

export function DadosItemsTable({ items, isLight }: DadosItemsTableProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
      }`}
    >
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
        }`}
      >
        <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          Itens da Nota ({items.length})
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[650px]">
          <thead
            className={`border-b ${
              isLight
                ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]'
                : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]'
            }`}
          >
            <tr>
              <th className="px-3 py-2.5 font-semibold w-16">Cód.</th>
              <th className="px-3 py-2.5 font-semibold">Descrição do Produto / Serviço</th>
              <th className="px-3 py-2.5 font-semibold w-24">NCM</th>
              <th className="px-3 py-2.5 font-semibold w-16">CFOP</th>
              <th className="px-3 py-2.5 font-semibold w-12 text-center">Un</th>
              <th className="px-3 py-2.5 font-semibold text-right w-16">Qtd</th>
              <th className="px-3 py-2.5 font-semibold text-right w-24">V. Unitário</th>
              <th className="px-3 py-2.5 font-semibold text-right w-24">V. Total</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${
              isLight ? 'divide-[#e2e8f0] text-[#0f172a]' : 'divide-[#18181b] text-[#fafafa]'
            }`}
          >
            {items.map((item: any, idx: number) => (
              <tr key={item.id || idx} className={isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/5'}>
                <td className={`px-3 py-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  {item.code || '-'}
                </td>
                <td className="px-3 py-2 font-medium">{item.description}</td>
                <td className={`px-3 py-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  {item.ncm || '-'}
                </td>
                <td className="px-3 py-2 font-mono font-semibold text-blue-500">{item.cfop || '-'}</td>
                <td className="px-3 py-2 text-center uppercase font-mono text-[11px]">{item.unit || 'UN'}</td>
                <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                <td className={`px-3 py-2 text-right ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  R$ {item.unitPrice?.toFixed(2) || '0.00'}
                </td>
                <td
                  className={`px-3 py-2 text-right font-semibold ${
                    isLight ? 'text-[#0f172a]' : 'text-emerald-400'
                  }`}
                >
                  R$ {item.totalPrice?.toFixed(2) || '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

