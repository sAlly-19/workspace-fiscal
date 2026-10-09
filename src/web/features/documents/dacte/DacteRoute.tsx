export interface DacteRouteProps {
  cfop: string;
  natOp: string;
  protocolStr: string;
  startCity: string;
  startState: string;
  endCity: string;
  endState: string;
}

export function DacteRoute({
  cfop,
  natOp,
  protocolStr,
  startCity,
  startState,
  endCity,
  endState,
}: DacteRouteProps) {
  return (
    <>
      {/* PROTOCOLO E NATUREZA DA OPERAÇÃO */}
      <div className="border-b border-black flex text-[7.5px]">
        <div className="w-[62%] p-1.5 border-r border-black">
          <div className="text-[6.5px] uppercase font-bold text-gray-600">NATUREZA DA OPERAÇÃO / CFOP</div>
          <div className="font-bold uppercase text-[8px]">
            {cfop} - {natOp}
          </div>
        </div>
        <div className="w-[38%] p-1.5">
          <div className="text-[6.5px] uppercase font-bold text-gray-600">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
          <div className="font-mono font-bold text-[8px]">{protocolStr}</div>
        </div>
      </div>

      {/* INÍCIO E FIM DA PRESTAÇÃO */}
      <div className="border-b border-black flex text-[7.5px]">
        <div className="w-[50%] p-1.5 border-r border-black">
          <div className="text-[6.5px] uppercase font-bold text-gray-600">INÍCIO DA PRESTAÇÃO (ORIGEM)</div>
          <div className="font-bold uppercase text-[8.5px]">
            {startCity} / {startState}
          </div>
        </div>
        <div className="w-[50%] p-1.5">
          <div className="text-[6.5px] uppercase font-bold text-gray-600">TÉRMINO DA PRESTAÇÃO (DESTINO)</div>
          <div className="font-bold uppercase text-[8.5px]">
            {endCity} / {endState}
          </div>
        </div>
      </div>
    </>
  );
}

