export interface DanfeItemsTableProps {
  items?: any[];
}

export function DanfeItemsTable({ items }: DanfeItemsTableProps) {
  return (
    <>
      <div className="text-[8px] font-black uppercase text-black mb-0.5">DADOS DOS PRODUTOS / SERVIÇOS</div>
      <div className="border border-black mb-1.5">
        <table className="w-full text-[7.5px] text-left border-collapse">
          <thead className="bg-gray-100 border-b border-black font-bold">
            <tr>
              <th className="p-0.5 border-r border-black w-10">CÓDIGO</th>
              <th className="p-0.5 border-r border-black">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
              <th className="p-0.5 border-r border-black w-12 text-center">NCM/SH</th>
              <th className="p-0.5 border-r border-black w-8 text-center">O/CST</th>
              <th className="p-0.5 border-r border-black w-8 text-center">CFOP</th>
              <th className="p-0.5 border-r border-black w-6 text-center">UN</th>
              <th className="p-0.5 border-r border-black w-10 text-right">QUANT</th>
              <th className="p-0.5 border-r border-black w-12 text-right">VALOR UNIT</th>
              <th className="p-0.5 border-r border-black w-12 text-right">VALOR TOTAL</th>
              <th className="p-0.5 border-r border-black w-10 text-right">VALOR DESC</th>
              <th className="p-0.5 border-r border-black w-12 text-right">B.CÁLC ICMS</th>
              <th className="p-0.5 border-r border-black w-10 text-right">VALOR ICMS</th>
              <th className="p-0.5 border-r border-black w-8 text-right">VALOR IPI</th>
              <th className="p-0.5 border-r border-black w-8 text-right">ALÍQ. ICMS</th>
              <th className="p-0.5 w-8 text-right">ALÍQ. IPI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items && items.length > 0 ? (
              items.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="p-0.5 border-r border-black font-mono">{item.code || '-'}</td>
                  <td className="p-0.5 border-r border-black font-medium uppercase">{item.description}</td>
                  <td className="p-0.5 border-r border-black font-mono text-center">{item.ncm || '-'}</td>
                  <td className="p-0.5 border-r border-black font-mono text-center">{item.cst || '0/00'}</td>
                  <td className="p-0.5 border-r border-black font-mono font-bold text-center">{item.cfop || '-'}</td>
                  <td className="p-0.5 border-r border-black text-center uppercase font-mono">{item.unit || 'UN'}</td>
                  <td className="p-0.5 border-r border-black text-right">{(item.quantity || 1).toFixed(4)}</td>
                  <td className="p-0.5 border-r border-black text-right">{(item.unitPrice || 0).toFixed(4)}</td>
                  <td className="p-0.5 border-r border-black text-right font-bold">
                    {(item.totalPrice || 0).toFixed(2)}
                  </td>
                  <td className="p-0.5 border-r border-black text-right">
                    {item.discount ? item.discount.toFixed(2) : '0,00'}
                  </td>
                  <td className="p-0.5 border-r border-black text-right">
                    {item.icmsBase ? item.icmsBase.toFixed(2) : '0,00'}
                  </td>
                  <td className="p-0.5 border-r border-black text-right">
                    {item.icmsValue ? item.icmsValue.toFixed(2) : '0,00'}
                  </td>
                  <td className="p-0.5 border-r border-black text-right">
                    {item.ipiValue ? item.ipiValue.toFixed(2) : '-'}
                  </td>
                  <td className="p-0.5 border-r border-black text-right">
                    {item.icmsAliq ? item.icmsAliq.toFixed(2) : '-'}
                  </td>
                  <td className="p-0.5 text-right">{item.ipiAliq ? item.ipiAliq.toFixed(2) : '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15} className="p-2 text-center text-gray-500 italic">
                  Nenhum item detalhado encontrado no XML.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

