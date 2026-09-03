import { FiscalParser } from './base.parser';
import { FiscalDocument, Party, FiscalTotals, Address } from '../fiscal.types';
import crypto from 'crypto';

export class NFSeParser extends FiscalParser {
  parse(xmlContent: string, rawXmlPath: string, batchId?: string): FiscalDocument {
    const jsonObj = this.parseXml(xmlContent);

    // 1. Sefin Nacional / SPED (e.g. <NFSe><infNFSe> or <infNFSe>)
    const sefinInf = jsonObj.NFSe?.infNFSe || jsonObj.infNFSe;
    if (sefinInf) {
      return this.parseSefinNacional(sefinInf, rawXmlPath, batchId);
    }

    // 2. Municipal / XML Tag format (<Notas><xml>...)
    const notasXml = jsonObj.Notas?.xml || (jsonObj.Notas && !jsonObj.Notas.xml ? jsonObj.Notas : null);
    if (notasXml) {
      return this.parseMunicipalNotas(notasXml, rawXmlPath, batchId);
    }

    // 3. ABRASF Standard (CompNfse / ConsultarNfseResposta / Nfse / InfNfse)
    let nfse: any = null;
    if (jsonObj.CompNfse?.Nfse) {
      nfse = jsonObj.CompNfse.Nfse;
    } else if (jsonObj.ConsultarNfseResposta?.ListaNfse?.CompNfse?.Nfse) {
      nfse = jsonObj.ConsultarNfseResposta.ListaNfse.CompNfse.Nfse;
    } else if (jsonObj.Nfse) {
      nfse = jsonObj.Nfse;
    } else if (jsonObj.NFSe) {
      nfse = jsonObj.NFSe;
    }

    const inf: any = nfse?.InfNfse || nfse?.infNfse || nfse?.infNFSe || nfse;
    if (inf && (inf.Servico || inf.servico || inf.Numero || inf.nNFSe)) {
      return this.parseAbrasf(inf, rawXmlPath, batchId);
    }

    throw new Error('Formato NFS-e desconhecido: tags reconhecidas ausentes no XML.');
  }

  /**
   * Sefin Nacional / Padrão Nacional SPED NFS-e
   */
  private parseSefinNacional(inf: any, rawXmlPath: string, batchId?: string): FiscalDocument {
    const dps = inf.DPS?.infDPS || inf.infDPS || {};
    const emit = inf.emit || {};
    const toma = dps.toma || {};
    const serv = dps.serv || {};
    const cServ = serv.cServ || {};
    const locPrest = serv.locPrest || {};
    const valores = inf.valores || {};
    const dpsValores = dps.valores || {};
    const tribFed = valores.tribFed || dpsValores.tribFed || {};
    const tribMun = valores.tribMun || dpsValores.tribMun || {};

    const rawId = inf['@_Id'] || dps['@_Id'] || '';
    const accessKey = rawId ? String(rawId).replace(/^NFS/, '') : undefined;
    const number = inf.nNFSe ? String(inf.nNFSe) : (dps.nDPS ? String(dps.nDPS) : undefined);
    const series = dps.serie ? String(dps.serie) : undefined;
    const rpsNumber = dps.nDPS ? String(dps.nDPS) : undefined;
    const rpsSeries = dps.serie ? String(dps.serie) : undefined;
    const verificationCode = inf.cVerif || inf.cVerificacao || accessKey;
    
    let issueDate: Date | undefined;
    if (inf.dhProc) {
      issueDate = new Date(inf.dhProc);
    } else if (dps.dhEmi) {
      issueDate = new Date(dps.dhEmi);
    } else {
      issueDate = new Date();
    }

    const issuerName = emit.xNome || emit.xFant || 'PRESTADOR DE SERVIÇO';
    const issuerDoc = emit.CNPJ || emit.CPF || 'NÃO INFORMADO';
    const endEmit = emit.enderNac || emit.end;
    let issuerAddress: Address | undefined;
    if (endEmit) {
      issuerAddress = {
        street: endEmit.xLgr,
        number: endEmit.nro ? String(endEmit.nro) : undefined,
        complement: endEmit.xCpl,
        neighborhood: endEmit.xBairro,
        city: inf.xLocEmi || endEmit.cMun || endEmit.xMun,
        state: endEmit.UF,
        zipCode: endEmit.CEP ? String(endEmit.CEP) : undefined,
      };
    }

    const recipientName = toma.xNome || 'TOMADOR DO SERVIÇO';
    const recipientDoc = toma.CNPJ || toma.CPF || 'NÃO INFORMADO';
    const endToma = toma.end?.endNac || toma.end || toma.enderNac;
    let recipientAddress: Address | undefined;
    if (endToma) {
      recipientAddress = {
        street: endToma.xLgr,
        number: endToma.nro ? String(endToma.nro) : undefined,
        complement: endToma.xCpl,
        neighborhood: endToma.xBairro,
        city: endToma.cMun || endToma.xMun,
        state: endToma.UF,
        zipCode: endToma.CEP ? String(endToma.CEP) : undefined,
      };
    }

    const descServ = cServ.xDescServ || serv.xDiscriminacao || inf.xTribNac || 'Serviço Prestado';
    const valServ = this.parseNumber(dpsValores.vServPrest?.vServ) || this.parseNumber(valores.vServ) || this.parseNumber(valores.vLiq) || 0;
    const valDescIncond = this.parseNumber(valores.vDescIncond) || this.parseNumber(dpsValores.vDescIncond) || 0;
    const valDescCond = this.parseNumber(valores.vDescCond) || this.parseNumber(dpsValores.vDescCond) || 0;
    const valDed = this.parseNumber(valores.vDed) || this.parseNumber(dpsValores.vDed) || 0;

    const valIss = this.parseNumber(valores.vISSQN) || this.parseNumber(tribMun.vISSQN) || 0;
    const valBc = this.parseNumber(valores.vBC) || this.parseNumber(tribMun.vBC) || (valServ - valDescIncond - valDed);
    const aliqIss = this.parseNumber(valores.pAliq) || this.parseNumber(tribMun.pAliq) || 0;

    const tpRetISSQN = tribMun.tpRetISSQN || valores.tpRetISSQN;
    const issRetido = tpRetISSQN === '2' || tpRetISSQN === 2 || tpRetISSQN === '3' || tpRetISSQN === 3;
    const valIssRetido = issRetido ? (this.parseNumber(tribMun.vISSRet) || valIss) : 0;

    const pis = this.parseNumber(tribFed.vPIS) || this.parseNumber(tribFed.vRetPIS) || this.parseNumber(valores.vPIS) || 0;
    const cofins = this.parseNumber(tribFed.vCOFINS) || this.parseNumber(tribFed.vRetCOFINS) || this.parseNumber(valores.vCOFINS) || 0;
    const inss = this.parseNumber(tribFed.vINSS) || this.parseNumber(tribFed.vRetCP) || this.parseNumber(valores.vINSS) || 0;
    const ir = this.parseNumber(tribFed.vIRRF) || this.parseNumber(tribFed.vRetIRRF) || this.parseNumber(valores.vIR) || 0;
    const csll = this.parseNumber(tribFed.vCSLL) || this.parseNumber(tribFed.vRetCSLL) || this.parseNumber(valores.vCSLL) || 0;
    const outrasRet = this.parseNumber(valores.vOutrasRet) || 0;

    const totalRetencoes = pis + cofins + inss + ir + csll + outrasRet + (issRetido ? valIss : 0);
    const totalTaxes = valIss + pis + cofins + inss + ir + csll + outrasRet;
    const valTotal = this.parseNumber(valores.vLiq) || (valServ - valDescIncond - totalRetencoes);

    const optanteSN = emit.opSimpNac === '1' || emit.opSimpNac === 1 || emit.cRegTrib === '1' || emit.cRegTrib === 1;

    return {
      id: crypto.randomUUID(),
      type: 'NFSE',
      accessKey,
      number,
      series,
      issueDate,
      status: 'VALID',
      rpsNumber,
      rpsSeries,
      verificationCode,
      serviceCode: cServ.cTribNac || cServ.cNBS || undefined,
      cnaeCode: cServ.cCNAE || undefined,
      cityServiceCode: cServ.cTribMun || undefined,
      serviceDescription: descServ,
      serviceCity: locPrest.cMun || locPrest.xMun || undefined,
      optanteSimplesNacional: optanteSN,
      additionalInfo: inf.infAdic?.infCpl || inf.xOutrasInformacoes || undefined,
      issuer: {
        name: issuerName,
        document: issuerDoc,
        im: emit.IM ? String(emit.IM) : undefined,
        ie: emit.IE ? String(emit.IE) : undefined,
        phone: emit.fone ? String(emit.fone) : undefined,
        email: emit.email ? String(emit.email) : undefined,
        address: issuerAddress,
      },
      recipient: {
        name: recipientName,
        document: recipientDoc,
        im: toma.IM ? String(toma.IM) : undefined,
        ie: toma.IE ? String(toma.IE) : undefined,
        phone: toma.fone ? String(toma.fone) : undefined,
        email: toma.email ? String(toma.email) : undefined,
        address: recipientAddress,
      },
      items: [
        {
          code: cServ.cTribNac || cServ.cNBS || undefined,
          description: descServ,
          quantity: 1,
          unit: 'UN',
          unitPrice: valServ,
          totalPrice: valServ,
        }
      ],
      totals: {
        products: valServ,
        discount: valDescIncond,
        conditionalDiscount: valDescCond,
        unconditionalDiscount: valDescIncond,
        deductions: valDed,
        icmsBase: valBc,
        totalTaxes,
        taxes: {
          iss: valIss,
          issBase: valBc,
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
        total: valTotal || valServ,
      },
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }

  /**
   * Padrão Municipal / XML Simplificado (<Notas><xml>...)
   */
  private parseMunicipalNotas(data: any, rawXmlPath: string, batchId?: string): FiscalDocument {
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
    const valServ = this.parseNumber(rawData.VALOR_SERVICOS) || this.parseNumber(rawData.VALOR_TOTAL) || 0;
    const valDed = this.parseNumber(rawData.VALOR_DEDUCOES) || 0;
    const valDesc = this.parseNumber(rawData.DESCONTO) || this.parseNumber(rawData.DESCONTO_INCONDICIONADO) || 0;
    const issVal = this.parseNumber(rawData.VALOR_ISS) || 0;
    const issBc = this.parseNumber(rawData.BASE_CALCULO) || (valServ - valDed - valDesc);
    const aliqIss = this.parseNumber(rawData.ALIQUOTA) || 0;

    const issRetidoStr = String(rawData.ISS_RETIDO || '').toUpperCase();
    const issRetido = issRetidoStr === '1' || issRetidoStr === 'SIM' || issRetidoStr === 'TRUE';
    const valIssRetido = this.parseNumber(rawData.VALOR_ISS_RETIDO) || (issRetido ? issVal : 0);

    const pis = this.parseNumber(rawData.VALOR_PIS) || this.parseNumber(rawData.PIS) || 0;
    const cofins = this.parseNumber(rawData.VALOR_COFINS) || this.parseNumber(rawData.COFINS) || 0;
    const inss = this.parseNumber(rawData.VALOR_INSS) || this.parseNumber(rawData.INSS) || 0;
    const ir = this.parseNumber(rawData.VALOR_IR) || this.parseNumber(rawData.IRRF) || 0;
    const csll = this.parseNumber(rawData.VALOR_CSLL) || this.parseNumber(rawData.CSLL) || 0;
    const outrasRet = this.parseNumber(rawData.OUTRAS_RETENCOES) || 0;

    const totalRetencoes = pis + cofins + inss + ir + csll + outrasRet + (issRetido ? issVal : 0);
    const totalTaxes = issVal + pis + cofins + inss + ir + csll + outrasRet;
    const totalVal = this.parseNumber(rawData.VALOR_LIQUIDO) || (valServ - valDesc - totalRetencoes);

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

  /**
   * Padrão ABRASF
   */
  private parseAbrasf(inf: any, rawXmlPath: string, batchId?: string): FiscalDocument {
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

    const valServ = this.parseNumber(valores.ValorServicos) || this.parseNumber(valores.ValorLiquidoNfse) || this.parseNumber(inf.ValoresNfse?.BaseCalculo) || 0;
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
      issuer: this.parsePrestador(prestador),
      recipient: this.parseTomador(tomador),
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
      totals: this.parseTotals(valores, inf.ValoresNfse, valServ),
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }

  private parsePrestador(data: any): Party {
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

  private parseTomador(data: any): Party {
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

  private parseTotals(valores: any, valoresNfse?: any, defaultValServ = 0): FiscalTotals {
    const valServ = this.parseNumber(valores.ValorServicos) || this.parseNumber(valoresNfse?.BaseCalculo) || defaultValServ;
    const valDeducoes = this.parseNumber(valores.ValorDeducoes) || this.parseNumber(valoresNfse?.ValorDeducoes) || 0;
    const descIncond = this.parseNumber(valores.DescontoIncondicionado) || this.parseNumber(valoresNfse?.DescontoIncondicionado) || 0;
    const descCond = this.parseNumber(valores.DescontoCondicionado) || this.parseNumber(valoresNfse?.DescontoCondicionado) || 0;
    const desc = descIncond + descCond;

    const iss = this.parseNumber(valores.ValorIss) || this.parseNumber(valoresNfse?.ValorIss) || 0;
    const issRetidoVal = this.parseNumber(valores.ValorIssRetido) || this.parseNumber(valoresNfse?.ValorIssRetido) || 0;
    const issRetidoFlag = valores.IssRetido === '1' || valores.IssRetido === 1 || valores.IssRetido === 'SIM' || valores.IssRetido === true || valoresNfse?.IssRetido === '1' || valoresNfse?.IssRetido === 1;
    const issRetidoFinal = issRetidoVal > 0 ? issRetidoVal : (issRetidoFlag ? iss : 0);

    const issBase = this.parseNumber(valores.BaseCalculo) || this.parseNumber(valoresNfse?.BaseCalculo) || (valServ - valDeducoes - descIncond);
    const issAliquot = this.parseNumber(valores.Aliquota) || this.parseNumber(valoresNfse?.Aliquota) || 0;

    const pis = this.parseNumber(valores.ValorPis) || this.parseNumber(valores.vPIS) || this.parseNumber(valoresNfse?.ValorPis) || 0;
    const cofins = this.parseNumber(valores.ValorCofins) || this.parseNumber(valores.vCOFINS) || this.parseNumber(valoresNfse?.ValorCofins) || 0;
    const inss = this.parseNumber(valores.ValorInss) || this.parseNumber(valores.vINSS) || this.parseNumber(valoresNfse?.ValorInss) || 0;
    const ir = this.parseNumber(valores.ValorIr) || this.parseNumber(valores.ValorIrrf) || this.parseNumber(valores.vIRRF) || this.parseNumber(valoresNfse?.ValorIr) || 0;
    const csll = this.parseNumber(valores.ValorCsll) || this.parseNumber(valores.vCSLL) || this.parseNumber(valoresNfse?.ValorCsll) || 0;
    const outrasRet = this.parseNumber(valores.OutrasRetencoes) || this.parseNumber(valores.vOutrasRet) || this.parseNumber(valoresNfse?.OutrasRetencoes) || 0;

    const totalRetencoes = pis + cofins + inss + ir + csll + outrasRet + (issRetidoFlag || issRetidoFinal > 0 ? (issRetidoFinal || iss) : 0);
    const totalTaxes = (iss || issRetidoFinal) + pis + cofins + inss + ir + csll + outrasRet;
    const total = this.parseNumber(valores.ValorLiquidoNfse) || this.parseNumber(valoresNfse?.ValorLiquidoNfse) || (valServ - descIncond - totalRetencoes);

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

  private parseNumber(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const original = String(val).trim();
    if (original.includes(',') && original.includes('.')) {
      return parseFloat(original.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (original.includes(',')) {
      return parseFloat(original.replace(',', '.')) || 0;
    }
    return parseFloat(original) || 0;
  }
}


