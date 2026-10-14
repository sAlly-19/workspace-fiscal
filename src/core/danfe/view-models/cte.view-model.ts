import {
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
  formatRole,
  formatUnit,
} from '../helpers';

export interface CteViewModel {
  issuerName: string;
  issuerDoc: string;
  issuerIE: string;
  issuerStreet: string;
  issuerBairro: string;
  issuerCep: string;
  issuerCity: string;
  issuerState: string;
  issuerPhone: string;

  senderName: string;
  senderDoc: string;
  senderIE: string;
  senderStreet: string;
  senderBairro: string;
  senderCep: string;
  senderCity: string;
  senderState: string;

  recipientName: string;
  recipientDoc: string;
  recipientIE: string;
  recipientStreet: string;
  recipientBairro: string;
  recipientCep: string;
  recipientCity: string;
  recipientState: string;

  expedidorName: string;
  expedidorDoc: string;
  expedidorIE: string;
  expedidorStreet: string;
  expedidorCity: string;
  expedidorState: string;

  recebedorName: string;
  recebedorDoc: string;
  recebedorIE: string;
  recebedorStreet: string;
  recebedorCity: string;
  recebedorState: string;

  tomadorRole: string;
  tomadorName: string;
  tomadorDoc: string;
  tomadorIE: string;
  tomadorCity: string;
  tomadorState: string;
  tomadorPhone: string;

  startCity: string;
  startState: string;
  endCity: string;
  endState: string;

  productDescription: string;
  totalWeight: number;

  valorTotal: number;
  valorReceber: number;
  baseIcms: number;
  valorIcms: number;
  aliquotaIcms: number;

  number: string;
  series: string;
  accessKey: string;
  formattedKey: string;
  issueDateStr: string;
  issueTimeStr: string;
  protocol: string;
  modal: string;
}

export function buildCteViewModel(doc: any): CteViewModel {
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

  const sender = doc.sender || doc.cteParties?.sender || {};
  const senderName = sender.name || '-';
  const senderDoc = formatCnpjCpf(sender.document);
  const senderIE = sender.ie || '-';
  const senderStreet = sender.address?.street 
    ? `${sender.address.street}${sender.address.number ? ', ' + sender.address.number : ''}${sender.address.complement ? ' - ' + sender.address.complement : ''}`
    : '-';
  const senderBairro = sender.address?.neighborhood || '-';
  const senderCep = formatCep(sender.address?.zipCode);
  const senderCity = sender.address?.city || '-';
  const senderState = sender.address?.state || '-';
  const senderPhone = formatPhone(sender.phone);

  const recipient = doc.recipient || doc.cteParties?.recipient || {};
  const recipientName = recipient.name || doc.recipientName || '-';
  const recipientDoc = formatCnpjCpf(recipient.document || doc.recipientDocument);
  const recipientIE = recipient.ie || doc.recipientIE || '-';
  const recipientStreet = recipient.address?.street 
    ? `${recipient.address.street}${recipient.address.number ? ', ' + recipient.address.number : ''}${recipient.address.complement ? ' - ' + recipient.address.complement : ''}`
    : (doc.recipientAddress || '-');
  const recipientBairro = recipient.address?.neighborhood || '-';
  const recipientCep = formatCep(recipient.address?.zipCode);
  const recipientCity = recipient.address?.city || doc.recipientCity || '-';
  const recipientState = recipient.address?.state || doc.recipientState || '-';
  const recipientPhone = formatPhone(recipient.phone);

  const exped = doc.expedidor || doc.cteParties?.expedidor || doc.shipper || {};
  const expedidorName = exped.name || '-';
  const expedidorDoc = formatCnpjCpf(exped.document);
  const expedidorIE = exped.ie || '-';
  const expedidorStreet = exped.address?.street 
    ? `${exped.address.street}${exped.address.number ? ', ' + exped.address.number : ''}`
    : '-';
  const expedidorCity = exped.address?.city || '-';
  const expedidorState = exped.address?.state || '-';

  const receb = doc.recebedor || doc.cteParties?.recebedor || doc.receiver || {};
  const recebedorName = receb.name || '-';
  const recebedorDoc = formatCnpjCpf(receb.document);
  const recebedorIE = receb.ie || '-';
  const recebedorStreet = receb.address?.street 
    ? `${receb.address.street}${receb.address.number ? ', ' + receb.address.number : ''}`
    : '-';
  const recebedorCity = receb.address?.city || '-';
  const recebedorState = receb.address?.state || '-';

  const tomador = doc.cteTomador || doc.tomador || doc.cteParties?.tomador || {};
  const tomadorRole = String(tomador.role ?? '0');
  const tomadorName = tomador.name || (tomadorRole === '0' ? senderName : (tomadorRole === '3' ? recipientName : '-'));
  const tomadorDoc = formatCnpjCpf(tomador.document || (tomadorRole === '0' ? sender.document : (tomadorRole === '3' ? recipient.document : undefined)));
  const tomadorIE = tomador.ie || (tomadorRole === '0' ? senderIE : (tomadorRole === '3' ? recipientIE : '-'));
  const tomadorCity = tomador.address?.city || (tomadorRole === '0' ? senderCity : (tomadorRole === '3' ? recipientCity : '-'));
  const tomadorState = tomador.address?.state || (tomadorRole === '0' ? senderState : (tomadorRole === '3' ? recipientState : '-'));
  const tomadorPhone = formatPhone(tomador.phone || (tomadorRole === '0' ? senderPhone : (tomadorRole === '3' ? recipientPhone : undefined)));

  const route = doc.route || doc.cteRoute || {};
  const startCity = route.startCity || (senderCity !== '-' ? senderCity : issuerCity);
  const startState = route.startState || (senderState !== '-' ? senderState : issuerState);
  const endCity = route.endCity || (recipientCity !== '-' ? recipientCity : '-');
  const endState = route.endState || (recipientState !== '-' ? recipientState : '-');

  const cargo = doc.cargo || doc.cteCargo || {};
  const productDescription = cargo.productDescription || '-';
  const totalWeight = Number(cargo.totalWeight || 0);

  const valorTotal = doc.totalAmount || doc.totals?.total || 0;
  const valorReceber = doc.totals?.netAmount || valorTotal;
  const baseIcms = doc.totals?.icmsBase ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base || 0);
  const valorIcms = doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0);
  const aliquotaIcms = doc.totals?.taxes?.icmsAliq ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.rate || 0);

  const number = doc.number || '000.000';
  const series = doc.series || '1';
  const accessKey = doc.accessKey || '';
  const formattedKey = accessKey 
    ? (accessKey.match(/.{1,4}/g)?.join(' ') || accessKey) 
    : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';
  const issueDateStr = doc.issueDate ? formatDate(doc.issueDate) : '-';
  const issueTimeStr = doc.issueDate ? formatTime(doc.issueDate) : '-';
  const protocol = doc.protocol || '-';
  const modal = doc.modal || doc.cteModal?.tipoModal || '01 - RODOVIÁRIO';

  return {
    issuerName,
    issuerDoc,
    issuerIE,
    issuerStreet,
    issuerBairro,
    issuerCep,
    issuerCity,
    issuerState,
    issuerPhone,

    senderName,
    senderDoc,
    senderIE,
    senderStreet,
    senderBairro,
    senderCep,
    senderCity,
    senderState,

    recipientName,
    recipientDoc,
    recipientIE,
    recipientStreet,
    recipientBairro,
    recipientCep,
    recipientCity,
    recipientState,

    expedidorName,
    expedidorDoc,
    expedidorIE,
    expedidorStreet,
    expedidorCity,
    expedidorState,

    recebedorName,
    recebedorDoc,
    recebedorIE,
    recebedorStreet,
    recebedorCity,
    recebedorState,

    tomadorRole,
    tomadorName,
    tomadorDoc,
    tomadorIE,
    tomadorCity,
    tomadorState,
    tomadorPhone,

    startCity,
    startState,
    endCity,
    endState,

    productDescription,
    totalWeight,

    valorTotal,
    valorReceber,
    baseIcms,
    valorIcms,
    aliquotaIcms,

    number,
    series,
    accessKey,
    formattedKey,
    issueDateStr,
    issueTimeStr,
    protocol,
    modal,
  };
}
