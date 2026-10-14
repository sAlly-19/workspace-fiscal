import { escapeHtml } from '../helpers';
import { buildNfseViewModel } from '../view-models/nfse.view-model';

/** NFS-e — DANFSE (Documento Auxiliar da Nota Fiscal de Serviços Eletrônica, padrão oficial) */
export function renderDanfeNFSeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  const vm = buildNfseViewModel(doc);

  const optanteSimples = doc.optanteSimplesNacional;
  const regimeEspecial = doc.regimeEspecialTributacao;
  const exigibilidade = doc.exigibilidadeISS;

  return `
    <div class="danfe-page">
      <div class="danfe-box" style="font-size: 8px; line-height: 1.2;">
        <!-- Cabeçalho Oficial -->
        <div style="display: flex; border-bottom: 1px solid #000;">
          <div style="width: 65%; padding: 6px; border-right: 1px solid #000;">
            <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #444;">PREFEITURA MUNICIPAL DE ${escapeHtml(vm.issuerCity.toUpperCase())}</div>
            <div style="font-size: 8px; font-weight: 600; text-transform: uppercase; color: #555;">SECRETARIA MUNICIPAL DE FINANÇAS E TRIBUTAÇÃO</div>
            <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; margin-top: 2px;">NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e</div>
            <div style="font-size: 7.5px; color: #666; margin-top: 1px;">Documento Auxiliar da NFS-e (Padrão Nacional / ABRASF)</div>
          </div>
          <div style="width: 35%; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
              <span style="font-weight: bold; color: #555;">NÚMERO DA NFS-e:</span>
              <span style="font-size: 13px; font-weight: 900; font-family: monospace;">${escapeHtml(vm.number)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 2px;">
              <span style="color: #555;">EMISSÃO:</span>
              <span style="font-weight: bold;">${escapeHtml(vm.issueDateStr)} ${escapeHtml(vm.issueTimeStr !== '--:--' ? vm.issueTimeStr : '')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #555;">COMPETÊNCIA:</span>
              <span style="font-weight: bold;">${escapeHtml(vm.issueDateStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #555;">RPS Nº:</span>
              <span style="font-weight: bold; font-family: monospace;">${escapeHtml(vm.rpsNumber)} ${vm.rpsSeries !== '-' ? `Série ${escapeHtml(vm.rpsSeries)}` : ''}</span>
            </div>
          </div>
        </div>

        <!-- Código de Verificação -->
        <div style="border-bottom: 1px solid #000; padding: 3px 6px; background: #f5f5f5; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: bold; color: #555;">CÓDIGO DE VERIFICAÇÃO DE AUTENTICIDADE: </span>
            <span style="font-family: monospace; font-weight: bold; font-size: 9.5px; letter-spacing: 0.5px;">${escapeHtml(vm.verificationCode)}</span>
          </div>
          <div style="font-size: 7px; color: #666;">Consulte a autenticidade no portal da Prefeitura</div>
        </div>

        <!-- Prestador de Serviços -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">PRESTADOR DE SERVIÇOS</div>
          <div style="padding: 4px 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${escapeHtml(vm.issuerName)}</div>
              <div style="font-family: monospace; font-size: 9px;"><b>CNPJ/CPF:</b> ${escapeHtml(vm.issuerDoc)}</div>
            </div>
            <div class="grid" style="border-top: 1px solid #eee; padding-top: 2px; font-size: 7.5px;">
              <div style="width: 50%;"><b>Endereço:</b> ${escapeHtml(vm.issuerStreet)}</div>
              <div style="width: 25%;"><b>Bairro:</b> ${escapeHtml(vm.issuerBairro)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(vm.issuerCep)}</div>
            </div>
            <div class="grid" style="font-size: 7.5px;">
              <div style="width: 28%;"><b>Município/UF:</b> ${escapeHtml(vm.issuerCity)} / ${escapeHtml(vm.issuerState)}</div>
              <div style="width: 24%;"><b>Insc. Municipal:</b> ${escapeHtml(vm.issuerIM)}</div>
              <div style="width: 24%;"><b>Insc. Estadual:</b> ${escapeHtml(vm.issuerIE)}</div>
              <div style="width: 24%;"><b>Telefone:</b> ${escapeHtml(vm.issuerPhone)}</div>
            </div>
            ${vm.issuerEmail !== '-' ? `<div style="font-size: 7.5px;"><b>E-mail:</b> ${escapeHtml(vm.issuerEmail)}</div>` : ''}
          </div>
        </div>

        <!-- Tomador de Serviços -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">TOMADOR DE SERVIÇOS</div>
          <div style="padding: 4px 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase;">${escapeHtml(vm.recipientName)}</div>
              <div style="font-family: monospace; font-size: 9px;"><b>CNPJ/CPF:</b> ${escapeHtml(vm.recipientDoc)}</div>
            </div>
            <div class="grid" style="border-top: 1px solid #eee; padding-top: 2px; font-size: 7.5px;">
              <div style="width: 50%;"><b>Endereço:</b> ${escapeHtml(vm.recipientStreet)}</div>
              <div style="width: 25%;"><b>Bairro:</b> ${escapeHtml(vm.recipientBairro)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(vm.recipientCep)}</div>
            </div>
            <div class="grid" style="font-size: 7.5px;">
              <div style="width: 28%;"><b>Município/UF:</b> ${escapeHtml(vm.recipientCity)} / ${escapeHtml(vm.recipientState)}</div>
              <div style="width: 24%;"><b>Insc. Municipal:</b> ${escapeHtml(vm.recipientIM)}</div>
              <div style="width: 24%;"><b>Insc. Estadual:</b> ${escapeHtml(vm.recipientIE)}</div>
              <div style="width: 24%;"><b>Telefone:</b> ${escapeHtml(vm.recipientPhone)}</div>
            </div>
            ${vm.recipientEmail !== '-' ? `<div style="font-size: 7.5px;"><b>E-mail:</b> ${escapeHtml(vm.recipientEmail)}</div>` : ''}
          </div>
        </div>

        <!-- Discriminação dos Serviços -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">DISCRIMINAÇÃO DOS SERVIÇOS</div>
          <div style="padding: 6px; min-height: 80px; white-space: pre-wrap; font-family: monospace; font-size: 8px; line-height: 1.3;">${escapeHtml(vm.serviceDescription)}</div>
          <div class="grid" style="border-top: 1px solid #ddd; padding: 3px 6px; background: #fafafa; font-size: 7.5px;">
            <div style="width: 33%;"><b>Item LC 116/2003:</b> ${escapeHtml(vm.serviceCode)}</div>
            <div style="width: 33%;"><b>Cód. CNAE:</b> ${escapeHtml(vm.cnaeCode)}</div>
            <div style="width: 34%;"><b>Município de Prestação:</b> ${escapeHtml(vm.serviceCity)}</div>
          </div>
        </div>

        <!-- Retenções de Tributos na Fonte -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">RETENÇÕES DE TRIBUTOS NA FONTE</div>
          <div class="grid text-center" style="border-bottom: 1px solid #ddd; font-size: 7.5px;">
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">PIS (R$)</div><div style="font-weight: bold; margin-top: 1px;">${vm.pisValor > 0 ? vm.pisValor.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">COFINS (R$)</div><div style="font-weight: bold; margin-top: 1px;">${vm.cofinsValor > 0 ? vm.cofinsValor.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">INSS (R$)</div><div style="font-weight: bold; margin-top: 1px;">${vm.inssValor > 0 ? vm.inssValor.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">IRRF (R$)</div><div style="font-weight: bold; margin-top: 1px;">${vm.irValor > 0 ? vm.irValor.toFixed(2) : '-'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="color: #555; font-weight: bold;">CSLL (R$)</div><div style="font-weight: bold; margin-top: 1px;">${vm.csllValor > 0 ? vm.csllValor.toFixed(2) : '-'}</div></div>
            <div style="width: 16.7%; padding: 3px;"><div style="color: #555; font-weight: bold;">OUTRAS RET. (R$)</div><div style="font-weight: bold; margin-top: 1px;">${vm.outrasRetencoes > 0 ? vm.outrasRetencoes.toFixed(2) : '-'}</div></div>
          </div>
          <div style="padding: 3px 6px; background: #fafafa; display: flex; justify-content: space-between; font-size: 7.5px;">
            <span><b>ISS Retido na Fonte:</b> ${vm.isIssRetido ? `SIM (${(vm.issRetidoValor || vm.issValor).toFixed(2)})` : 'NÃO'}</span>
            <span><b>Total de Retenções na Fonte:</b> <b>R$ ${vm.totalRetencoes.toFixed(2)}</b></span>
          </div>
        </div>

        <!-- Cálculo do ISSQN e Valor Total -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">CÁLCULO DO ISSQN E VALOR TOTAL</div>
          <div class="grid text-right" style="border-bottom: 1px solid #ddd; font-size: 7.5px;">
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">VALOR SERVIÇOS</div><div style="font-weight: bold;">${vm.valorServicos.toFixed(2)}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">DEDUÇÕES LEGAIS</div><div style="font-weight: bold;">${vm.deducoes > 0 ? vm.deducoes.toFixed(2) : '0,00'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">DESC. INCOND.</div><div style="font-weight: bold;">${vm.descIncond > 0 ? vm.descIncond.toFixed(2) : '0,00'}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd;"><div style="text-align: left; color: #555; font-weight: bold;">BASE CÁLCULO</div><div style="font-weight: bold;">${vm.issBase.toFixed(2)}</div></div>
            <div style="width: 16.66%; padding: 3px; border-right: 1px solid #ddd; text-align: center;"><div style="color: #555; font-weight: bold;">ALÍQUOTA</div><div style="font-weight: bold;">${vm.issAliquot !== null ? `${vm.issAliquot.toFixed(2)}%` : '-'}</div></div>
            <div style="width: 16.7%; padding: 3px;"><div style="text-align: left; color: #555; font-weight: bold;">VALOR DO ISS</div><div style="font-weight: bold;">${vm.issValor > 0 ? vm.issValor.toFixed(2) : '0,00'}</div></div>
          </div>
          <div class="grid" style="padding: 4px 6px; background: #f0f4f8; align-items: center;">
            <div style="width: 50%; font-size: 7.5px;">
              <div><b>(-) Total Retenções:</b> R$ ${vm.totalRetencoes.toFixed(2)}</div>
              ${vm.descCond > 0 ? `<div><b>(-) Desc. Condicionado:</b> R$ ${vm.descCond.toFixed(2)}</div>` : ''}
            </div>
            <div style="width: 50%; text-align: right;">
              <span style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; margin-right: 6px;">VALOR LÍQUIDO DA NFS-e:</span>
              <span style="font-size: 13px; font-weight: 900; font-family: monospace;">R$ ${vm.valorLiquido.toFixed(2)}</span>
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
