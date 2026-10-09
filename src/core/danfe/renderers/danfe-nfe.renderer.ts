import { escapeHtml } from '../../../api/utils/escapeHtml';
import {
  formatDate,
  formatModFrete,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../helpers';

/** NF-e — DANFE tradicional SEFAZ (preto e branco) */
export function renderDanfeNFeHtml(doc: any, pageIndex: number, totalPages: number): string {
  const itemsRows = (doc.items || []).map((item: any) => `
    <tr>
      <td style="border: 1px solid #000; padding: 1px 2px; font-family: monospace;">${escapeHtml(item.code || '-')}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; font-weight: 500; text-transform: uppercase;">${escapeHtml(item.description || '')}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; font-family: monospace; text-align: center;">${escapeHtml(item.ncm || '-')}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; font-family: monospace; text-align: center;">${escapeHtml(item.cst || '0/00')}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; font-family: monospace; font-weight: bold; text-align: center;">${escapeHtml(item.cfop || '-')}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: center; font-family: monospace;">${escapeHtml(item.unit || 'UN')}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${escapeHtml((item.quantity || 1).toFixed(4))}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${escapeHtml((item.unitPrice || 0).toFixed(4))}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right; font-weight: bold;">${escapeHtml((item.totalPrice || 0).toFixed(2))}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${item.discount ? escapeHtml(item.discount.toFixed(2)) : '0,00'}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${item.icmsBase ? escapeHtml(item.icmsBase.toFixed(2)) : '0,00'}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${item.icmsValue ? escapeHtml(item.icmsValue.toFixed(2)) : '0,00'}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${item.ipiValue ? escapeHtml(item.ipiValue.toFixed(2)) : '-'}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${item.icmsAliq ? escapeHtml(item.icmsAliq.toFixed(2)) : '-'}</td>
      <td style="border: 1px solid #000; padding: 1px 2px; text-align: right;">${item.ipiAliq ? escapeHtml(item.ipiAliq.toFixed(2)) : '-'}</td>
    </tr>
  `).join('') || `
    <tr><td colspan="15" style="border: 1px solid #000; padding: 8px; text-align: center; color: #666;">Nenhum item detalhado</td></tr>
  `;

  const formattedKey = doc.accessKey ? (doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey) : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';
  const issueDateStr = doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-';
  const exitDateStr = doc.exitDate ? new Date(doc.exitDate).toLocaleDateString('pt-BR') : issueDateStr;
  const exitTimeStr = doc.exitTime || (doc.issueDate ? new Date(doc.issueDate).toLocaleTimeString('pt-BR') : '-');

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
  const recipientStreet = doc.recipient?.address?.street ? `${doc.recipient.address.street}, ${doc.recipient.address.number || 'S/N'}${doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''}` : '-';
  const recipientBairro = doc.recipient?.address?.neighborhood || '-';
  const recipientCep = formatCep(doc.recipient?.address?.zipCode);
  const recipientCity = doc.recipient?.address?.city || '-';
  const recipientState = doc.recipient?.address?.state || '-';
  const recipientPhone = formatPhone(doc.recipient?.phone);

  const transport = doc.transport || {};
  const transpMod = formatModFrete(transport.modFrete);

  let billingHtml = '';
  const billing = (doc as any).billing;
  if (billing && ((billing.duplicates && billing.duplicates.length > 0) || billing.invoice)) {
    const dupBoxes = (billing.duplicates || []).map((dup: any) => {
      const numFormatted = String(dup.number || '').padStart(3, '0');
      const dateFormatted = dup.dueDate ? formatDate(dup.dueDate) : '-';
      return `
        <div style="border: 1px solid #000; padding: 2px 4px; min-width: 110px; font-size: 7.5px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #555;">Num.</span> <b>${escapeHtml(numFormatted)}</b></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #555;">Venc.</span> <b>${escapeHtml(dateFormatted)}</b></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #555;">Valor</span> <b>R$ ${escapeHtml((dup.amount || 0).toFixed(2))}</b></div>
        </div>
      `;
    }).join('');

    billingHtml = `
      <div class="title-sec">FATURA / DUPLICATA</div>
      <div class="border-all p-1" style="margin-bottom: 4px;">
        ${billing.invoice && (billing.invoice.number || billing.invoice.originalAmount) ? `
          <div style="display: flex; justify-content: space-between; font-size: 7.5px; border-bottom: 1px dashed #aaa; padding-bottom: 2px; margin-bottom: 3px;">
            <div><span style="color: #555;">Nº FATURA:</span> <b>${escapeHtml(billing.invoice.number || doc.number || '-')}</b></div>
            <div><span style="color: #555;">VALOR ORIG.:</span> <b>R$ ${escapeHtml((billing.invoice.originalAmount || 0).toFixed(2))}</b></div>
            <div><span style="color: #555;">DESC.:</span> <b>R$ ${escapeHtml((billing.invoice.discountAmount || 0).toFixed(2))}</b></div>
            <div><span style="color: #555;">VALOR LÍQ.:</span> <b>R$ ${escapeHtml((billing.invoice.netAmount || billing.invoice.originalAmount || 0).toFixed(2))}</b></div>
          </div>
        ` : ''}
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${dupBoxes}
        </div>
      </div>
    `;
  }

  return `
    <div class="danfe-page">
      <div class="danfe-box">
        <!-- Canhoto de Recebimento -->
        <div class="header-stub" style="border: 1px solid #000; margin-bottom: 4px;">
          <div style="display: flex; border-bottom: 1px solid #000; font-size: 7.5px; text-transform: uppercase;">
            <div style="flex: 1; padding: 3px; border-right: 1px solid #000; line-height: 1.2;">
              RECEBEMOS DE <b>${escapeHtml(issuerName)}</b> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: <b>${escapeHtml(issueDateStr)}</b> VALOR TOTAL: <b>R$ ${escapeHtml(valorTotalNota.toFixed(2))}</b> DESTINATÁRIO: <b>${escapeHtml(recipientName)}</b> - ${escapeHtml(recipientStreet)} ${escapeHtml(recipientBairro)} ${escapeHtml(recipientCity)}-${escapeHtml(recipientState)}
            </div>
            <div style="width: 110px; padding: 3px; text-align: center; font-weight: bold;">
              <div style="font-size: 10px;">NF-e</div>
              <div style="font-size: 8.5px;">Nº. ${escapeHtml(doc.number || '000.000')}</div>
              <div style="font-size: 8px;">Série ${escapeHtml(doc.series || '001')}</div>
            </div>
          </div>
          <div style="display: flex; font-size: 7px; text-transform: uppercase;">
            <div style="width: 140px; padding: 2px 4px; border-right: 1px solid #000; color: #444; font-weight: bold;">DATA DE RECEBIMENTO</div>
            <div style="flex: 1; padding: 2px 4px; color: #444; font-weight: bold;">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
          </div>
        </div>

        <!-- Header Principal -->
        <div class="border-all" style="margin-bottom: 4px;">
          <div class="grid border-b">
            <!-- Emitente -->
            <div class="p-2 border-r" style="width: 45%; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="font-size: 6.5px; color: #555; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 2px;">IDENTIFICAÇÃO DO EMITENTE</div>
                <div style="font-size: 11px; font-weight: 900; line-height: 1.1; text-align: center; text-transform: uppercase;">${escapeHtml(issuerName)}</div>
                <div style="font-size: 7.5px; text-align: center; margin-top: 3px; line-height: 1.2;">
                  ${escapeHtml(issuerStreet ? `${issuerStreet}, ${issuerNumber}${issuerComp}` : '')}
                  ${escapeHtml(issuerBairro ? `\n${issuerBairro} - ${issuerCep}` : '')}
                  ${escapeHtml(issuerCity ? `\n${issuerCity} - ${issuerState} ${issuerPhone ? 'Fone/Fax: ' + issuerPhone : ''}` : '')}
                </div>
              </div>
            </div>

            <!-- DANFE Box -->
            <div class="p-1 text-center border-r" style="width: 20%; display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 15px; font-weight: 900; letter-spacing: 1px; line-height: 1;">DANFE</div>
                <div style="font-size: 6.5px; margin-top: 1px;">Documento Auxiliar da Nota Fiscal Eletrônica</div>
              </div>
              <div style="border: 1px solid #000; padding: 1px 4px; font-size: 7.5px; font-weight: bold; margin: 2px 0;">
                0 - ENTRADA<br/>1 - SAÍDA [ 1 ]
              </div>
              <div style="font-size: 8px; font-weight: bold; text-align: center; line-height: 1.1;">
                <div>Nº. ${escapeHtml(doc.number || '000.000')}</div>
                <div>SÉRIE ${escapeHtml(doc.series || '001')}</div>
                <div>FOLHA 1/1</div>
              </div>
            </div>

            <!-- Chave de Acesso -->
            <div class="p-1" style="width: 35%; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div class="barcode-line" style="height: 32px; margin-bottom: 2px;"></div>
                <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">CHAVE DE ACESSO</div>
                <div style="font-family: monospace; font-size: 9px; font-weight: bold; text-align: center; letter-spacing: 0.5px;">
                  ${escapeHtml(formattedKey)}
                </div>
              </div>
              <div style="text-align: center; font-size: 6.5px; color: #444; border-top: 1px solid #ccc; padding-top: 2px; margin-top: 2px; line-height: 1.1;">
                Consulta de autenticidade no portal nacional da NF-e<br/>
                <b>www.nfe.fazenda.gov.br/portal</b> ou no site da Sefaz Autorizadora
              </div>
            </div>
          </div>

          <!-- Natureza da Operação e Protocolo -->
          <div class="grid border-b" style="font-size: 7.5px;">
            <div class="p-1 border-r" style="width: 60%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold; text-transform: uppercase;">NATUREZA DA OPERAÇÃO</div>
              <div style="font-weight: 900; text-transform: uppercase;">${escapeHtml(doc.operationNature || 'VENDA DE MERCADORIA')}</div>
            </div>
            <div class="p-1" style="width: 40%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold; text-transform: uppercase;">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
              <div style="font-weight: 900; font-family: monospace;">${escapeHtml(doc.protocol || '-')}</div>
            </div>
          </div>

          <!-- Inscrições e CNPJ Emitente -->
          <div class="grid" style="font-size: 7.5px;">
            <div class="p-1 border-r" style="width: 28%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">INSCRIÇÃO ESTADUAL</div>
              <div style="font-weight: bold; font-family: monospace;">${escapeHtml(issuerIE)}</div>
            </div>
            <div class="p-1 border-r" style="width: 28%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">INSCRIÇÃO MUNICIPAL</div>
              <div style="font-weight: bold; font-family: monospace;">${escapeHtml(issuerIM)}</div>
            </div>
            <div class="p-1 border-r" style="width: 20%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">INSC. ESTADUAL DO SUBST. TRIBUT.</div>
              <div style="font-weight: bold; font-family: monospace;">-</div>
            </div>
            <div class="p-1" style="width: 24%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">CNPJ / CPF</div>
              <div style="font-weight: 900; font-family: monospace;">${escapeHtml(issuerDoc)}</div>
            </div>
          </div>
        </div>

        <!-- Destinatário / Remetente -->
        <div class="title-sec">DESTINATÁRIO / REMETENTE</div>
        <div class="border-all" style="margin-bottom: 4px; font-size: 7.5px;">
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 60%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">NOME / RAZÃO SOCIAL</div>
              <div style="font-weight: 900; font-size: 8.5px; text-transform: uppercase;">${escapeHtml(recipientName)}</div>
            </div>
            <div class="p-1 border-r" style="width: 25%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">CNPJ / CPF</div>
              <div style="font-weight: 900; font-family: monospace;">${escapeHtml(recipientDoc)}</div>
            </div>
            <div class="p-1" style="width: 15%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">DATA DA EMISSÃO</div>
              <div style="font-weight: bold;">${escapeHtml(issueDateStr)}</div>
            </div>
          </div>
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 45%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">ENDEREÇO</div>
              <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(recipientStreet)}</div>
            </div>
            <div class="p-1 border-r" style="width: 25%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">BAIRRO / DISTRITO</div>
              <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(recipientBairro)}</div>
            </div>
            <div class="p-1 border-r" style="width: 15%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">CEP</div>
              <div style="font-weight: bold; font-family: monospace;">${escapeHtml(recipientCep)}</div>
            </div>
            <div class="p-1" style="width: 15%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">DATA DA SAÍDA/ENTRADA</div>
              <div style="font-weight: bold;">${escapeHtml(exitDateStr)}</div>
            </div>
          </div>
          <div class="grid">
            <div class="p-1 border-r" style="width: 35%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">MUNICÍPIO</div>
              <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(recipientCity)}</div>
            </div>
            <div class="p-1 border-r" style="width: 8%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">UF</div>
              <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(recipientState)}</div>
            </div>
            <div class="p-1 border-r" style="width: 22%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">FONE / FAX</div>
              <div style="font-weight: bold; font-family: monospace;">${escapeHtml(recipientPhone)}</div>
            </div>
            <div class="p-1 border-r" style="width: 20%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">INSCRIÇÃO ESTADUAL</div>
              <div style="font-weight: bold; font-family: monospace;">${escapeHtml(recipientIE)}</div>
            </div>
            <div class="p-1" style="width: 15%;">
              <div style="font-size: 6.5px; color: #555; font-weight: bold;">HORA DA SAÍDA/ENTRADA</div>
              <div style="font-weight: bold;">${escapeHtml(exitTimeStr)}</div>
            </div>
          </div>
        </div>

        ${billingHtml}

        <!-- Cálculo do Imposto -->
        <div class="title-sec">CÁLCULO DO IMPOSTO</div>
        <div class="border-all" style="margin-bottom: 4px; font-size: 7.5px;">
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 12%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">BASE CÁLC. ICMS</div><div class="text-right font-bold">${baseIcms.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 10%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR ICMS</div><div class="text-right font-bold">${valorIcms.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 13%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">BASE CÁLC. ICMS ST</div><div class="text-right font-bold">${baseIcmsSt.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 12%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR ICMS SUBST.</div><div class="text-right font-bold">${valorIcmsSt.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 11%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">V. IMP. IMPORTAÇÃO</div><div class="text-right font-bold">${impImportacao.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 11%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">V. ICMS UF REMET.</div><div class="text-right font-bold">${icmsUfRemet.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 10%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">V. FCP UF DEST.</div><div class="text-right font-bold">${fcpUfDest.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 9%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR DO PIS</div><div class="text-right font-bold">${pis.toFixed(2)}</div></div>
            <div class="p-1 bg-gray-50" style="width: 12%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">V. TOTAL PRODUTOS</div><div class="text-right font-bold">${valorProdutos.toFixed(2)}</div></div>
          </div>
          <div class="grid">
            <div class="p-1 border-r" style="width: 12%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR FRETE</div><div class="text-right font-bold">${valorFrete.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 10%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR SEGURO</div><div class="text-right font-bold">${valorSeguro.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 13%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">DESCONTO</div><div class="text-right font-bold">${valorDesconto.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 12%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">OUTRAS DESPESAS</div><div class="text-right font-bold">${outrasDespesas.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 11%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR TOTAL IPI</div><div class="text-right font-bold">${valorIpi.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 11%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">V. ICMS UF DEST.</div><div class="text-right font-bold">${icmsUfDest.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 10%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">V. TOT. TRIB.</div><div class="text-right font-bold">${totalTrib.toFixed(2)}</div></div>
            <div class="p-1 border-r" style="width: 9%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">VALOR DA COFINS</div><div class="text-right font-bold">${cofins.toFixed(2)}</div></div>
            <div class="p-1" style="width: 12%; background: #f0f4f8;"><div style="font-size: 6.5px; font-weight: 900;">V. TOTAL DA NOTA</div><div class="text-right font-black" style="font-size: 10px;">${valorTotalNota.toFixed(2)}</div></div>
          </div>
        </div>

        <!-- Transportador / Volumes Transportados -->
        <div class="title-sec">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
        <div class="border-all" style="margin-bottom: 4px; font-size: 7.5px;">
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 40%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">NOME / RAZÃO SOCIAL</div><div class="font-bold text-truncate">${escapeHtml(transport.name || '-')}</div></div>
            <div class="p-1 border-r" style="width: 18%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">FRETE</div><div class="font-bold">${escapeHtml(transpMod)}</div></div>
            <div class="p-1 border-r" style="width: 10%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">CÓDIGO ANTT</div><div class="font-bold font-mono">${escapeHtml(transport.anttCode || '-')}</div></div>
            <div class="p-1 border-r" style="width: 10%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">PLACA DO VEÍCULO</div><div class="font-bold font-mono">${escapeHtml(transport.vehiclePlate || '-')}</div></div>
            <div class="p-1 border-r" style="width: 4%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">UF</div><div class="font-bold">${escapeHtml(transport.vehicleUf || '-')}</div></div>
            <div class="p-1" style="width: 18%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">CNPJ / CPF</div><div class="font-bold font-mono">${escapeHtml(formatCnpjCpf(transport.document))}</div></div>
          </div>
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 45%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">ENDEREÇO</div><div class="font-bold text-truncate">${escapeHtml(transport.address || '-')}</div></div>
            <div class="p-1 border-r" style="width: 30%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">MUNICÍPIO</div><div class="font-bold text-truncate">${escapeHtml(transport.city || '-')}</div></div>
            <div class="p-1 border-r" style="width: 5%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">UF</div><div class="font-bold">${escapeHtml(transport.state || '-')}</div></div>
            <div class="p-1" style="width: 20%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">INSCRIÇÃO ESTADUAL</div><div class="font-bold font-mono">${escapeHtml(transport.ie || '-')}</div></div>
          </div>
          <div class="grid">
            <div class="p-1 border-r" style="width: 12%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">QUANTIDADE</div><div class="font-bold text-center">${escapeHtml(String(transport.volumeQuantity ?? '-'))}</div></div>
            <div class="p-1 border-r" style="width: 15%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">ESPÉCIE</div><div class="font-bold">${escapeHtml(transport.volumeSpecies || '-')}</div></div>
            <div class="p-1 border-r" style="width: 15%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">MARCA</div><div class="font-bold">${escapeHtml(transport.volumeBrand || '-')}</div></div>
            <div class="p-1 border-r" style="width: 18%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">NUMERAÇÃO</div><div class="font-bold">${escapeHtml(transport.volumeNumber || '-')}</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">PESO BRUTO</div><div class="text-right font-bold">${escapeHtml(transport.grossWeight !== undefined ? transport.grossWeight.toFixed(3) : '-')}</div></div>
            <div class="p-1" style="width: 20%;"><div style="font-size: 6.5px; color: #555; font-weight: bold;">PESO LÍQUIDO</div><div class="text-right font-bold">${escapeHtml(transport.netWeight !== undefined ? transport.netWeight.toFixed(3) : '-')}</div></div>
          </div>
        </div>

        <!-- Itens -->
        <div class="title-sec">DADOS DOS PRODUTOS / SERVIÇOS</div>
        <div class="border-all" style="margin-bottom: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5px;">
            <thead>
              <tr style="background: #eee;">
                <th style="border: 1px solid #000; padding: 1px 2px; width: 40px; text-align: left;">CÓDIGO</th>
                <th style="border: 1px solid #000; padding: 1px 2px; text-align: left;">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 45px; text-align: center;">NCM/SH</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 28px; text-align: center;">O/CST</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 28px; text-align: center;">CFOP</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 20px; text-align: center;">UN</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 35px; text-align: right;">QUANT</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 45px; text-align: right;">VALOR UNIT</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 45px; text-align: right;">VALOR TOTAL</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 38px; text-align: right;">VALOR DESC</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 45px; text-align: right;">B.CÁLC ICMS</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 38px; text-align: right;">VALOR ICMS</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 32px; text-align: right;">VALOR IPI</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 32px; text-align: right;">ALÍQ. ICMS</th>
                <th style="border: 1px solid #000; padding: 1px 2px; width: 32px; text-align: right;">ALÍQ. IPI</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <!-- Dados Adicionais -->
        <div class="title-sec">DADOS ADICIONAIS</div>
        <div class="border-all" style="min-height: 45px; font-size: 7.5px; display: flex;">
          <div style="width: 65%; padding: 3px; border-right: 1px solid #000;">
            <div style="font-weight: bold; font-size: 6.5px; color: #444; text-transform: uppercase;">INFORMAÇÕES COMPLEMENTARES</div>
            <div style="white-space: pre-line; line-height: 1.2;">${escapeHtml(doc.additionalInfo || 'Documento fiscal eletrônico processado e emitido via NF View. Conversão direta para PDF.')}</div>
          </div>
          <div style="width: 35%; padding: 3px;">
            <div style="font-weight: bold; font-size: 6.5px; color: #444; text-transform: uppercase;">RESERVADO AO FISCO</div>
            <div style="white-space: pre-line; line-height: 1.2;">${escapeHtml(doc.fiscoInfo || '')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

