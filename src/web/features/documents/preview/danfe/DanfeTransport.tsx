import { formatCnpjCpf } from '../../../../../core/danfe';

export interface DanfeTransportProps {
  transport?: any;
  transpMod: string;
}

export function DanfeTransport({ transport = {}, transpMod }: DanfeTransportProps) {
  return (
    <>
      <div className="text-[8px] font-black uppercase text-black mb-0.5">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
      <div className="border border-black mb-1.5 text-[8px]">
        <div className="flex border-b border-black">
          <div className="w-[40%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">NOME / RAZÃO SOCIAL</div>
            <div className="font-bold uppercase">{transport.name || '-'}</div>
          </div>
          <div className="w-[18%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">FRETE</div>
            <div className="font-bold">{transpMod}</div>
          </div>
          <div className="w-[10%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">CÓDIGO ANTT</div>
            <div className="font-bold font-mono">{transport.anttCode || '-'}</div>
          </div>
          <div className="w-[10%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">PLACA DO VEÍCULO</div>
            <div className="font-bold font-mono">{transport.vehiclePlate || '-'}</div>
          </div>
          <div className="w-[4%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">UF</div>
            <div className="font-bold uppercase">{transport.vehicleUf || '-'}</div>
          </div>
          <div className="w-[18%] p-1">
            <div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div>
            <div className="font-bold font-mono">{formatCnpjCpf(transport.document)}</div>
          </div>
        </div>
        <div className="flex border-b border-black">
          <div className="w-[45%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">ENDEREÇO</div>
            <div className="font-bold uppercase">{transport.address || '-'}</div>
          </div>
          <div className="w-[30%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">MUNICÍPIO</div>
            <div className="font-bold uppercase">{transport.city || '-'}</div>
          </div>
          <div className="w-[5%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">UF</div>
            <div className="font-bold uppercase">{transport.state || '-'}</div>
          </div>
          <div className="w-[20%] p-1">
            <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div>
            <div className="font-bold font-mono">{transport.ie || '-'}</div>
          </div>
        </div>
        <div className="flex">
          <div className="w-[12%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">QUANTIDADE</div>
            <div className="font-bold text-center">{transport.volumeQuantity ?? '-'}</div>
          </div>
          <div className="w-[15%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">ESPÉCIE</div>
            <div className="font-bold uppercase">{transport.volumeSpecies || '-'}</div>
          </div>
          <div className="w-[15%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">MARCA</div>
            <div className="font-bold uppercase">{transport.volumeBrand || '-'}</div>
          </div>
          <div className="w-[18%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">NUMERAÇÃO</div>
            <div className="font-bold">{transport.volumeNumber || '-'}</div>
          </div>
          <div className="w-[20%] p-1 border-r border-black">
            <div className="text-[7px] text-gray-600 font-bold uppercase">PESO BRUTO</div>
            <div className="font-bold text-right">
              {transport.grossWeight !== undefined ? transport.grossWeight.toFixed(3) : '-'}
            </div>
          </div>
          <div className="w-[20%] p-1">
            <div className="text-[7px] text-gray-600 font-bold uppercase">PESO LÍQUIDO</div>
            <div className="font-bold text-right">
              {transport.netWeight !== undefined ? transport.netWeight.toFixed(3) : '-'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

