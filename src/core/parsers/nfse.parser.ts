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
    let nfse = null;
    if (jsonObj.CompNfse?.Nfse) {
      nfse = jsonObj.CompNfse.Nfse;
    } else if (jsonObj.ConsultarNfseResposta?.ListaNfse?.CompNfse?.Nfse) {
      nfse = jsonObj.ConsultarNfseResposta.ListaNfse.CompNfse.Nfse;
    } else if (jsonObj.Nfse) {
      nfse = jsonObj.Nfse;
    } else if (jsonObj.NFSe) {
      nfse = jsonObj.NFSe;
    }

    const inf = nfse?.InfNfse || nfse?.infNfse || nfse?.infNFSe || nfse;
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
    const valores = inf.valores || {};
    const dpsValores = dps.valores || {};

    const rawId = inf['@_Id'] || dps['@_Id'] || '';
    const accessKey = rawId ? String(rawId).replace(/^NFS/, '') : undefined;
    const number = inf.nNFSe ? String(inf.nNFSe) : (dps.nDPS ? String(dps.nDPS) : undefined);
    const series = dps.serie ? String(dps.serie) : undefined;
    
    let issueDate: Date | undefined;
    if (inf.dhProc) {
      issueDate = new Date(inf.dhProc);
    } else if (dps.dhEmi) {
      issueDate = new Date(dps.dhEmi);
    } else {
      issueDate = new Date();
    }

    const issuerName = emit.xNome || 'PRESTADOR DE SERVIÇO';
    const issuerDoc = emit.CNPJ || emit.CPF || 'NÃO INFORMADO';
    const endEmit = emit.enderNac || emit.end;
    let issuerAddress: Address | undefined;
    if (endEmit) {
      issuerAddress = {
        street: endEmit.xLgr,
        number: endEmit.nro,
        complement: endEmit.xCpl,
        neighborhood: endEmit.xBairro,
        city: inf.xLocEmi || endEmit.cMun || endEmit.xMun,
        state: endEmit.UF,
        zipCode: endEmit.CEP,
      };
    }

    const recipientName = toma.xNome || 'TOMADOR DO SERVIÇO';
    const recipientDoc = toma.CNPJ || toma.CPF || 'NÃO INFORMADO';
    const endToma = toma.end?.endNac || toma.end || toma.enderNac;
    let recipientAddress: Address | undefined;
    if (endToma) {
      recipientAddress = {
        street: endToma.xLgr,
        number: endToma.nro,
        complement: endToma.xCpl,
        neighborhood: endToma.xBairro,
        city: endToma.cMun || endToma.xMun,
        state: endToma.UF,
        zipCode: endToma.CEP,
      };
    }

    const descServ = cServ.xDescServ || inf.xTribNac || 'Serviço Prestado';
    const valTotal = this.parseNumber(valores.vLiq) || this.parseNumber(dpsValores.vServPrest?.vServ) || this.parseNumber(valores.vBC) || 0;
    const valIss = this.parseNumber(valores.vISSQN) || 0;
    const valBc = this.parseNumber(valores.vBC) || valTotal;

    return {
      id: crypto.randomUUID(),
      type: 'NFSE',
      accessKey,
      number,
      series,
      issueDate,
      status: 'VALID',
      issuer: {
        name: issuerName,
        document: issuerDoc,
        address: issuerAddress,
      },
      recipient: {
        name: recipientName,
        document: recipientDoc,
        address: recipientAddress,
      },
      items: [
        {
          code: cServ.cTribNac || cServ.cNBS || undefined,
          description: descServ,
          quantity: 1,
          unitPrice: valTotal,
          totalPrice: valTotal,
        }
      ],
      totals: {
        products: valTotal,
        discount: 0,
        taxes: {
          iss: valIss,
        },
        total: valTotal,
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

    let issueDate: Date | undefined;
    if (rawData.DATA_EMISSAO) {
      // Typically DD/MM/YYYY or YYYY-MM-DD
      const dateParts = String(rawData.DATA_EMISSAO).split('/');
      if (dateParts.length === 3) {
        issueDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else {
        issueDate = new Date(rawData.DATA_EMISSAO);
      }
    } else {
      issueDate = new Date();
    }

    const issuerName = rawData.NOME_PRESTADOR || 'PRESTADOR DE SERVIÇO';
    const issuerDoc = rawData.CPFCNPJ_PRESTADOR || 'NÃO INFORMADO';
    const issuerAddress: Address = {
      street: rawData.ENDERECO_PRESTADOR,
      number: rawData.NO_ENDERECO_PRESTADOR,
      neighborhood: rawData.BAIRRO_PRESTADOR,
      city: rawData.NOME_CIDADE_PRESTADOR,
      state: rawData.ESTADO_PRESTADOR,
      zipCode: rawData.CEP_PRESTADOR,
    };

    const recipientName = rawData.NOME_TOMADOR || 'TOMADOR DO SERVIÇO';
    const recipientDoc = rawData.CPFCNPJ_TOMADOR || 'NÃO INFORMADO';
    const recipientAddress: Address = {
      street: rawData.ENDERECO_E_CEP_TOMADOR,
      number: rawData.NO_ENDERECO_TOMADOR,
      neighborhood: rawData.BAIRRO_TOMADOR,
      city: rawData.NOME_MUNICIPIO_TOMADOR,
      zipCode: rawData.CEP_TOMADOR,
    };

    const descServ = rawData.COMPLEMENTO
      ? `${rawData.DISCRIMINACAO_DOS_SERVICOS || 'Serviços'} - ${rawData.COMPLEMENTO}`
      : (rawData.DISCRIMINACAO_DOS_SERVICOS || 'Serviços Prestados');

    const totalVal = this.parseNumber(rawData.VALOR_DOS_SERVICOS) || 0;
    const issVal = this.parseNumber(rawData.VL_ISS) || 0;

    return {
      id: crypto.randomUUID(),
      type: 'NFSE',
      accessKey,
      number,
      series,
      issueDate,
      status: 'VALID',
      issuer: {
        name: issuerName,
        document: issuerDoc,
        address: issuerAddress,
      },
      recipient: {
        name: recipientName,
        document: recipientDoc,
        address: recipientAddress,
      },
      items: [
        {
          code: rawData.CODIGO_SERVICO || undefined,
          description: descServ,
          quantity: 1,
          unitPrice: totalVal,
          totalPrice: totalVal,
        }
      ],
      totals: {
        products: totalVal,
        discount: 0,
        taxes: {
          iss: issVal,
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
    const accessKey = inf.CodigoVerificacao ? String(inf.CodigoVerificacao) : (inf['@_Id'] ? String(inf['@_Id']).replace(/^NFS/, '') : undefined);

    const valServ = this.parseNumber(valores.ValorServicos) || this.parseNumber(valores.ValorLiquidoNfse) || 0;

    return {
      id: crypto.randomUUID(),
      type: 'NFSE',
      accessKey,
      number: number ? String(number) : undefined,
      series,
      issueDate: inf.DataEmissao ? new Date(inf.DataEmissao) : new Date(),
      status: 'VALID',
      issuer: this.parsePrestador(prestador),
      recipient: this.parseTomador(tomador),
      items: [
        {
          description: servico.Discriminacao || 'Serviço Prestado',
          quantity: 1,
          unitPrice: valServ,
          totalPrice: valServ,
        }
      ],
      totals: this.parseTotals(valores),
      rawXmlPath,
      batchId,
      createdAt: new Date(),
    };
  }

  private parsePrestador(data: any): Party {
    const id = data.IdentificacaoPrestador || data.identificacaoPrestador || {};
    const document = id.Cnpj || id.Cpf || data.Cnpj || data.Cpf || 'NÃO INFORMADO';
    const name = data.RazaoSocial || data.xNome || 'NÃO INFORMADO';
    const end = data.Endereco || data.endereco;

    let address: Address | undefined;
    if (end) {
      address = {
        street: end.Endereco || end.xLgr,
        number: end.Numero || end.nro,
        complement: end.Complemento || end.xCpl,
        neighborhood: end.Bairro || end.xBairro,
        city: end.CodigoMunicipio || end.xMun,
        state: end.Uf || end.UF,
        zipCode: end.Cep || end.CEP,
      };
    }
    return { name, document, address };
  }

  private parseTomador(data: any): Party {
    const id = data.IdentificacaoTomador || data.identificacaoTomador || {};
    const idDoc = id.CpfCnpj || id.cpfCnpj || {};
    const document = idDoc.Cnpj || idDoc.Cpf || data.Cnpj || data.Cpf || 'NÃO INFORMADO';
    const name = data.RazaoSocial || data.xNome || 'NÃO INFORMADO';
    const end = data.Endereco || data.endereco;

    let address: Address | undefined;
    if (end) {
      address = {
        street: end.Endereco || end.xLgr,
        number: end.Numero || end.nro,
        complement: end.Complemento || end.xCpl,
        neighborhood: end.Bairro || end.xBairro,
        city: end.CodigoMunicipio || end.xMun,
        state: end.Uf || end.UF,
        zipCode: end.Cep || end.CEP,
      };
    }
    return { name, document, address };
  }

  private parseTotals(valores: any): FiscalTotals {
    const valServ = this.parseNumber(valores.ValorServicos) || 0;
    const desc = (this.parseNumber(valores.DescontoIncondicionado) || 0) + (this.parseNumber(valores.DescontoCondicionado) || 0);
    const iss = this.parseNumber(valores.ValorIss) || 0;
    const pis = this.parseNumber(valores.ValorPis) || 0;
    const cofins = this.parseNumber(valores.ValorCofins) || 0;
    const total = this.parseNumber(valores.ValorLiquidoNfse) || valServ;

    return {
      products: valServ,
      discount: desc,
      taxes: {
        iss,
        pis,
        cofins,
      },
      total,
    };
  }

  private parseNumber(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(/\./g, '').replace(',', '.');
    // If original string had dots for decimal (e.g. "1621.00"), the above replace turned it to "162100"
    // Let's handle both "1621.00" and "1.621,00" cleanly:
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

