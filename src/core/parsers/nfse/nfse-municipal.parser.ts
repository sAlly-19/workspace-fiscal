import crypto from 'crypto';
import { FiscalDocument, Address } from '../../fiscal.types';
import { parseNfseNumber } from './nfse-number.utils';

/**
 * Padrão Municipal / XML Simplificado (<Notas><xml>...)
 */
export function parseMunicipalNotas(data: any, rawXmlPath: string, batchId?: string): FiscalDocument {
  const rawData = Array.isArray(data) ? data[0] : data;
  const accessKey = rawData.CHAVENFSE ? String(rawData.CHAVENFSE).replace(/^NFS/, '') : undefined;
  const number = rawData.N_DA_NFSE ? String(rawData.N_DA_NFSE) : undefined;
  const series = rawData.SERIE ? String(rawData.SERIE) : undefined;
  const verificationCode = rawData.CODIGO_VERIFICACAO || rawData.COD_VERIFICACAO || accessKey;

  let issueDate: Date | undefined;
  if (rawData.DATA_EMISSAO) {
    const dateParts = String(rawData.DATA_EMISSAO).split('/');
    if (dateParts.length === 3) {
      issueDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
    } else {
      issueDate = new Date(rawData.DATA_EMISSAO);
    }
  } else {
    issueDate = new Date();
  }

  const issuerName = rawData.RAZAO_SOCIAL_PRESTADOR || rawData.NOME_PRESTADOR || 'PRESTADOR DE SERVIÇO';
  const issuerDoc = rawData.CNPJ_PRESTADOR || rawData.CPF_PRESTADOR || 'NÃO INFORMADO';
  let issuerAddress: Address | undefined;
  if (rawData.LOGRADOURO_PRESTADOR) {
    issuerAddress = {
      street: rawData.LOGRADOURO_PRESTADOR,
      number: rawData.NUMERO_PRESTADOR ? String(rawData.NUMERO_PRESTADOR) : undefined,
      complement: rawData.COMPLEMENTO_PRESTADOR,
      neighborhood: rawData.BAIRRO_PRESTADOR,
      city: rawData.CIDADE_PRESTADOR,
      state: rawData.UF_PRESTADOR,
      zipCode: rawData.CEP_PRESTADOR ? String(rawData.CEP_PRESTADOR) : undefined,
    };
  }

  const recipientName = rawData.RAZAO_SOCIAL_TOMADOR || rawData.NOME_TOMADOR || 'TOMADOR DO SERVIÇO';
  const recipientDoc = rawData.CNPJ_TOMADOR || rawData.CPF_TOMADOR || 'NÃO INFORMADO';
  let recipientAddress: Address | undefined;
  if (rawData.LOGRADOURO_TOMADOR) {
    recipientAddress = {
      street: rawData.LOGRADOURO_TOMADOR,
      number: rawData.NUMERO_TOMADOR ? String(rawData.NUMERO_TOMADOR) : undefined,
      complement: rawData.COMPLEMENTO_TOMADOR,
      neighborhood: rawData.BAIRRO_TOMADOR,
      city: rawData.CIDADE_TOMADOR,
      state: rawData.UF_TOMADOR,
      zipCode: rawData.CEP_TOMADOR ? String(rawData.CEP_TOMADOR) : undefined,
    };
  }

  const descServ = rawData.DISCRIMINACAO || rawData.DESCRICAO_SERVICO || 'Serviço Prestado';
  const valServ = parseNfseNumber(rawData.VALOR_SERVICOS) || parseNfseNumber(rawData.VALOR_TOTAL) || 0;
  const valDed = parseNfseNumber(rawData.VALOR_DEDUCOES) || 0;
  const valDesc = parseNfseNumber(rawData.DESCONTO) || parseNfseNumber(rawData.DESCONTO_INCONDICIONADO) || 0;
  const issVal = parseNfseNumber(rawData.VALOR_ISS) || 0;
  const issBc = parseNfseNumber(rawData.BASE_CALCULO) || (valServ - valDed - valDesc);
  const aliqIss = parseNfseNumber(rawData.ALIQUOTA) || 0;

  const issRetidoStr = String(rawData.ISS_RETIDO || '').toUpperCase();
  const issRetido = issRetidoStr === '1' || issRetidoStr === 'SIM' || issRetidoStr === 'TRUE';
  const valIssRetido = parseNfseNumber(rawData.VALOR_ISS_RETIDO) || (issRetido ? issVal : 0);

  const pis = parseNfseNumber(rawData.VALOR_PIS) || parseNfseNumber(rawData.PIS) || 0;
  const cofins = parseNfseNumber(rawData.VALOR_COFINS) || parseNfseNumber(rawData.COFINS) || 0;
  const inss = parseNfseNumber(rawData.VALOR_INSS) || parseNfseNumber(rawData.INSS) || 0;
  const ir = parseNfseNumber(rawData.VALOR_IR) || parseNfseNumber(rawData.IRRF) || 0;
  const csll = parseNfseNumber(rawData.VALOR_CSLL) || parseNfseNumber(rawData.CSLL) || 0;
  const outrasRet = parseNfseNumber(rawData.OUTRAS_RETENCOES) || 0;

  const totalRetencoes = pis + cofins + inss + ir + csll + outrasRet + (issRetido ? issVal : 0);
  const totalTaxes = issVal + pis + cofins + inss + ir + csll + outrasRet;
  const totalVal = parseNfseNumber(rawData.VALOR_LIQUIDO) || (valServ - valDesc - totalRetencoes);

  return {
    id: crypto.randomUUID(),
    type: 'NFSE',
    accessKey,
    number,
    series,
    issueDate,
    status: 'VALID',
    verificationCode,
    serviceCode: rawData.CODIGO_SERVICO ? String(rawData.CODIGO_SERVICO) : undefined,
    cnaeCode: rawData.CNAE ? String(rawData.CNAE) : undefined,
    cityServiceCode: rawData.CODIGO_TRIBUTACAO_MUNICIPIO ? String(rawData.CODIGO_TRIBUTACAO_MUNICIPIO) : undefined,
    serviceDescription: descServ,
    serviceCity: rawData.CIDADE_PRESTACAO || undefined,
    additionalInfo: rawData.OUTRAS_INFORMACOES || rawData.OBSERVACOES || undefined,
    issuer: {
      name: issuerName,
      document: issuerDoc,
      im: rawData.INSC_MUNICIPAL_PRESTADOR ? String(rawData.INSC_MUNICIPAL_PRESTADOR) : undefined,
      ie: rawData.INSC_ESTADUAL_PRESTADOR ? String(rawData.INSC_ESTADUAL_PRESTADOR) : undefined,
      phone: rawData.TELEFONE_PRESTADOR ? String(rawData.TELEFONE_PRESTADOR) : undefined,
      email: rawData.EMAIL_PRESTADOR ? String(rawData.EMAIL_PRESTADOR) : undefined,
      address: issuerAddress,
    },
    recipient: {
      name: recipientName,
      document: recipientDoc,
      im: rawData.INSC_MUNICIPAL_TOMADOR ? String(rawData.INSC_MUNICIPAL_TOMADOR) : undefined,
      ie: rawData.INSC_ESTADUAL_TOMADOR ? String(rawData.INSC_ESTADUAL_TOMADOR) : undefined,
      phone: rawData.TELEFONE_TOMADOR ? String(rawData.TELEFONE_TOMADOR) : undefined,
      email: rawData.EMAIL_TOMADOR ? String(rawData.EMAIL_TOMADOR) : undefined,
      address: recipientAddress,
    },
    items: [
      {
        code: rawData.CODIGO_SERVICO ? String(rawData.CODIGO_SERVICO) : undefined,
        description: descServ,
        quantity: 1,
        unit: 'UN',
        unitPrice: valServ,
        totalPrice: valServ,
      }
    ],
    totals: {
      products: valServ,
      discount: valDesc,
      deductions: valDed,
      icmsBase: issBc,
      totalTaxes,
      taxes: {
        iss: issVal,
        issBase: issBc,
        issAliquot: aliqIss,
        issRetained: issRetido ? valIssRetido : 0,
        deductions: valDed,
        pis,
        cofins,
        inss,
        ir,
        csll,
        outrasRetencoes: outrasRet,
        totalTaxes,
      },
      total: totalVal,
    },
    rawXmlPath,
    batchId,
    createdAt: new Date(),
  };
}

