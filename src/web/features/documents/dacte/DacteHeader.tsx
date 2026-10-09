export interface DacteHeaderProps {
  issuerName: string;
  issuerStreet: string;
  issuerBairro: string;
  issuerCep: string;
  issuerCity: string;
  issuerState: string;
  issuerPhone: string;
  issuerDoc: string;
  issuerIE: string;
  series: string;
  number: string;
  formattedKey: string;
}

export function DacteHeader({
  issuerName,
  issuerStreet,
  issuerBairro,
  issuerCep,
  issuerCity,
  issuerState,
  issuerPhone,
  issuerDoc,
  issuerIE,
  series,
  number,
  formattedKey,
}: DacteHeaderProps) {
  return (
    <div className="border-b border-black flex">
      {/* Identificação do Emitente */}
      <div className="w-[42%] p-2 border-r border-black flex flex-col justify-center">
        <div className="text-[11px] font-black uppercase tracking-tight leading-tight">{issuerName}</div>
        <div className="text-[7.5px] text-gray-700 mt-1 leading-snug">
          <div>
            {issuerStreet} - {issuerBairro}
          </div>
          <div>
            CEP: {issuerCep} - {issuerCity} / {issuerState}
          </div>
          {issuerPhone !== '-' && <div>Fone: {issuerPhone}</div>}
          <div className="font-mono mt-0.5">
            <b>CNPJ:</b> {issuerDoc} | <b>IE:</b> {issuerIE}
          </div>
        </div>
      </div>

      {/* DACTE Box */}
      <div className="w-[20%] p-1.5 border-r border-black flex flex-col justify-between text-center bg-gray-50/50">
        <div>
          <div className="text-[14px] font-black tracking-wider">DACTE</div>
          <div className="text-[6.5px] uppercase text-gray-600 font-bold leading-tight">
            Documento Auxiliar do Conhecimento de Transporte Eletrônico
          </div>
        </div>
        <div className="border-t border-b border-black py-1 my-0.5">
          <div className="text-[7px] font-bold">MODAL RODOVIÁRIO</div>
        </div>
        <div className="grid grid-cols-2 text-[7.5px] text-left">
          <div>
            <b>MOD:</b> 57
          </div>
          <div>
            <b>SÉRIE:</b> {series}
          </div>
          <div className="col-span-2 text-[9px] font-mono font-bold mt-0.5">
            <b>Nº:</b> {number}
          </div>
          <div className="col-span-2 text-[6.5px] text-gray-600 mt-0.5">FL: 1/1</div>
        </div>
      </div>

      {/* Código de Barras e Chave */}
      <div className="w-[38%] p-2 flex flex-col justify-between">
        {/* Barcode visual */}
        <div className="h-9 w-full bg-black flex items-center justify-center p-0.5 select-none danfe-no-select">
          <div className="w-full h-full bg-white flex items-center justify-center font-mono text-[7px] tracking-widest font-bold">
            ||| | |||| || ||| ||||| ||| || |||| ||| |||| ||||
          </div>
        </div>
        <div className="mt-1">
          <div className="text-[6.5px] uppercase font-bold text-gray-600">CHAVE DE ACESSO</div>
          <div className="font-mono text-[8.5px] font-bold tracking-tight">{formattedKey}</div>
        </div>
        <div className="mt-1 pt-1 border-t border-gray-200 text-[6.5px] text-gray-600">
          Consulta de autenticidade no portal nacional do CT-e:{' '}
          <span className="font-bold text-black">www.cte.fazenda.gov.br/portal</span>
        </div>
      </div>
    </div>
  );
}

