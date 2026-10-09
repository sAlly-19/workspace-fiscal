import { escapeHtml } from '../../../api/utils/escapeHtml';
import {
  formatDate,
  formatTime,
  formatMoney,
  getPaymentLabel,
  renderQrCodeSvg,
} from '../helpers';

/** NFC-e — Cupom Fiscal Eletrônico (cupom 80mm, identidade verde) */
export function renderDanfeNFCeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  const itemsRows = (doc.items || []).map((item: any) => `
    <tr>
      <td style="padding: 2px 4px 2px 0; font-weight: bold; vertical-align: top;">${escapeHtml(item.quantity || 1)}x</td>
      <td style="padding: 2px 4px 2px 0; vertical-align: top;">
        <div>${escapeHtml(item.description || '')}</div>
        <div style="color: #555; font-size: 8px;">${item.code ? `Cód: ${escapeHtml(item.code)} • ` : ''}${item.cfop ? `CFOP: ${escapeHtml(item.cfop)} • ` : ''}${formatMoney(item.unitPrice)} un.</div>
      </td>
      <td style="padding: 2px 0; text-align: right; font-weight: bold; vertical-align: top; white-space: nowrap;">${formatMoney(item.totalPrice)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" style="padding: 6px; text-align: center; color: #555; font-style: italic;">Nenhum item detalhado.</td></tr>`;

  const payments = (doc as any).billing?.payments || [];
  const paymentsRows = payments.map((p: any) => `
    <div style="display: flex; justify-content: space-between; padding: 1px 0;">
      <span>${getPaymentLabel(p.paymentType)}</span>
      <span style="font-weight: bold;">${formatMoney(p.amount)}</span>
    </div>
  `).join('');

  const accessKey = doc.accessKey || '';
  const accessKeySpaced = accessKey ? (accessKey.match(/.{1,4}/g)?.join(' ') || accessKey) : '';
  const qrSvg = accessKey ? renderQrCodeSvg(accessKey, 140) : '';

  return `
    <div class="danfe-page">
      <div class="danfe-box danfe-nfce">
        <!-- Header -->
        <div class="nfce-header">
          <div class="nfce-title">CUPOM FISCAL ELETRÔNICO</div>
          <div class="nfce-subtitle">NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
          <div class="nfce-issuer">${escapeHtml(doc.issuerName || 'NOME / RAZÃO SOCIAL DO EMITENTE')}</div>
          <div class="nfce-issuer-doc">CNPJ/CPF: ${escapeHtml(doc.issuerDocument || 'NÃO INFORMADO')}</div>
        </div>

        <!-- Doc Info -->
        <div class="nfce-docinfo">
          <div><div class="nfce-label">Nº</div><div class="nfce-value-lg">${escapeHtml(doc.number || '000.000')}</div></div>
          <div><div class="nfce-label">SÉRIE</div><div class="nfce-value-lg">${escapeHtml(doc.series || '1')}</div></div>
          <div><div class="nfce-label">EMISSÃO</div><div class="nfce-value-lg">${formatDate(doc.issueDate)}</div><div class="nfce-tiny">${formatTime(doc.issueDate)}</div></div>
        </div>

        <!-- Items -->
        <div class="nfce-section">
          <div class="nfce-section-title">ITENS DA COMPRA</div>
          <table style="width: 100%; border-collapse: collapse;">${itemsRows}</table>
        </div>

        <!-- Totals -->
        <div class="nfce-section">
          <div style="display: flex; justify-content: space-between; padding: 1px 0;"><span>Subtotal</span><span style="font-weight: bold;">${formatMoney(doc.totalAmount)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 1px 0;"><span>Desconto</span><span style="font-weight: bold;">R$ 0,00</span></div>
          <div class="nfce-total-row">
            <span>TOTAL</span>
            <span>${formatMoney(doc.totalAmount)}</span>
          </div>
        </div>

        ${payments.length > 0 ? `
        <div class="nfce-section">
          <div class="nfce-section-title">FORMA DE PAGAMENTO</div>
          ${paymentsRows}
          ${payments.some((p: any) => p.changeAmount) ? `<div style="display: flex; justify-content: space-between; padding: 1px 0; color: #555;"><span>Troco</span><span style="font-weight: bold;">${formatMoney(payments[0].changeAmount)}</span></div>` : ''}
        </div>
        ` : ''}

        <!-- Consumidor -->
        <div class="nfce-section">
          <div class="nfce-section-title">CONSUMIDOR</div>
          <div style="font-weight: bold;">${escapeHtml(doc.recipientName || 'Consumidor não identificado')}</div>
          ${doc.recipientDocument ? `<div style="color: #555; font-size: 8px;">CPF/CNPJ: ${escapeHtml(doc.recipientDocument)}</div>` : ''}
        </div>

        <!-- QR Code -->
        ${qrSvg ? `
        <div class="nfce-section" style="text-align: center;">
          <div class="nfce-section-title" style="text-align: center;">Consulte pela chave via QR Code</div>
          <div style="display: inline-block; padding: 6px; background: #fff; border: 2px solid #047857;">${qrSvg}</div>
          <div class="nfce-key">${accessKeySpaced}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="nfce-footer">
          <div style="font-weight: bold;">NFC-e nº ${escapeHtml(doc.number || '000.000')} Série ${escapeHtml(doc.series || '1')}</div>
          <div>Emissão: ${formatDate(doc.issueDate)} ${formatTime(doc.issueDate)}</div>
          <div style="font-style: italic;">Consulte em www.sefaz.rs.gov.br/nfce/consulta</div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #047857; color: #555; font-size: 7px;">Documento emitido em conformidade com o padrão SEFAZ • NFView</div>
        </div>
      </div>
    </div>
  `;
}

