import crypto from 'crypto';
import { FiscalDocument, Party, FiscalTotals, Address } from '../../fiscal.types';
import { parseNfseNumber } from './nfse-number.utils';

export function parsePrestador(data: any): Party {
  const id = data.IdentificacaoPrestador || data.identificacaoPrestador || {};
  const document = id.Cnpj ? String(id.Cnpj) : (id.Cpf ? String(id.Cpf) : (data.Cnpj ? String(data.Cnpj) : (data.Cpf ? String(data.Cpf) : 'NÃO INFORMADO')));
  const name = data.RazaoSocial || data.xNome || data.NomeFantasia || 'NÃO INFORMADO';
  const im = id.InscricaoMunicipal ? String(id.InscricaoMunicipal) : (data.InscricaoMunicipal ? String(data.InscricaoMunicipal) : undefined);
  const ie = id.InscricaoEstadual ? String(id.InscricaoEstadual) : (data.InscricaoEstadual ? String(data.InscricaoEstadual) : undefined);
  const contato = data.Contato || data.contato || {};
  const phone = contato.Telefone ? String(contato.Telefone) : (data.Telefone ? String(data.Telefone) : undefined);
  const email = contato.Email ? String(contato.Email) : (data.Email ? String(data.Email) : undefined);
  const end = data.Endereco || data.endereco;

  let address: Address | undefined;
  if (end) {
    address = {
      street: end.Endereco || end.xLgr,
      number: end.Numero ? String(end.Numero) : (end.nro ? String(end.nro) : undefined),
      complement: end.Complemento || end.xCpl,
      neighborhood: end.Bairro || end.xBairro,
      city: end.CodigoMunicipio ? String(end.CodigoMunicipio) : (end.xMun || end.Cidade),
      state: end.Uf || end.UF,
      zipCode: end.Cep ? String(end.Cep) : (end.CEP ? String(end.CEP) : undefined),
    };
  }
  return { name, document, im, ie, phone, email, address };
}

export function parseTomador(data: any): Party {
  const id = data.IdentificacaoTomador || data.identificacaoTomador || {};
  const idDoc = id.CpfCnpj || id.cpfCnpj || {};
  const document = idDoc.Cnpj ? String(idDoc.Cnpj) : (idDoc.Cpf ? String(idDoc.Cpf) : (data.Cnpj ? String(data.Cnpj) : (data.Cpf ? String(data.Cpf) : 'NÃO INFORMADO')));
  const name = data.RazaoSocial || data.xNome || 'NÃO INFORMADO';
  const im = id.InscricaoMunicipal ? String(id.InscricaoMunicipal) : (data.InscricaoMunicipal ? String(data.InscricaoMunicipal) : undefined);
  const ie = id.InscricaoEstadual ? String(id.InscricaoEstadual) : (data.InscricaoEstadual ? String(data.InscricaoEstadual) : undefined);
  const contato = data.Contato || data.contato || {};
  const phone = contato.Telefone ? String(contato.Telefone) : (data.Telefone ? String(data.Telefone) : undefined);
  const email = contato.Email ? String(contato.Email) : (data.Email ? String(data.Email) : undefined);
  const end = data.Endereco || data.endereco;

  let address: Address | undefined;
  if (end) {
    address = {
      street: end.Endereco || end.xLgr,
      number: end.Numero ? String(end.Numero) : (end.nro ? String(end.nro) : undefined),
      complement: end.Complemento || end.xCpl,
      neighborhood: end.Bairro || end.xBairro,
      city: end.CodigoMunicipio ? String(end.CodigoMunicipio) : (end.xMun || end.Cidade),
      state: end.Uf || end.UF,
      zipCode: end.Cep ? String(end.Cep) : (end.CEP ? String(end.CEP) : undefined),
    };
  }
  return { name, document, im, ie, phone, email, address };
}

export function parseTotals(valores: any, valoresNfse?: any, defaultValServ = 0): FiscalTotals {
  const valServ = parseNfseNumber(valores.ValorServicos) || parseNfseNumber(valoresNfse?.BaseCalculo) || defaultValServ;
  const valDeducoes = parseNfseNumber(valores.ValorDeducoes) || parseNfseNumber(valoresNfse?.ValorDeducoes) || 0;
  const descIncond = parseNfseNumber(valores.DescontoIncondicionado) || parseNfseNumber(valoresNfse?.DescontoIncondicionado) || 0;
  const descCond = parseNfseNumber(valores.DescontoCondicionado) || parseNfseNumber(valoresNfse?.DescontoCondicionado) || 0;
  const desc = descIncond + descCond;

  const iss = parseNfseNumber(valores.ValorIss) || parseNfseNumber(valoresNfse?.ValorIss) || 0;
  const issRetidoVal = parseNfseNumber(valores.ValorIssRetido) || parseNfseNumber(valoresNfse?.ValorIssRetido) || 0;
  const issRetidoFlag = valores.IssRetido === '1' || valores.IssRetido === 1 || valores.IssRetido === 'SIM' || valores.IssRetido === true || valoresNfse?.IssRetido === '1' || valoresNfse?.IssRetido === 1;
  const issRetidoFinal = issRetidoVal > 0 ? issRetidoVal : (issRetidoFlag ? iss : 0);

  const issBase = parseNfseNumber(valores.BaseCalculo) || parseNfseNumber(valoresNfse?.BaseCalculo) || (valServ - valDeducoes - descIncond);
  const issAliquot = parseNfseNumber(valores.Aliquota) || parseNfseNumber(valoresNfse?.Aliquota) || 0;

  const pis = parseNfseNumber(valores.ValorPis) || parseNfseNumber(valores.vPIS) || parseNfseNumber(valoresNfse?.ValorPis) || 0;
  const cofins = parseNfseNumber(valores.ValorCOFINS) || parseNfseNumber(valores.ValorCofins) || parseNfseNumber(valores.vCOFINS) || parseNfseNumber(valoresNfse?.ValorCofins) || 0;
  const inss = parseNfseNumber(valores.ValorInss) || parseNfseNumber(valores.vINSS) || parseNfseNumber(valoresNfse?.ValorInss) || 0;
  const ir = parseNfseNumber(valores.ValorIr) || parseNfseNumber(valores.ValorIrrf) || parseNfseNumber(valores.vIRRF) || parseNfseNumber(valoresNfse?.ValorIr) || 0;
  const csll = parseNfseNumber(valores.ValorCsll) || parseNfseNumber(valores.vCSLL) || parseNfseNumber(valoresNfse?.ValorCsll) || 0;
  const outrasRet = parseNfseNumber(valores.OutrasRetencoes) || parseNfseNumber(valores.vOutrasRet) || parseNfseNumber(valoresNfse?.OutrasRetencoes) || 0;

  const totalRetencoes = pis + cofins + inss + ir + csll + outrasRet + (issRetidoFlag || issRetidoFinal > 0 ? (issRetidoFinal || iss) : 0);
  const totalTaxes = (iss || issRetidoFinal) + pis + cofins + inss + ir + csll + outrasRet;
  const total = parseNfseNumber(valores.ValorLiquidoNfse) || parseNfseNumber(valoresNfse?.ValorLiquidoNfse) || (valServ - descIncond - totalRetencoes);

  return {
    products: valServ,
    discount: desc,
    conditionalDiscount: descCond,
    unconditionalDiscount: descIncond,
    deductions: valDeducoes,
    icmsBase: issBase,
    totalTaxes,
    taxes: {
      iss: iss || issRetidoFinal,
      issBase,
      issAliquot,
      issRetained: (issRetidoFlag || issRetidoFinal > 0) ? (issRetidoFinal || iss) : 0,
      deductions: valDeducoes,
      pis,
      cofins,
      inss,
      ir,
      csll,
      outrasRetencoes: outrasRet,
      totalTaxes,
    },
    total,
  };
}

/**
 * Padrão ABRASF
 */
export function parseAbrasf(inf: any, rawXmlPath: string, batchId?: string): FiscalDocument {
  const servico = inf.Servico || inf.servico || {};
  const valores = servico.Valores || servico.valores || {};
  const prestador = inf.PrestadorServico || inf.Prestador || inf.prestador || {};
  const tomador = inf.TomadorServico || inf.Tomador || inf.tomador || {};

  const number = inf.Numero || inf.nNFSe || (inf.IdentificacaoRps?.Numero ? String(inf.IdentificacaoRps.Numero) : undefined);
  const series = inf.IdentificacaoRps?.Serie ? String(inf.IdentificacaoRps.Serie) : undefined;
  const rpsNumber = inf.IdentificacaoRps?.Numero ? String(inf.IdentificacaoRps.Numero) : (inf.Rps?.IdentificacaoRps?.Numero ? String(inf.Rps.IdentificacaoRps.Numero) : undefined);
  const rpsSeries = inf.IdentificacaoRps?.Serie ? String(inf.IdentificacaoRps.Serie) : (inf.Rps?.IdentificacaoRps?.Serie ? String(inf.Rps.IdentificacaoRps.Serie) : undefined);
  const accessKey = inf.CodigoVerificacao ? String(inf.CodigoVerificacao) : (inf['@_Id'] ? String(inf['@_Id']).replace(/^NFS/, '') : undefined);
  const verificationCode = inf.CodigoVerificacao ? String(inf.CodigoVerificacao) : accessKey;

  const valServ = parseNfseNumber(valores.ValorServicos) || parseNfseNumber(valores.ValorLiquidoNfse) || parseNfseNumber(inf.ValoresNfse?.BaseCalculo) || 0;
  const descServ = servico.Discriminacao || servico.xDiscriminacao || 'Serviço Prestado';
  const cServ = servico.ItemListaServico ? String(servico.ItemListaServico) : undefined;
  const cCnae = servico.CodigoCnae ? String(servico.CodigoCnae) : undefined;
  const cTribMun = servico.CodigoTributacaoMunicipio ? String(servico.CodigoTributacaoMunicipio) : undefined;
  const municPrest = servico.MunicipioPrestacaoServico ? String(servico.MunicipioPrestacaoServico) : (servico.CodigoMunicipio ? String(servico.CodigoMunicipio) : undefined);

  const optanteSN = inf.OptanteSimplesNacional === '1' || inf.OptanteSimplesNacional === 1 || inf.OptanteSimplesNacional === 'SIM' || inf.OptanteSimplesNacional === true;
  const regimeEspecial = inf.RegimeEspecialTributacao ? String(inf.RegimeEspecialTributacao) : undefined;
  const exigibilidade = inf.ExigibilidadeISS ? String(inf.ExigibilidadeISS) : (servico.ExigibilidadeISS ? String(servico.ExigibilidadeISS) : undefined);

  return {
    id: crypto.randomUUID(),
    type: 'NFSE',
    accessKey,
    number: number ? String(number) : undefined,
    series,
    issueDate: inf.DataEmissao ? new Date(inf.DataEmissao) : new Date(),
    status: 'VALID',
    rpsNumber,
    rpsSeries,
    verificationCode,
    serviceCode: cServ,
    cnaeCode: cCnae,
    cityServiceCode: cTribMun,
    serviceDescription: descServ,
    serviceCity: municPrest,
    optanteSimplesNacional: optanteSN,
    regimeEspecialTributacao: regimeEspecial,
    exigibilidadeISS: exigibilidade,
    additionalInfo: inf.OutrasInformacoes || inf.outrasInformacoes || undefined,
    issuer: parsePrestador(prestador),
    recipient: parseTomador(tomador),
    items: [
      {
        code: cServ || cTribMun,
        description: descServ,
        quantity: 1,
        unit: 'UN',
        unitPrice: valServ,
        totalPrice: valServ,
      }
    ],
    totals: parseTotals(valores, inf.ValoresNfse, valServ),
    rawXmlPath,
    batchId,
    createdAt: new Date(),
  };
}

