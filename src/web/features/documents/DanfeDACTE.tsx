import { formatCnpjCpf, formatCep, formatPhone } from '../../../core/danfe/helpers';
import {
  DacteHeader,
  DacteRoute,
  DacteParties,
  DacteCargoAndFreight,
  DacteFiscalAndRoad,
} from './dacte';

export interface DanfeDACTEProps {
  doc: any;
}

export function DanfeDACTE({ doc }: DanfeDACTEProps) {
  // Emitente / Transportadora
  const issuerName = doc.issuer?.name || doc.issuerName || 'TRANSPORTADORA';
  const issuerDoc = formatCnpjCpf(doc.issuer?.document || doc.issuerDocument);
  const issuerIE = doc.issuer?.ie || doc.issuerIE || '-';
  const issuerStreet = doc.issuer?.address?.street
    ? `${doc.issuer.address.street}${doc.issuer.address.number ? ', ' + doc.issuer.address.number : ''}${doc.issuer.address.complement ? ' - ' + doc.issuer.address.complement : ''}`
    : (doc.issuerAddress || '-');
  const issuerBairro = doc.issuer?.address?.neighborhood || '-';
  const issuerCep = formatCep(doc.issuer?.address?.zipCode);
  const issuerCity = doc.issuer?.address?.city || doc.issuerCity || '-';
  const issuerState = doc.issuer?.address?.state || doc.issuerState || '-';
  const issuerPhone = formatPhone(doc.issuer?.phone);

  // Remetente (Sender)
  const senderName = doc.sender?.name || '-';
  const senderDoc = formatCnpjCpf(doc.sender?.document);
  const senderIE = doc.sender?.ie || '-';
  const senderStreet = doc.sender?.address?.street
    ? `${doc.sender.address.street}${doc.sender.address.number ? ', ' + doc.sender.address.number : ''}${doc.sender.address.complement ? ' - ' + doc.sender.address.complement : ''}`
    : '-';
  const senderBairro = doc.sender?.address?.neighborhood || '-';
  const senderCep = formatCep(doc.sender?.address?.zipCode);
  const senderCity = doc.sender?.address?.city || '-';
  const senderState = doc.sender?.address?.state || '-';
  const senderPhone = formatPhone(doc.sender?.phone);

  // Destinatário (Recipient)
  const destName = doc.recipient?.name || doc.recipientName || '-';
  const destDoc = formatCnpjCpf(doc.recipient?.document || doc.recipientDocument);
  const destIE = doc.recipient?.ie || doc.recipientIE || '-';
  const destStreet = doc.recipient?.address?.street
    ? `${doc.recipient.address.street}${doc.recipient.address.number ? ', ' + doc.recipient.address.number : ''}${doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''}`
    : (doc.recipientAddress || '-');
  const destBairro = doc.recipient?.address?.neighborhood || '-';
  const destCep = formatCep(doc.recipient?.address?.zipCode);
  const destCity = doc.recipient?.address?.city || doc.recipientCity || '-';
  const destState = doc.recipient?.address?.state || doc.recipientState || '-';
  const destPhone = formatPhone(doc.recipient?.phone);

  // Expedidor (Shipper)
  const expedName = doc.shipper?.name || '-';
  const expedDoc = formatCnpjCpf(doc.shipper?.document);
  const expedIE = doc.shipper?.ie || '-';
  const expedStreet = doc.shipper?.address?.street
    ? `${doc.shipper.address.street}${doc.shipper.address.number ? ', ' + doc.shipper.address.number : ''}`
    : '-';
  const expedCity = doc.shipper?.address?.city || '-';
  const expedState = doc.shipper?.address?.state || '-';

  // Recebedor (Receiver)
  const recebName = doc.receiver?.name || '-';
  const recebDoc = formatCnpjCpf(doc.receiver?.document);
  const recebIE = doc.receiver?.ie || '-';
  const recebStreet = doc.receiver?.address?.street
    ? `${doc.receiver.address.street}${doc.receiver.address.number ? ', ' + doc.receiver.address.number : ''}`
    : '-';
  const recebCity = doc.receiver?.address?.city || '-';
  const recebState = doc.receiver?.address?.state || '-';

  // Tomador do Serviço
  const tomador = doc.cteTomador || {};
  const tomadorRole = String(tomador.role ?? '0');
  const tomadorName = tomador.name || (tomadorRole === '0' ? senderName : (tomadorRole === '3' ? destName : '-'));
  const tomadorDoc = formatCnpjCpf(tomador.document || (tomadorRole === '0' ? doc.sender?.document : (tomadorRole === '3' ? doc.recipient?.document : undefined)));
  const tomadorIE = tomador.ie || (tomadorRole === '0' ? senderIE : (tomadorRole === '3' ? destIE : '-'));
  const tomadorCity = tomador.address?.city || (tomadorRole === '0' ? senderCity : (tomadorRole === '3' ? destCity : '-'));
  const tomadorState = tomador.address?.state || (tomadorRole === '0' ? senderState : (tomadorRole === '3' ? destState : '-'));
  const tomadorPhone = formatPhone(tomador.phone || (tomadorRole === '0' ? senderPhone : (tomadorRole === '3' ? destPhone : undefined)));

  // Rota
  const route = doc.cteRoute || {};
  const startCity = route.startCity || doc.sender?.address?.city || issuerCity;
  const startState = route.startState || doc.sender?.address?.state || issuerState;
  const endCity = route.endCity || doc.recipient?.address?.city || '-';
  const endState = route.endState || doc.recipient?.address?.state || '-';

  // Carga
  const cargo = doc.cteCargo || {};
  const proPred = cargo.predominantProduct || 'CARGA GERAL';
  const outCat = cargo.otherCharacteristics || '-';
  const vCarga = cargo.cargoValue ?? doc.totalAmount ?? 0;
  const quantities = cargo.quantities || [];

  // Componentes do Frete
  const components = doc.cteComponents && doc.cteComponents.length > 0 ? doc.cteComponents : [
    { name: 'FRETE VALOR', amount: doc.totalAmount || 0 },
  ];
  const totalPrestacao = doc.totals?.total ?? doc.totalAmount ?? 0;
  const valorReceber = totalPrestacao;

  // Tributos ICMS
  const icmsCst = doc.cteCst || '00';
  const icmsBase = doc.cteIcmsBase ?? doc.totals?.icmsBase ?? (doc.totals?.taxes?.icmsBase ?? 0);
  const icmsAliq = doc.cteIcmsAliq ?? (doc.totals?.taxes?.icmsAliquot ?? 0);
  const icmsValor = doc.cteIcmsValue ?? doc.totals?.taxes?.icms ?? 0;
  const icmsRed = doc.cteIcmsReduction ?? 0;

  // Modal Rodoviário
  const modal = doc.cteModal || {};
  const rntrc = modal.rntrc || '-';
  const ciot = modal.ciot || '-';
  const placa = modal.vehiclePlate || '-';
  const ufVeic = modal.vehicleUf || '-';
  const motorista = modal.driverName || '-';
  const motoristaCpf = formatCnpjCpf(modal.driverCpf);

  // Documentos Originários (NF-e)
  const docsList = doc.cteDocs || [];

  // Identificação e Chave
  const accessKey = doc.accessKey || '00000000000000000000000000000000000000000000';
  const formattedKey = accessKey.match(/.{1,4}/g)?.join(' ') || accessKey;
  const number = doc.number || '000.000';
  const series = doc.series || '1';
  const protocolStr = doc.protocol || '-';
  const cfop = doc.items?.[0]?.cfop || '5353';
  const natOp = doc.operationNature || 'PRESTACAO DE SERVICO DE TRANSPORTE';

  return (
    <div className="p-4 md:p-8 min-h-full flex justify-center bg-gray-100 print:bg-white print:p-0">
      <div
        className="bg-white text-black w-full max-w-[950px] min-w-[750px] border border-black shadow-lg select-text danfe-selectable cursor-text print:shadow-none print:border print:max-w-none print:w-full print:min-w-0"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8px', lineHeight: 1.15 }}
      >
        <DacteHeader
          issuerName={issuerName}
          issuerStreet={issuerStreet}
          issuerBairro={issuerBairro}
          issuerCep={issuerCep}
          issuerCity={issuerCity}
          issuerState={issuerState}
          issuerPhone={issuerPhone}
          issuerDoc={issuerDoc}
          issuerIE={issuerIE}
          series={series}
          number={number}
          formattedKey={formattedKey}
        />
        <DacteRoute
          cfop={cfop}
          natOp={natOp}
          protocolStr={protocolStr}
          startCity={startCity}
          startState={startState}
          endCity={endCity}
          endState={endState}
        />
        <DacteParties
          tomadorRole={tomadorRole}
          tomadorName={tomadorName}
          tomadorDoc={tomadorDoc}
          tomadorIE={tomadorIE}
          tomadorCity={tomadorCity}
          tomadorState={tomadorState}
          tomadorPhone={tomadorPhone}
          senderName={senderName}
          senderDoc={senderDoc}
          senderIE={senderIE}
          senderStreet={senderStreet}
          senderBairro={senderBairro}
          senderCity={senderCity}
          senderState={senderState}
          senderCep={senderCep}
          destName={destName}
          destDoc={destDoc}
          destIE={destIE}
          destStreet={destStreet}
          destBairro={destBairro}
          destCity={destCity}
          destState={destState}
          destCep={destCep}
          expedName={expedName}
          expedDoc={expedDoc}
          expedIE={expedIE}
          expedStreet={expedStreet}
          expedCity={expedCity}
          expedState={expedState}
          recebName={recebName}
          recebDoc={recebDoc}
          recebIE={recebIE}
          recebStreet={recebStreet}
          recebCity={recebCity}
          recebState={recebState}
        />
        <DacteCargoAndFreight
          proPred={proPred}
          outCat={outCat}
          vCarga={vCarga}
          quantities={quantities}
          components={components}
          totalPrestacao={totalPrestacao}
          valorReceber={valorReceber}
        />
        <DacteFiscalAndRoad
          icmsCst={icmsCst}
          icmsBase={icmsBase}
          icmsAliq={icmsAliq}
          icmsValor={icmsValor}
          icmsRed={icmsRed}
          docsList={docsList}
          rntrc={rntrc}
          ciot={ciot}
          placa={placa}
          ufVeic={ufVeic}
          motorista={motorista}
          motoristaCpf={motoristaCpf}
          additionalInfo={doc.additionalInfo}
          fiscoInfo={doc.fiscoInfo}
        />
      </div>
    </div>
  );
}
