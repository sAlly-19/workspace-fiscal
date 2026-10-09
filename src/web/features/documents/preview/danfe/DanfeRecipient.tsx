export interface DanfeRecipientProps {
  recipientName: string;
  recipientDoc: string;
  issueDateStr: string;
  recipientStreet: string;
  recipientBairro: string;
  recipientCep: string;
  exitDateStr: string;
  recipientCity: string;
  recipientState: string;
  recipientPhone: string;
  recipientIE: string;
  exitTimeStr: string;
}

export function DanfeRecipient({
  recipientName,
  recipientDoc,
  issueDateStr,
  recipientStreet,
  recipientBairro,
  recipientCep,
  exitDateStr,
  recipientCity,
  recipientState,
  recipientPhone,
  recipientIE,
  exitTimeStr,
}: DanfeRecipientProps) {
  return (
    <>
      <div className="text-[8px] font-black uppercase text-black mb-0.5">DESTINATÁRIO / REMETENTE</div>
      <div className="border border-black mb-1.5 text-[8px]">
        <div className="flex border-b border-black">
          <div className="w-[60%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">NOME / RAZÃO SOCIAL</div>
            <div className="font-black uppercase">{recipientName}</div>
          </div>
          <div className="w-[25%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div>
            <div className="font-black font-mono">{recipientDoc}</div>
          </div>
          <div className="w-[15%] p-1">
            <div className="text-[7px] text-gray-600 font-bold uppercase">DATA DA EMISSÃO</div>
            <div className="font-bold">{issueDateStr}</div>
          </div>
        </div>
        <div className="flex border-b border-black">
          <div className="w-[45%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">ENDEREÇO</div>
            <div className="font-bold uppercase">{recipientStreet}</div>
          </div>
          <div className="w-[25%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">BAIRRO / DISTRITO</div>
            <div className="font-bold uppercase">{recipientBairro}</div>
          </div>
          <div className="w-[15%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">CEP</div>
            <div className="font-bold font-mono">{recipientCep}</div>
          </div>
          <div className="w-[15%] p-1">
            <div className="text-[7px] text-gray-600 font-bold uppercase">DATA DA SAÍDA/ENTRADA</div>
            <div className="font-bold">{exitDateStr}</div>
          </div>
        </div>
        <div className="flex">
          <div className="w-[35%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">MUNICÍPIO</div>
            <div className="font-bold uppercase">{recipientCity}</div>
          </div>
          <div className="w-[8%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">UF</div>
            <div className="font-bold uppercase">{recipientState}</div>
          </div>
          <div className="w-[22%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">FONE / FAX</div>
            <div className="font-bold font-mono">{recipientPhone}</div>
          </div>
          <div className="w-[20%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div>
            <div className="font-bold font-mono">{recipientIE}</div>
          </div>
          <div className="w-[15%] p-1">
            <div className="text-[7px] text-gray-600 font-bold uppercase">HORA DA SAÍDA/ENTRADA</div>
            <div className="font-bold">{exitTimeStr}</div>
          </div>
        </div>
      </div>
    </>
  );
}

