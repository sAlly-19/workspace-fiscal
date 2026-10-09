export interface DanfeAdditionalInfoProps {
  additionalInfo?: string;
  fiscoInfo?: string;
}

export function DanfeAdditionalInfo({ additionalInfo, fiscoInfo }: DanfeAdditionalInfoProps) {
  return (
    <>
      <div className="text-[8px] font-black uppercase text-black mb-0.5">DADOS ADICIONAIS</div>
      <div className="border border-black flex text-[7.5px] min-h-[50px]">
        <div className="w-[65%] p-1 border-r border-black">
          <div className="font-bold text-[7px] text-gray-600 uppercase mb-0.5">INFORMAÇÕES COMPLEMENTARES</div>
          <div className="whitespace-pre-line text-gray-800 leading-tight">
            {additionalInfo || 'Documento emitido em conformidade com o padrão nacional da SEFAZ.'}
          </div>
        </div>
        <div className="w-[35%] p-1">
          <div className="font-bold text-[7px] text-gray-600 uppercase mb-0.5">RESERVADO AO FISCO</div>
          <div className="whitespace-pre-line text-gray-800 leading-tight">{fiscoInfo || ''}</div>
        </div>
      </div>
    </>
  );
}

