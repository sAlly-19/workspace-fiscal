import {
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
  formatModFrete,
} from '../helpers';

export interface NfeViewModel {
  issuerName: string;
  issuerDoc: string;
  issuerIE: string;
  issuerIM: string;
  issuerStreet: string;
  issuerNumber: string;
  issuerComp: string;
  issuerBairro: string;
  issuerCep: string;
  issuerCity: string;
  issuerState: string;
  issuerPhone: string;

  recipientName: string;
  recipientDoc: string;
  recipientIE: string;
  recipientStreet: string;
  recipientBairro: string;
  recipientCep: string;
  recipientCity: string;
  recipientState: string;
  recipientPhone: string;

  number: string;
  series: string;
  accessKey: string;
  formattedKey: string;
  issueDateStr: string;
  exitDateStr: string;
  exitTimeStr: string;
  operationNature: string;
  protocol: string;

  baseIcms: number;
  valorIcms: number;
  baseIcmsSt: number;
  valorIcmsSt: number;
  impImportacao: number;
  icmsUfRemet: number;
  fcpUfDest: number;
  pis: number;
  cofins: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  outrasDespesas: number;
  valorIpi: number;
  icmsUfDest: number;
  totalTrib: number;
  valorTotalNota: number;

  transpMod: string;
}

export function buildNfeViewModel(doc: any): NfeViewModel {
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

  const recipientName = doc.recipient?.name || doc.recipientName || 'CONSUMIDOR FINAL';
  const recipientDoc = formatCnpjCpf(doc.recipient?.document || doc.recipientDocument);
  const recipientIE = doc.recipient?.ie || doc.recipientIE || '-';
  const recipientStreet = doc.recipient?.address?.street 
    ? `${doc.recipient.address.street}, ${doc.recipient.address.number || 'S/N'}${doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''}` 
    : '-';
  const recipientBairro = doc.recipient?.address?.neighborhood || '-';
  const recipientCep = formatCep(doc.recipient?.address?.zipCode);
  const recipientCity = doc.recipient?.address?.city || '-';
  const recipientState = doc.recipient?.address?.state || '-';
  const recipientPhone = formatPhone(doc.recipient?.phone);

  const number = doc.number || '000.000';
  const series = doc.series || '001';
  const accessKey = doc.accessKey || '';
  const formattedKey = accessKey 
    ? (accessKey.match(/.{1,4}/g)?.join(' ') || accessKey) 
    : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';
  const issueDateStr = doc.issueDate ? formatDate(doc.issueDate) : '-';
  const exitDateStr = doc.exitDate ? formatDate(doc.exitDate) : issueDateStr;
  const exitTimeStr = doc.exitTime || (doc.issueDate ? formatTime(doc.issueDate) : '-');
  const operationNature = doc.operationNature || 'VENDA DE MERCADORIA';
  const protocol = doc.protocol || '-';

  const baseIcms = doc.totals?.icmsBase ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base || 0);
  const valorIcms = doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0);
  const baseIcmsSt = doc.totals?.icmsStBase ?? 0;
  const valorIcmsSt = doc.totals?.taxes?.icmsSt ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0);
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

  const transport = doc.transport || {};
  const transpMod = formatModFrete(transport.modFrete);

  return {
    issuerName,
    issuerDoc,
    issuerIE,
    issuerIM,
    issuerStreet,
    issuerNumber,
    issuerComp,
    issuerBairro,
    issuerCep,
    issuerCity,
    issuerState,
    issuerPhone,

    recipientName,
    recipientDoc,
    recipientIE,
    recipientStreet,
    recipientBairro,
    recipientCep,
    recipientCity,
    recipientState,
    recipientPhone,

    number,
    series,
    accessKey,
    formattedKey,
    issueDateStr,
    exitDateStr,
    exitTimeStr,
    operationNature,
    protocol,

    baseIcms,
    valorIcms,
    baseIcmsSt,
    valorIcmsSt,
    impImportacao,
    icmsUfRemet,
    fcpUfDest,
    pis,
    cofins,
    valorProdutos,
    valorFrete,
    valorSeguro,
    valorDesconto,
    outrasDespesas,
    valorIpi,
    icmsUfDest,
    totalTrib,
    valorTotalNota,

    transpMod,
  };
}

