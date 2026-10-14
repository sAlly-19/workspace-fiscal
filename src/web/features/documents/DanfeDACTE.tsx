import { formatCnpjCpf } from '../../../core/danfe/helpers';
import { buildCteViewModel } from '../../../core/danfe/view-models';
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
  const vm = buildCteViewModel(doc);

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

  const cfop = doc.items?.[0]?.cfop || '5353';
  const natOp = doc.operationNature || 'PRESTACAO DE SERVICO DE TRANSPORTE';

  return (
    <div className="p-4 md:p-8 min-h-full flex justify-center bg-gray-100 print:bg-white print:p-0">
      <div
        className="bg-white text-black w-full max-w-[950px] min-w-[750px] border border-black shadow-lg select-text danfe-selectable cursor-text print:shadow-none print:border print:max-w-none print:w-full print:min-w-0"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8px', lineHeight: 1.15 }}
      >
        <DacteHeader
          issuerName={vm.issuerName}
          issuerStreet={vm.issuerStreet}
          issuerBairro={vm.issuerBairro}
          issuerCep={vm.issuerCep}
          issuerCity={vm.issuerCity}
          issuerState={vm.issuerState}
          issuerPhone={vm.issuerPhone}
          issuerDoc={vm.issuerDoc}
          issuerIE={vm.issuerIE}
          series={vm.series}
          number={vm.number}
          formattedKey={vm.formattedKey}
        />
        <DacteRoute
          cfop={cfop}
          natOp={natOp}
          protocolStr={vm.protocol}
          startCity={vm.startCity}
          startState={vm.startState}
          endCity={vm.endCity}
          endState={vm.endState}
        />
        <DacteParties
          tomadorRole={vm.tomadorRole}
          tomadorName={vm.tomadorName}
          tomadorDoc={vm.tomadorDoc}
          tomadorIE={vm.tomadorIE}
          tomadorCity={vm.tomadorCity}
          tomadorState={vm.tomadorState}
          tomadorPhone={vm.tomadorPhone}
          senderName={vm.senderName}
          senderDoc={vm.senderDoc}
          senderIE={vm.senderIE}
          senderStreet={vm.senderStreet}
          senderBairro={vm.senderBairro}
          senderCity={vm.senderCity}
          senderState={vm.senderState}
          senderCep={vm.senderCep}
          destName={vm.recipientName}
          destDoc={vm.recipientDoc}
          destIE={vm.recipientIE}
          destStreet={vm.recipientStreet}
          destBairro={vm.recipientBairro}
          destCity={vm.recipientCity}
          destState={vm.recipientState}
          destCep={vm.recipientCep}
          expedName={vm.expedidorName}
          expedDoc={vm.expedidorDoc}
          expedIE={vm.expedidorIE}
          expedStreet={vm.expedidorStreet}
          expedCity={vm.expedidorCity}
          expedState={vm.expedidorState}
          recebName={vm.recebedorName}
          recebDoc={vm.recebedorDoc}
          recebIE={vm.recebedorIE}
          recebStreet={vm.recebedorStreet}
          recebCity={vm.recebedorCity}
          recebState={vm.recebedorState}
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
