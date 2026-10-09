import {
  formatDate,
  formatTime,
  formatModFrete,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../../../../core/danfe/helpers';
import {
  DanfeCanhoto,
  DanfeHeader,
  DanfeRecipient,
  DanfeBilling,
  DanfeTaxTotals,
  DanfeTransport,
  DanfeItemsTable,
  DanfeAdditionalInfo,
} from './danfe';

export interface DanfeNFeViewProps {
  doc: any;
  theme: string;
}

export function DanfeNFeView({ doc, theme }: DanfeNFeViewProps) {
  const isLight = theme === 'light';

  // Totais e Impostos
  const baseIcms = doc.totals?.icmsBase ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base || 0);
  const valorIcms = doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0);
  const baseIcmsSt = doc.totals?.icmsStBase ?? 0;
  const valorIcmsSt =
    doc.totals?.taxes?.icmsSt ??
    (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0);
  const impImportacao = doc.totals?.taxes?.ii ?? 0;
  const icmsUfRemet = doc.totals?.taxes?.icmsUfRemet ?? 0;
  const fcpUfDest = doc.totals?.taxes?.fcpUfDest ?? 0;
  const pis = doc.totals?.taxes?.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount || 0);
  const valorProdutos = doc.totals?.products || doc.totalAmount || 0;

  const valorFrete = doc.totals?.freight || 0;
  const valorSeguro = doc.totals?.insurance || 0;
  const valorDesconto = doc.totals?.discount || 0;
  const outrasDespesas = doc.totals?.otherExpenses || 0;
  const valorIpi = doc.totals?.taxes?.ipi ?? (doc.taxes?.find((t: any) => t.taxType === 'IPI')?.amount || 0);
  const icmsUfDest = doc.totals?.taxes?.icmsUfDest ?? 0;
  const totalTrib = doc.totals?.totalTaxes ?? 0;
  const cofins = doc.totals?.taxes?.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount || 0);
  const valorTotalNota = doc.totalAmount || doc.totals?.total || 0;

  // Emitente
  const issuerName = doc.issuer?.name || doc.issuerName || 'NOME / RAZÃO SOCIAL';
  const issuerDoc = formatCnpjCpf(doc.issuer?.document || doc.issuerDocument);
  const issuerIE = doc.issuer?.ie || doc.issuerIE || '-';
  const issuerIM = doc.issuer?.im || doc.issuerIM || '-';
  const issuerStreet = doc.issuer?.address?.street || '';
  const issuerNumber = doc.issuer?.address?.number || '';
  const issuerComp = doc.issuer?.address?.complement ? ` - ${doc.issuer.address.complement}` : '';
  const issuerBairro = doc.issuer?.address?.neighborhood || '';
  const issuerCep = formatCep(doc.issuer?.address?.zipCode);
  const issuerCity = doc.issuer?.address?.city || '';
  const issuerState = doc.issuer?.address?.state || '';
  const issuerPhone = formatPhone(doc.issuer?.phone);

  // Destinatário
  const recipientName = doc.recipient?.name || doc.recipientName || 'CONSUMIDOR FINAL';
  const recipientDoc = formatCnpjCpf(doc.recipient?.document || doc.recipientDocument);
  const recipientIE = doc.recipient?.ie || doc.recipientIE || '-';
  const recipientStreet = doc.recipient?.address?.street
    ? `${doc.recipient.address.street}, ${doc.recipient.address.number || 'S/N'}${
        doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''
      }`
    : '-';
  const recipientBairro = doc.recipient?.address?.neighborhood || '-';
  const recipientCep = formatCep(doc.recipient?.address?.zipCode);
  const recipientCity = doc.recipient?.address?.city || '-';
  const recipientState = doc.recipient?.address?.state || '-';
  const recipientPhone = formatPhone(doc.recipient?.phone);

  // Datas e Chave
  const issueDateStr = formatDate(doc.issueDate);
  const exitDateStr = formatDate(doc.exitDate || doc.issueDate);
  const exitTimeStr = doc.exitTime || formatTime(doc.issueDate);

  const formattedKey = doc.accessKey
    ? doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey
    : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';

  // Transporte
  const transport = doc.transport || {};
  const transpMod = formatModFrete(transport.modFrete);

  return (
    <div
      className={`p-2 sm:p-4 md:p-8 min-h-full flex justify-center overflow-x-auto print:bg-white print:p-0 ${
        isLight ? 'bg-[#e2e8f0]' : 'bg-[#27272a]'
      }`}
    >
      <div className="bg-white text-black w-full max-w-[850px] min-w-[700px] shadow-2xl p-4 sm:p-6 font-sans text-[9px] border border-black select-text danfe-selectable cursor-text print:shadow-none print:border-none print:max-w-none print:w-full print:min-w-0 print:p-0">
        <DanfeCanhoto
          issuerName={issuerName}
          issueDateStr={issueDateStr}
          valorTotalNota={valorTotalNota}
          recipientName={recipientName}
          recipientStreet={recipientStreet}
          recipientBairro={recipientBairro}
          recipientCity={recipientCity}
          recipientState={recipientState}
          docNumber={doc.number}
          docSeries={doc.series}
        />
        <DanfeHeader
          issuerName={issuerName}
          issuerStreet={issuerStreet}
          issuerNumber={issuerNumber}
          issuerComp={issuerComp}
          issuerBairro={issuerBairro}
          issuerCep={issuerCep}
          issuerCity={issuerCity}
          issuerState={issuerState}
          issuerPhone={issuerPhone}
          issuerDoc={issuerDoc}
          issuerIE={issuerIE}
          issuerIM={issuerIM}
          docNumber={doc.number}
          docSeries={doc.series}
          formattedKey={formattedKey}
          operationNature={doc.operationNature}
          protocol={doc.protocol}
        />
        <DanfeRecipient
          recipientName={recipientName}
          recipientDoc={recipientDoc}
          issueDateStr={issueDateStr}
          recipientStreet={recipientStreet}
          recipientBairro={recipientBairro}
          recipientCep={recipientCep}
          exitDateStr={exitDateStr}
          recipientCity={recipientCity}
          recipientState={recipientState}
          recipientPhone={recipientPhone}
          recipientIE={recipientIE}
          exitTimeStr={exitTimeStr}
        />
        <DanfeBilling billing={doc.billing} defaultDocNumber={doc.number} />
        <DanfeTaxTotals
          baseIcms={baseIcms}
          valorIcms={valorIcms}
          baseIcmsSt={baseIcmsSt}
          valorIcmsSt={valorIcmsSt}
          impImportacao={impImportacao}
          icmsUfRemet={icmsUfRemet}
          fcpUfDest={fcpUfDest}
          pis={pis}
          valorProdutos={valorProdutos}
          valorFrete={valorFrete}
          valorSeguro={valorSeguro}
          valorDesconto={valorDesconto}
          outrasDespesas={outrasDespesas}
          valorIpi={valorIpi}
          icmsUfDest={icmsUfDest}
          totalTrib={totalTrib}
          cofins={cofins}
          valorTotalNota={valorTotalNota}
        />
        <DanfeTransport transport={transport} transpMod={transpMod} />
        <DanfeItemsTable items={doc.items} />
        <DanfeAdditionalInfo additionalInfo={doc.additionalInfo} fiscoInfo={doc.fiscoInfo} />
      </div>
    </div>
  );
}
