import {
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../helpers';

export interface NfseViewModel {
  issuerName: string;
  issuerDoc: string;
  issuerIM: string;
  issuerIE: string;
  issuerStreet: string;
  issuerBairro: string;
  issuerCep: string;
  issuerCity: string;
  issuerState: string;
  issuerPhone: string;
  issuerEmail: string;

  recipientName: string;
  recipientDoc: string;
  recipientIM: string;
  recipientIE: string;
  recipientStreet: string;
  recipientBairro: string;
  recipientCep: string;
  recipientCity: string;
  recipientState: string;
  recipientPhone: string;
  recipientEmail: string;

  serviceCode: string;
  cnaeCode: string;
  cityServiceCode: string;
  serviceCity: string;
  serviceDescription: string;

  number: string;
  series: string;
  rpsNumber: string;
  rpsSeries: string;
  verificationCode: string;
  issueDateStr: string;
  issueTimeStr: string;

  valorServicos: number;
  deducoes: number;
  descIncond: number;
  descCond: number;
  issValor: number;
  issBase: number;
  issAliquot: number | null;
  issRetidoValor: number;
  isIssRetido: boolean;

  pisValor: number;
  cofinsValor: number;
  inssValor: number;
  irValor: number;
  csllValor: number;
  outrasRetencoes: number;
  totalRetencoes: number;
  valorLiquido: number;
}

export function buildNfseViewModel(doc: any): NfseViewModel {
  const issuerName = doc.issuer?.name || doc.issuerName || 'PRESTADOR DE SERVIÇOS';
  const issuerDoc = formatCnpjCpf(doc.issuer?.document || doc.issuerDocument);
  const issuerIM = doc.issuer?.im || doc.issuerIM || '-';
  const issuerIE = doc.issuer?.ie || doc.issuerIE || '-';
  const issuerStreet = doc.issuer?.address?.street 
    ? `${doc.issuer.address.street}${doc.issuer.address.number ? ', ' + doc.issuer.address.number : ''}${doc.issuer.address.complement ? ' - ' + doc.issuer.address.complement : ''}`
    : (doc.issuerAddress || '-');
  const issuerBairro = doc.issuer?.address?.neighborhood || '-';
  const issuerCep = formatCep(doc.issuer?.address?.zipCode);
  const issuerCity = doc.issuer?.address?.city || doc.issuerCity || 'MUNICÍPIO';
  const issuerState = doc.issuer?.address?.state || doc.issuerState || 'UF';
  const issuerPhone = formatPhone(doc.issuer?.phone);
  const issuerEmail = doc.issuer?.email || '-';

  const recipientName = doc.recipient?.name || doc.recipientName || 'TOMADOR DO SERVIÇO';
  const recipientDoc = formatCnpjCpf(doc.recipient?.document || doc.recipientDocument);
  const recipientIM = doc.recipient?.im || doc.recipientIM || '-';
  const recipientIE = doc.recipient?.ie || doc.recipientIE || '-';
  const recipientStreet = doc.recipient?.address?.street 
    ? `${doc.recipient.address.street}${doc.recipient.address.number ? ', ' + doc.recipient.address.number : ''}${doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''}`
    : (doc.recipientAddress || '-');
  const recipientBairro = doc.recipient?.address?.neighborhood || '-';
  const recipientCep = formatCep(doc.recipient?.address?.zipCode);
  const recipientCity = doc.recipient?.address?.city || doc.recipientCity || '-';
  const recipientState = doc.recipient?.address?.state || doc.recipientState || '-';
  const recipientPhone = formatPhone(doc.recipient?.phone);
  const recipientEmail = doc.recipient?.email || doc.recipientEmail || '-';

  const serviceCode = doc.serviceCode || doc.items?.[0]?.code || '-';
  const cnaeCode = doc.cnaeCode || '-';
  const cityServiceCode = doc.cityServiceCode || '-';
  const serviceCity = doc.serviceCity || issuerCity;
  const serviceDescription = doc.serviceDescription || doc.items?.[0]?.description || '-';

  const number = doc.number || '000.000';
  const series = doc.series || '1';
  const rpsNumber = doc.rpsNumber || '-';
  const rpsSeries = doc.rpsSeries || '-';
  const verificationCode = doc.verificationCode || doc.accessKey || '-';
  const issueDateStr = doc.issueDate ? formatDate(doc.issueDate) : '-';
  const issueTimeStr = doc.issueDate ? formatTime(doc.issueDate) : '';

  const taxesObj = doc.totals?.taxes || {};
  const valorServicos = doc.totals?.products ?? doc.totalAmount ?? 0;
  const deducoes = doc.totals?.deductions ?? taxesObj.deductions ?? 0;
  const descIncond = doc.totals?.unconditionalDiscount ?? doc.totals?.discount ?? 0;
  const descCond = doc.totals?.conditionalDiscount ?? 0;

  const issValor = taxesObj.iss ?? (doc.taxes?.find((t: any) => t.taxType === 'ISS')?.amount ?? 0);
  const issBase = taxesObj.issBase ?? doc.totals?.icmsBase ?? (valorServicos - deducoes - descIncond);
  const issAliquot = taxesObj.issAliquot !== undefined && taxesObj.issAliquot !== null 
    ? Number(taxesObj.issAliquot) 
    : (doc.issAliquot ? Number(doc.issAliquot) : null);
  
  const issRetidoValor = typeof taxesObj.issRetained === 'number' 
    ? taxesObj.issRetained 
    : (taxesObj.issRetained ? issValor : 0);
  const isIssRetido = issRetidoValor > 0 || taxesObj.issRetained === true || doc.issRetained === true;

  const pisValor = taxesObj.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount ?? 0);
  const cofinsValor = taxesObj.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount ?? 0);
  const inssValor = taxesObj.inss ?? (doc.taxes?.find((t: any) => t.taxType === 'INSS')?.amount ?? 0);
  const irValor = taxesObj.ir ?? (doc.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount ?? 0);
  const csllValor = taxesObj.csll ?? (doc.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount ?? 0);
  const outrasRetencoes = taxesObj.outrasRetencoes ?? 0;

  const totalRetencoes = (isIssRetido ? issRetidoValor : 0) + pisValor + cofinsValor + inssValor + irValor + csllValor + outrasRetencoes;
  const valorLiquido = valorServicos - totalRetencoes - descIncond;

  return {
    issuerName,
    issuerDoc,
    issuerIM,
    issuerIE,
    issuerStreet,
    issuerBairro,
    issuerCep,
    issuerCity,
    issuerState,
    issuerPhone,
    issuerEmail,

    recipientName,
    recipientDoc,
    recipientIM,
    recipientIE,
    recipientStreet,
    recipientBairro,
    recipientCep,
    recipientCity,
    recipientState,
    recipientPhone,
    recipientEmail,

    serviceCode,
    cnaeCode,
    cityServiceCode,
    serviceCity,
    serviceDescription,

    number,
    series,
    rpsNumber,
    rpsSeries,
    verificationCode,
    issueDateStr,
    issueTimeStr,

    valorServicos,
    deducoes,
    descIncond,
    descCond,
    issValor,
    issBase,
    issAliquot,
    issRetidoValor,
    isIssRetido,

    pisValor,
    cofinsValor,
    inssValor,
    irValor,
    csllValor,
    outrasRetencoes,
    totalRetencoes,
    valorLiquido,
  };
}

