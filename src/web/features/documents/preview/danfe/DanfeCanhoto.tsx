import { formatMoney } from '../../../../../core/danfe';

export interface DanfeCanhotoProps {
  issuerName: string;
  issueDateStr: string;
  valorTotalNota: number;
  recipientName: string;
  recipientStreet: string;
  recipientBairro: string;
  recipientCity: string;
  recipientState: string;
  docNumber?: string;
  docSeries?: string;
}

export function DanfeCanhoto({
  issuerName,
  issueDateStr,
  valorTotalNota,
  recipientName,
  recipientStreet,
  recipientBairro,
  recipientCity,
  recipientState,
  docNumber,
  docSeries,
}: DanfeCanhotoProps) {
  return (
    <div className="border border-black mb-1.5">
      <div className="flex border-b border-black text-[8px]">
        <div className="flex-1 p-1 border-r border-black uppercase leading-tight">
          RECEBEMOS DE <span className="font-bold">{issuerName}</span> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA
          FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: <span className="font-bold">{issueDateStr}</span> VALOR TOTAL:{' '}
          <span className="font-bold">{formatMoney(valorTotalNota)}</span> DESTINATÁRIO:{' '}
          <span className="font-bold">{recipientName}</span> - {recipientStreet} {recipientBairro} {recipientCity}-
          {recipientState}
        </div>
        <div className="w-28 p-1 text-center font-bold">
          <div className="text-[10px]">NF-e</div>
          <div className="text-[9px]">Nº. {docNumber || '000.000'}</div>
          <div className="text-[8px]">Série {docSeries || '001'}</div>
        </div>
      </div>
      <div className="flex text-[7.5px] uppercase">
        <div className="w-32 p-1 border-r border-black font-semibold text-gray-700">DATA DE RECEBIMENTO</div>
        <div className="flex-1 p-1 font-semibold text-gray-700">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
      </div>
    </div>
  );
}

