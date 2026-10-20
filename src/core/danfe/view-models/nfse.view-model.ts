import {
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
  safeString,
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
  const d = doc || {};
  const issuer = d.issuer || {};
  const issuerAddress = issuer.address || {};
  const recipient = d.recipient || {};
  const recipientAddress = recipient.address || {};

  const issuerName = safeString(issuer.name || d.issuerName, 'PRESTADOR DE SERVIÇOS');
  const issuerDoc = formatCnpjCpf(issuer.document || d.issuerDocument);
  const issuerIM = safeString(issuer.im || d.issuerIM, '-');
  const issuerIE = safeString(issuer.ie || d.issuerIE, '-');
  const issuerStreet = issuerAddress.street 
    ? `${safeString(issuerAddress.street)}${issuerAddress.number ? ', ' + safeString(issuerAddress.number) : ''}${issuerAddress.complement ? ' - ' + safeString(issuerAddress.complement) : ''}`
    : safeString(d.issuerAddress, '-');
  const issuerBairro = safeString(issuerAddress.neighborhood, '-');
  const issuerCep = formatCep(issuerAddress.zipCode);
  const issuerCity = safeString(issuerAddress.city || d.issuerCity, 'MUNICÍPIO');
  const issuerState = safeString(issuerAddress.state || d.issuerState, 'UF');
  const issuerPhone = formatPhone(issuer.phone);
  const issuerEmail = safeString(issuer.email, '-');

  const recipientName = safeString(recipient.name || d.recipientName, 'TOMADOR DO SERVIÇO');
  const recipientDoc = formatCnpjCpf(recipient.document || d.recipientDocument);
  const recipientIM = safeString(recipient.im || d.recipientIM, '-');
  const recipientIE = safeString(recipient.ie || d.recipientIE, '-');
  const recipientStreet = recipientAddress.street 
    ? `${safeString(recipientAddress.street)}${recipientAddress.number ? ', ' + safeString(recipientAddress.number) : ''}${recipientAddress.complement ? ' - ' + safeString(recipientAddress.complement) : ''}`
    : safeString(d.recipientAddress, '-');
  const recipientBairro = safeString(recipientAddress.neighborhood, '-');
  const recipientCep = formatCep(recipientAddress.zipCode);
  const recipientCity = safeString(recipientAddress.city || d.recipientCity, '-');
  const recipientState = safeString(recipientAddress.state || d.recipientState, '-');
  const recipientPhone = formatPhone(recipient.phone);
  const recipientEmail = safeString(recipient.email || d.recipientEmail, '-');

  const serviceCode = safeString(d.serviceCode || d.items?.[0]?.code, '-');
  const cnaeCode = safeString(d.cnaeCode, '-');
  const cityServiceCode = safeString(d.cityServiceCode, '-');
  const serviceCity = safeString(d.serviceCity, issuerCity);
  const serviceDescription = safeString(d.serviceDescription || d.items?.[0]?.description, '-');

  const number = safeString(d.number, '000.000');
  const series = safeString(d.series, '1');
  const rpsNumber = safeString(d.rpsNumber, '-');
  const rpsSeries = safeString(d.rpsSeries, '-');
  const verificationCode = safeString(d.verificationCode || d.accessKey, '-');
  const issueDateStr = d.issueDate ? formatDate(d.issueDate) : '-';
  const issueTimeStr = d.issueDate ? formatTime(d.issueDate) : '';

  const taxesObj = d.totals?.taxes || {};
  const valorServicos = Number(d.totals?.products ?? d.totalAmount ?? 0) || 0;
  const deducoes = Number(d.totals?.deductions ?? taxesObj.deductions ?? 0) || 0;
  const descIncond = Number(d.totals?.unconditionalDiscount ?? d.totals?.discount ?? 0) || 0;
  const descCond = Number(d.totals?.conditionalDiscount ?? 0) || 0;

  const issValor = Number(taxesObj.iss ?? (d.taxes?.find((t: any) => t.taxType === 'ISS')?.amount ?? 0)) || 0;
  const issBase = Number(taxesObj.issBase ?? d.totals?.icmsBase ?? (valorServicos - deducoes - descIncond)) || 0;
  const issAliquot = taxesObj.issAliquot !== undefined && taxesObj.issAliquot !== null 
    ? Number(taxesObj.issAliquot) 
    : (d.issAliquot ? Number(d.issAliquot) : null);
  
  const issRetidoValor = typeof taxesObj.issRetained === 'number' 
    ? taxesObj.issRetained 
    : (taxesObj.issRetained ? issValor : 0);
  const isIssRetido = issRetidoValor > 0 || taxesObj.issRetained === true || d.issRetained === true;

  const pisValor = Number(taxesObj.pis ?? (d.taxes?.find((t: any) => t.taxType === 'PIS')?.amount ?? 0)) || 0;
  const cofinsValor = Number(taxesObj.cofins ?? (d.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount ?? 0)) || 0;
  const inssValor = Number(taxesObj.inss ?? (d.taxes?.find((t: any) => t.taxType === 'INSS')?.amount ?? 0)) || 0;
  const irValor = Number(taxesObj.ir ?? (d.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount ?? 0)) || 0;
  const csllValor = Number(taxesObj.csll ?? (d.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount ?? 0)) || 0;
  const outrasRetencoes = Number(taxesObj.outrasRetencoes ?? 0) || 0;

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
