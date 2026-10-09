import { formatUnit } from './dacte.helpers';

export interface DacteCargoAndFreightProps {
  proPred: string;
  outCat: string;
  vCarga: number;
  quantities: any[];
  components: any[];
  totalPrestacao: number;
  valorReceber: number;
}

export function DacteCargoAndFreight({
  proPred,
  outCat,
  vCarga,
  quantities,
  components,
  totalPrestacao,
  valorReceber,
}: DacteCargoAndFreightProps) {
  return (
    <>
      {/* INFORMAÇÕES DA CARGA */}
      <div className="border-b border-black">
        <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
          INFORMAÇÕES DA CARGA
        </div>
        <div className="p-1.5 grid grid-cols-4 gap-2 text-[7.5px] border-b border-gray-200">
          <div className="col-span-2">
            <b>Produto Predominante:</b> <span className="font-bold uppercase">{proPred}</span>
          </div>
          <div>
            <b>Outras Características:</b> {outCat}
          </div>
          <div>
            <b>Valor Total da Carga:</b> <span className="font-bold">R$ {vCarga.toFixed(2)}</span>
          </div>
        </div>
        {/* Quantidades e Medidas */}
        <div className="p-1.5 flex flex-wrap gap-4 text-[7.5px] bg-gray-50/50">
          {quantities.length > 0 ? (
            quantities.map((q: any, idx: number) => (
              <div key={idx} className="flex gap-1 items-baseline">
                <span className="text-gray-600 font-bold uppercase">{q.measureType}:</span>
                <span className="font-mono font-bold">
                  {q.quantity.toFixed(q.measureType.includes('VOLUME') ? 0 : 3)} {formatUnit(q.unit)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-gray-500 italic">Pesos e volumes não discriminados no XML</div>
          )}
        </div>
      </div>

      {/* COMPONENTES DO VALOR DA PRESTAÇÃO E VALOR DO SERVIÇO */}
      <div className="border-b border-black">
        <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
          COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO
        </div>
        <div className="p-1.5 flex flex-wrap gap-x-6 gap-y-1 text-[7.5px] border-b border-gray-200">
          {components.map((comp: any, idx: number) => (
            <div key={idx} className="flex gap-2 items-baseline">
              <span className="text-gray-600 font-bold uppercase">{comp.name}:</span>
              <span className="font-mono font-bold">R$ {comp.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="p-1.5 bg-gray-50 flex justify-between items-center text-[8px]">
          <div>
            <span className="text-gray-600 font-bold uppercase mr-2">VALOR TOTAL DO SERVIÇO:</span>
            <span className="font-mono font-bold text-[10px]">R$ {totalPrestacao.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-700 font-bold uppercase mr-2">VALOR A RECEBER:</span>
            <span className="font-mono font-black text-[12px]">R$ {valorReceber.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

