import { escapeHtml } from '../../../api/utils/escapeHtml';
import {
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../helpers';

/** NFS-e — DANFSE (Documento Auxiliar da Nota Fiscal de Serviços Eletrônica, padrão oficial) */
export function renderDanfeNFSeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  // Emitente / Prestador
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

  // Tomador
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

  // Serviço
  const serviceCode = doc.serviceCode || doc.items?.[0]?.code || '-';
  const cnaeCode = doc.cnaeCode || '-';
  const serviceCity = doc.serviceCity || issuerCity;
  const serviceDescription = doc.serviceDescription || doc.items?.[0]?.description || '-';

  // Numeração e datas
  const number = doc.number || '000.000';
  const rpsNumber = doc.rpsNumber || '-';
  const rpsSeries = doc.rpsSeries || '-';
  const verificationCode = doc.verificationCode || doc.accessKey || '-';
  const issueDateStr = doc.issueDate ? formatDate(doc.issueDate) : '-';
  const issueTimeStr = doc.issueDate ? formatTime(doc.issueDate) : '';

  // Valores reais
  const taxesObj = doc.totals?.taxes || {};
  const valorServicos = doc.totals?.products ?? doc.totalAmount ?? 0;
  const deducoes = doc.totals?.deductions ?? taxesObj.deductions ?? 0;
  const descIncond = doc.totals?.unconditionalDiscount ?? doc.totals?.discount ?? 0;
  const descCond = doc.totals?.conditionalDiscount ?? 0;

  const issValor = taxesObj.iss ?? (doc.taxes?.find((t: any) => t.taxType === 'ISS')?.amount ?? 0);
  const issBase = taxesObj.issBase ?? doc.totals?.icmsBase ?? (valorServicos - deducoes - descIncond);
  const issAliquot = taxesObj.issAliquot !== undefined && taxesObj.issAliquot !== null ? Number(taxesObj.issAliquot) : (doc.issAliquot ? Number(doc.issAliquot) : null);
  
  const issRetidoValor = typeof taxesObj.issRetained === 'number' ? taxesObj.issRetained : (taxesObj.issRetained ? issValor : 0);
  const isIssRetido = issRetidoValor > 0 || taxesObj.issRetained === true || doc.issRetained === true;

  // Retenções
  const pis = taxesObj.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount ?? 0);
  const cofins = taxesObj.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount ?? 0);
  const inss = taxesObj.inss ?? (doc.taxes?.find((t: any) => t.taxType === 'INSS')?.amount ?? 0);
  const ir = taxesObj.ir ?? (doc.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount ?? 0);
  const csll = taxesObj.csll ?? (doc.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount ?? 0);
  const outrasRet = taxesObj.outrasRetencoes ?? 0;

  const totalRetencoesFederais = pis + cofins + inss + ir + csll + outrasRet;
  const totalRetencoesGeral = totalRetencoesFederais + (isIssRetido ? (issRetidoValor || issValor) : 0);
  const valorLiquido = doc.totals?.total ?? (doc.totalAmount || (valorServicos - descIncond - totalRetencoesGeral));

  const optanteSimples = doc.optanteSimplesNacional;
  const regimeEspecial = doc.regimeEspecialTributacao;
  const exigibilidade = doc.exigibilidadeISS;

  return `
    <div class="danfe-page">
      <div class="danfe-box" style="font-size: 8px; line-height: 1.2;">
        <!-- Cabeçalho Oficial -->
        <div style="display: flex; border-bottom: 1px solid #000;">
          <div style="width: 65%; padding: 6px; border-right: 1px solid #000;">
            <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #444;">PREFEITURA MUNICIPAL DE ${escapeHtml(issuerCity.toUpperCase())}</div>
            <div style="font-size: 8px; font-weight: 600; text-transform: uppercase; color: #555;">SECRETARIA MUNICIPAL DE FINANÇAS E TRIBUTAÇÃO</div>
            <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin-top: 2px;">NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e</div>
            <div style="font-size: 7.5px; color: #666; margin-top: 1px;">Documento Auxiliar da NFS-e (Padrão Nacional / ABRASF)</div>
          </div>
          <div style="width: 35%; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
              <span style="font-weight: bold; color: #555;">NÚMERO DA NFS-e:</span>
              <span style="font-size: 13px; font-weight: 900; font-family: monospace;">${escapeHtml(number)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 2px;">
              <span style="color: #555;">EMISSÃO:</span>
              <span style="font-weight: bold;">${escapeHtml(issueDateStr)} ${escapeHtml(issueTimeStr !== '--:--' ? issueTimeStr : '')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #555;">COMPETÊNCIA:</span>
              <span style="font-weight: bold;">${escapeHtml(issueDateStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #555;">RPS Nº:</span>
              <span style="font-weight: bold; font-family: monospace;">${escapeHtml(rpsNumber)} ${rpsSeries !== '-' ? `Série ${escapeHtml(rpsSeries)}` : ''}</span>
            </div>
          </div>
        </div>

        <!-- Código de Verificação -->
        <div style="border-bottom: 1px solid #000; padding: 3px 6px; background: #f5f5f5; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: bold; color: #555;">CÓDIGO DE VERIFICAÇÃO DE AUTENTICIDADE: </span>
            <span style="font-family: monospace; font-weight: bold; font-size: 9.5px; letter-spacing: 0.5px;">${escapeHtml(verificationCode)}</span>
          </div>
          <div style="font-size: 7px; color: #666;">Consulte a autenticidade no portal da Prefeitura</div>
        </div>

        <!-- Prestador de Serviços -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">PRESTADOR DE SERVIÇOS</div>
          <div style="padding: 4px 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${escapeHtml(issuerName)}</div>
              <div style="font-family: monospace; font-size: 9px;"><b>CNPJ/CPF:</b> ${escapeHtml(issuerDoc)}</div>
            </div>
            <div class="grid" style="border-top: 1px solid #eee; padding-top: 2px; font-size: 7.5px;">
              <div style="width: 50%;"><b>Endereço:</b> ${escapeHtml(issuerStreet)}</div>
              <div style="width: 25%;"><b>Bairro:</b> ${escapeHtml(issuerBairro)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(issuerCep)}</div>
            </div>
            <div class="grid" style="font-size: 7.5px;">
              <div style="width: 28%;"><b>Município/UF:</b> ${escapeHtml(issuerCity)} / ${escapeHtml(issuerState)}</div>
              <div style="width: 24%;"><b>Insc. Municipal:</b> ${escapeHtml(issuerIM)}</div>
              <div style="width: 24%;"><b>Insc. Estadual:</b> ${escapeHtml(issuerIE)}</div>
              <div style="width: 24%;"><b>Telefone:</b> ${escapeHtml(issuerPhone)}</div>
            </div>
            ${issuerEmail !== '-' ? `<div style="font-size: 7.5px;"><b>E-mail:</b> ${escapeHtml(issuerEmail)}</div>` : ''}
          </div>
        </div>

        <!-- Tomador de Serviços -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">TOMADOR DE SERVIÇOS</div>
          <div style="padding: 4px 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">${escapeHtml(recipientName)}</div>
              <div style="font-family: monospace; font-size: 9px;"><b>CNPJ/CPF:</b> ${escapeHtml(recipientDoc)}</div>
            </div>
            <div class="grid" style="border-top: 1px solid #eee; padding-top: 2px; font-size: 7.5px;">
              <div style="width: 50%;"><b>Endereço:</b> ${escapeHtml(recipientStreet)}</div>
              <div style="width: 25%;"><b>Bairro:</b> ${escapeHtml(recipientBairro)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(recipientCep)}</div>
            </div>
            <div class="grid" style="font-size: 7.5px;">
              <div style="width: 28%;"><b>Município/UF:</b> ${escapeHtml(recipientCity)} / ${escapeHtml(recipientState)}</div>
              <div style="width: 24%;"><b>Insc. Municipal:</b> ${escapeHtml(recipientIM)}</div>
              <div style="width: 24%;"><b>Insc. Estadual:</b> ${escapeHtml(recipientIE)}</div>
              <div style="width: 24%;"><b>Telefone:</b> ${escapeHtml(recipientPhone)}</div>
            </div>
            ${recipientEmail !== '-' ? `<div style="font-size: 7.5px;"><b>E-mail:</b> ${escapeHtml(recipientEmail)}</div>` : ''}
          </div>
        </div>

        <!-- Discriminação dos Serviços -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">DISCRIMINAÇÃO DOS SERVIÇOS</div>
          <div style="padding: 6px; min-height: 80px; white-space: pre-wrap; font-family: monospace; font-size: 8px; line-height: 1.3;">${escapeHtml(serviceDescription)}</div>
          <div class="grid" style="border-top: 1px solid #ddd; padding: 3px 6px; background: #fafafa; font-size: 7.5px;">
            <div style="width: 33%;"><b>Item LC 116/2003:</b> ${escapeHtml(serviceCode)}</div>
            <div style="width: 33%;"><b>Cód. CNAE:</b> ${escapeHtml(cnaeCode)}</div>
            <div style="width: 34%;"><b>Município de Prestação:</b> ${escapeHtml(serviceCity)}</div>
          </div>
        </div>

        <!-- Retenções de Tributos na Fonte -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">RETENÇÕES DE TRIBUTOS NA FONTE</div>
          <div class="grid text-center" style="border-bottom: 1px solid #ddd; font-size: 7.5px;">
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">PIS (R$)</div><div style="font-weight: bold; margin-top: 1px;">${pis > 0 ? pis.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">COFINS (R$)</div><div style="font-weight: bold; margin-top: 1px;">${cofins > 0 ? cofins.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">INSS (R$)</div><div style="font-weight: bold; margin-top: 1px;">${inss > 0 ? inss.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">IRRF (R$)</div><div style="font-weight: bold; margin-top: 1px;">${ir > 0 ? ir.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">CSLL (R$)</div><div style="font-weight: bold; margin-top: 1px;">${csll > 0 ? csll.toFixed(2) : '-'}</div></div>
            <div style="width: 16.7%; padding: 3px;"><div style="color: #555; font-weight: bold;">OUTRAS RET. (R$)</div><div style="font-weight: bold; margin-top: 1px;">${outrasRet > 0 ? outrasRet.toFixed(2) : '-'}</div></div>
          </div>
          <div style="padding: 3px 6px; background: #fafafa; display: flex; justify-content: space-between; font-size: 7.5px;">
            <span><b>ISS Retido na Fonte:</b> ${isIssRetido ? `SIM (${(issRetidoValor || issValor).toFixed(2)})` : 'NÃO'}</span>
            <span><b>Total de Retenções na Fonte:</b> <b>R$ ${totalRetencoesGeral.toFixed(2)}</b></span>
          </div>
        </div>

        <!-- Cálculo do ISSQN e Valor Total -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">CÁLCULO DO ISSQN E VALOR TOTAL</div>
          <div class="grid text-right" style="border-bottom: 1px solid #ddd; font-size: 7.5px;">
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">VALOR SERVIÇOS</div><div style="font-weight: bold;">${valorServicos.toFixed(2)}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">DEDUÇÕES LEGAIS</div><div style="font-weight: bold;">${deducoes > 0 ? deducoes.toFixed(2) : '0,00'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">DESC. INCOND.</div><div style="font-weight: bold;">${descIncond > 0 ? descIncond.toFixed(2) : '0,00'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">BASE CÁLCULO</div><div style="font-weight: bold;">${issBase.toFixed(2)}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd; text-align: center;"><div style="color: #555; font-weight: bold;">ALÍQUOTA</div><div style="font-weight: bold;">${issAliquot !== null ? `${issAliquot.toFixed(2)}%` : '-'}</div></div>
            <div style="width: 16.7%; padding: 3px;"><div style="text-align: left; color: #555; font-weight: bold;">VALOR DO ISS</div><div style="font-weight: bold;">${issValor > 0 ? issValor.toFixed(2) : '0,00'}</div></div>
          </div>
          <div class="grid" style="padding: 4px 6px; background: #f0f4f8; align-items: center;">
            <div style="width: 50%; font-size: 7.5px;">
              <div><b>(-) Total Retenções:</b> R$ ${totalRetencoesGeral.toFixed(2)}</div>
              ${descCond > 0 ? `<div><b>(-) Desc. Condicionado:</b> R$ ${descCond.toFixed(2)}</div>` : ''}
            </div>
            <div style="width: 50%; text-align: right;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; margin-right: 6px;">VALOR LÍQUIDO DA NFS-e:</span>
              <span style="font-size: 13px; font-weight: 900; font-family: monospace;">R$ ${valorLiquido.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Outras Informações -->
        <div style="padding: 4px 6px; font-size: 7.5px;">
          <div style="font-weight: bold; text-transform: uppercase; color: #444; margin-bottom: 2px;">OUTRAS INFORMAÇÕES</div>
          <div style="color: #444; line-height: 1.3;">
            ${optanteSimples !== undefined ? `<div><b>Regime de Tributação:</b> ${optanteSimples ? 'Optante pelo Simples Nacional' : 'Tributação Normal'}</div>` : ''}
            ${regimeEspecial ? `<div><b>Regime Especial de Tributação:</b> ${escapeHtml(regimeEspecial)}</div>` : ''}
            ${exigibilidade ? `<div><b>Exigibilidade do ISS:</b> ${escapeHtml(exigibilidade)}</div>` : ''}
            ${doc.additionalInfo ? `<div style="white-space: pre-wrap; margin-top: 2px; border-top: 1px solid #eee; padding-top: 2px;">${escapeHtml(doc.additionalInfo)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

