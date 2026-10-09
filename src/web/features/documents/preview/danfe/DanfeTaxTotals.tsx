export interface DanfeTaxTotalsProps {
  baseIcms: number;
  valorIcms: number;
  baseIcmsSt: number;
  valorIcmsSt: number;
  impImportacao: number;
  icmsUfRemet: number;
  fcpUfDest: number;
  pis: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  outrasDespesas: number;
  valorIpi: number;
  icmsUfDest: number;
  totalTrib: number;
  cofins: number;
  valorTotalNota: number;
}

export function DanfeTaxTotals({
  baseIcms,
  valorIcms,
  baseIcmsSt,
  valorIcmsSt,
  impImportacao,
  icmsUfRemet,
  fcpUfDest,
  pis,
  valorProdutos,
  valorFrete,
  valorSeguro,
  valorDesconto,
  outrasDespesas,
  valorIpi,
  icmsUfDest,
  totalTrib,
  cofins,
  valorTotalNota,
}: DanfeTaxTotalsProps) {
  return (
    <>
      <div className="text-[8px] font-black uppercase text-black mb-0.5">CÁLCULO DO IMPOSTO</div>
      <div className="border border-black mb-1.5 text-[8px]">
        <div className="flex border-b border-black">
          <div className="w-[12%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">BASE DE CÁLC. DO ICMS</div>
            <div className="font-bold text-right">{baseIcms.toFixed(2)}</div>
          </div>
          <div className="w-[10%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO ICMS</div>
            <div className="font-bold text-right">{valorIcms.toFixed(2)}</div>
          </div>
          <div className="w-[13%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">BASE DE CÁLC. ICMS S.T.</div>
            <div className="font-bold text-right">{baseIcmsSt.toFixed(2)}</div>
          </div>
          <div className="w-[12%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO ICMS SUBST.</div>
            <div className="font-bold text-right">{valorIcmsSt.toFixed(2)}</div>
          </div>
          <div className="w-[11%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. IMP. IMPORTAÇÃO</div>
            <div className="font-bold text-right">{impImportacao.toFixed(2)}</div>
          </div>
          <div className="w-[11%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. ICMS UF REMET.</div>
            <div className="font-bold text-right">{icmsUfRemet.toFixed(2)}</div>
          </div>
          <div className="w-[10%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. FCP UF DEST.</div>
            <div className="font-bold text-right">{fcpUfDest.toFixed(2)}</div>
          </div>
          <div className="w-[9%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO PIS</div>
            <div className="font-bold text-right">{pis.toFixed(2)}</div>
          </div>
          <div className="w-[12%] p-0.5 bg-gray-50">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. TOTAL PRODUTOS</div>
            <div className="font-black text-right">{valorProdutos.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex">
          <div className="w-[12%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO FRETE</div>
            <div className="font-bold text-right">{valorFrete.toFixed(2)}</div>
          </div>
          <div className="w-[10%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO SEGURO</div>
            <div className="font-bold text-right">{valorSeguro.toFixed(2)}</div>
          </div>
          <div className="w-[13%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">DESCONTO</div>
            <div className="font-bold text-right">{valorDesconto.toFixed(2)}</div>
          </div>
          <div className="w-[12%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">OUTRAS DESPESAS</div>
            <div className="font-bold text-right">{outrasDespesas.toFixed(2)}</div>
          </div>
          <div className="w-[11%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR TOTAL IPI</div>
            <div className="font-bold text-right">{valorIpi.toFixed(2)}</div>
          </div>
          <div className="w-[11%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. ICMS UF DEST.</div>
            <div className="font-bold text-right">{icmsUfDest.toFixed(2)}</div>
          </div>
          <div className="w-[10%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. TOT. TRIB.</div>
            <div className="font-bold text-right">{totalTrib.toFixed(2)}</div>
          </div>
          <div className="w-[9%] p-0.5 border-r border-black">
            <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DA COFINS</div>
            <div className="font-bold text-right">{cofins.toFixed(2)}</div>
          </div>
          <div className="w-[12%] p-0.5 bg-gray-100">
            <div className="text-[6.5px] text-black font-black uppercase">V. TOTAL DA NOTA</div>
            <div className="font-black text-right text-[10px]">{valorTotalNota.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

