import { formatRole } from './dacte.helpers';

export interface DactePartiesProps {
  tomadorRole: string;
  tomadorName: string;
  tomadorDoc: string;
  tomadorIE: string;
  tomadorCity: string;
  tomadorState: string;
  tomadorPhone: string;
  senderName: string;
  senderDoc: string;
  senderIE: string;
  senderStreet: string;
  senderBairro: string;
  senderCity: string;
  senderState: string;
  senderCep: string;
  destName: string;
  destDoc: string;
  destIE: string;
  destStreet: string;
  destBairro: string;
  destCity: string;
  destState: string;
  destCep: string;
  expedName: string;
  expedDoc: string;
  expedIE: string;
  expedStreet: string;
  expedCity: string;
  expedState: string;
  recebName: string;
  recebDoc: string;
  recebIE: string;
  recebStreet: string;
  recebCity: string;
  recebState: string;
}

export function DacteParties({
  tomadorRole,
  tomadorName,
  tomadorDoc,
  tomadorIE,
  tomadorCity,
  tomadorState,
  tomadorPhone,
  senderName,
  senderDoc,
  senderIE,
  senderStreet,
  senderBairro,
  senderCity,
  senderState,
  senderCep,
  destName,
  destDoc,
  destIE,
  destStreet,
  destBairro,
  destCity,
  destState,
  destCep,
  expedName,
  expedDoc,
  expedIE,
  expedStreet,
  expedCity,
  expedState,
  recebName,
  recebDoc,
  recebIE,
  recebStreet,
  recebCity,
  recebState,
}: DactePartiesProps) {
  return (
    <>
      {/* TOMADOR DO SERVIÇO */}
      <div className="border-b border-black">
        <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase flex justify-between">
          <span>TOMADOR DO SERVIÇO</span>
          <span className="font-normal text-[6.5px]">
            [{tomadorRole === '0' ? 'X' : ' '}] Remetente &nbsp;&nbsp;
            [{tomadorRole === '1' ? 'X' : ' '}] Expedidor &nbsp;&nbsp;
            [{tomadorRole === '2' ? 'X' : ' '}] Recebedor &nbsp;&nbsp;
            [{tomadorRole === '3' ? 'X' : ' '}] Destinatário &nbsp;&nbsp;
            [{tomadorRole === '4' ? 'X' : ' '}] Outros
          </span>
        </div>
        <div className="p-1.5 grid grid-cols-4 gap-2 text-[7.5px]">
          <div className="col-span-2">
            <b>Nome/Razão Social:</b> {tomadorName}
          </div>
          <div>
            <b>CNPJ/CPF:</b> <span className="font-mono">{tomadorDoc}</span>
          </div>
          <div>
            <b>Inscrição Estadual:</b> {tomadorIE}
          </div>
          <div className="col-span-2">
            <b>Município/UF:</b> {tomadorCity} / {tomadorState}
          </div>
          <div>
            <b>Telefone:</b> {tomadorPhone || '-'}
          </div>
          <div>
            <b>Tipo:</b> {formatRole(tomadorRole)}
          </div>
        </div>
      </div>

      {/* PARTES ENVOLVIDAS: REMETENTE E DESTINATÁRIO */}
      <div className="border-b border-black grid grid-cols-2 divide-x divide-black">
        {/* Remetente */}
        <div className="p-1.5 space-y-0.5">
          <div className="text-[7px] font-bold uppercase text-gray-600">REMETENTE</div>
          <div className="text-[8.5px] font-bold uppercase">{senderName}</div>
          <div className="grid grid-cols-2 text-[7.5px]">
            <div>
              <b>CNPJ/CPF:</b> <span className="font-mono">{senderDoc}</span>
            </div>
            <div>
              <b>IE:</b> {senderIE}
            </div>
          </div>
          <div className="text-[7.5px]">
            <b>Endereço:</b> {senderStreet}
          </div>
          <div className="grid grid-cols-3 text-[7.5px]">
            <div>
              <b>Bairro:</b> {senderBairro}
            </div>
            <div>
              <b>Município/UF:</b> {senderCity}/{senderState}
            </div>
            <div>
              <b>CEP:</b> {senderCep}
            </div>
          </div>
        </div>

        {/* Destinatário */}
        <div className="p-1.5 space-y-0.5">
          <div className="text-[7px] font-bold uppercase text-gray-600">DESTINATÁRIO</div>
          <div className="text-[8.5px] font-bold uppercase">{destName}</div>
          <div className="grid grid-cols-2 text-[7.5px]">
            <div>
              <b>CNPJ/CPF:</b> <span className="font-mono">{destDoc}</span>
            </div>
            <div>
              <b>IE:</b> {destIE}
            </div>
          </div>
          <div className="text-[7.5px]">
            <b>Endereço:</b> {destStreet}
          </div>
          <div className="grid grid-cols-3 text-[7.5px]">
            <div>
              <b>Bairro:</b> {destBairro}
            </div>
            <div>
              <b>Município/UF:</b> {destCity}/{destState}
            </div>
            <div>
              <b>CEP:</b> {destCep}
            </div>
          </div>
        </div>
      </div>

      {/* EXPEDIDOR E RECEBEDOR (SE HOUVER) */}
      {(expedName !== '-' || recebName !== '-') && (
        <div className="border-b border-black grid grid-cols-2 divide-x divide-black bg-gray-50/30">
          <div className="p-1.5 text-[7.5px]">
            <div className="text-[7px] font-bold uppercase text-gray-600">EXPEDIDOR</div>
            <div className="font-bold">{expedName}</div>
            <div>
              <b>CNPJ/CPF:</b> {expedDoc} | <b>IE:</b> {expedIE}
            </div>
            <div>
              <b>Endereço:</b> {expedStreet} - {expedCity}/{expedState}
            </div>
          </div>
          <div className="p-1.5 text-[7.5px]">
            <div className="text-[7px] font-bold uppercase text-gray-600">RECEBEDOR</div>
            <div className="font-bold">{recebName}</div>
            <div>
              <b>CNPJ/CPF:</b> {recebDoc} | <b>IE:</b> {recebIE}
            </div>
            <div>
              <b>Endereço:</b> {recebStreet} - {recebCity}/{recebState}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

