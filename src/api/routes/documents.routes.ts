import { Router } from 'express';
import { documentsRepository } from '../repositories/documents.repository';
import { storageService } from '../services/storage.service';
import { parseFiscalDocument } from '../../core/parsers';
import { db } from '../../db';
import { documents } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { escapeHtml } from '../utils/escapeHtml';
import { formatDate, formatTime, formatMoney, getPaymentLabel, renderQrCodeSvg } from '../../core/danfe/helpers';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { batchId, search, limit, offset } = req.query;
    const docs = await documentsRepository.findAll(
      batchId as string | undefined,
      search as string | undefined,
      limit ? parseInt(limit as string, 10) : undefined,
      offset ? parseInt(offset as string, 10) : undefined
    );
    res.json(docs);
  } catch (error) {
    console.error('[DocumentsRoute] Error fetching documents:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos.' });
  }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida para exclusão.' });
    }
    // Coleta paths antes de deletar para limpar storage
    const docs = await documentsRepository.findByIds(ids);
    await documentsRepository.deleteMany(ids);
    for (const d of docs) {
      if ((d as any).rawXmlPath) await storageService.deleteXml((d as any).rawXmlPath).catch(() => {});
    }
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[DocumentsRoute] Error bulk deleting documents:', error);
    res.status(500).json({ error: 'Erro ao excluir documentos em massa.' });
  }
});

router.post('/bulk-move', async (req, res) => {
  try {
    const { ids, folderId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida para mover.' });
    }
    await documentsRepository.moveManyToFolder(ids, folderId || null);
    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('[DocumentsRoute] Error bulk moving documents:', error);
    res.status(500).json({ error: 'Erro ao mover documentos em massa.' });
  }
});

async function fetchDocsForPrint(query: any, body: any) {
  let ids: string[] | null = null;
  let batchId: string | null = null;
  if (query?.ids && typeof query.ids === 'string') {
    ids = query.ids.split(',').filter(Boolean);
  } else if (body?.ids && Array.isArray(body.ids)) {
    ids = body.ids.filter(Boolean);
  }
  if (query?.batchId && typeof query.batchId === 'string') batchId = query.batchId;
  else if (body?.batchId) batchId = String(body.batchId);
  // Limite de segurança: evita URL gigante / payload enorme
  if (ids && ids.length > 500) ids = ids.slice(0, 500);

  if (ids && ids.length > 0) return documentsRepository.findByIds(ids);
  if (batchId) return documentsRepository.findAll(batchId);
  return documentsRepository.findAll();
}

router.get('/batch-print', async (req, res) => {
  try {
    const docsList = await fetchDocsForPrint(req.query, null);
    if (!docsList || docsList.length === 0) {
      return res.status(404).send('Nenhum documento fiscal encontrado para o lote especificado.');
    }
    const html = generateDanfeBatchHtml(docsList);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[DocumentsRoute] Error generating batch print HTML:', error);
    res.status(500).send('Erro ao gerar visualização de impressão em lote.');
  }
});

router.post('/batch-print', async (req, res) => {
  try {
    const docsList = await fetchDocsForPrint(null, req.body);
    if (!docsList || docsList.length === 0) {
      return res.status(404).json({ error: 'Nenhum documento fiscal encontrado para o lote.' });
    }
    const html = generateDanfeBatchHtml(docsList);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[DocumentsRoute] Error generating batch print HTML (POST):', error);
    res.status(500).json({ error: 'Erro ao gerar visualização de impressão em lote.' });
  }
});

router.patch('/:id/move', async (req, res) => {
  try {
    const { folderId } = req.body;
    const [updated] = await documentsRepository.moveToFolder(req.params.id, folderId || null);
    res.json(updated);
  } catch (error) {
    console.error('[DocumentsRoute] Error moving document:', error);
    res.status(500).json({ error: 'Erro ao mover documento para a pasta.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    await documentsRepository.delete(req.params.id);
    if (doc?.rawXmlPath) await storageService.deleteXml(doc.rawXmlPath).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error('[DocumentsRoute] Error deleting document:', error);
    res.status(500).json({ error: 'Erro ao excluir documento.' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const all = await documentsRepository.findAll();
    await documentsRepository.deleteAll();
    for (const d of all) {
      if ((d as any).rawXmlPath) await storageService.deleteXml((d as any).rawXmlPath).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[DocumentsRoute] Error deleting all documents:', error);
    res.status(500).json({ error: 'Erro ao limpar documentos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    let billing = (doc as any).billing;
    if (!billing && doc.rawXmlPath) {
      try {
        const xmlContent = await storageService.readXml(doc.rawXmlPath);
        const parsed = parseFiscalDocument(xmlContent, doc.type as any, doc.rawXmlPath);
        if (parsed?.billing) {
          billing = parsed.billing;
          await db.update(documents).set({ billing: billing as any }).where(eq(documents.id, doc.id));
        }
      } catch (err) {
        console.warn(`[DocumentsRoute] Could not on-demand parse billing for ${escapeHtml(doc.id)}:`, err);
      }
    }

    res.json({ ...doc, billing });
  } catch (error) {
    console.error('[DocumentsRoute] Error fetching document:', error);
    res.status(500).json({ error: 'Erro ao buscar documento.' });
  }
});

router.get('/:id/xml', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    if (!doc || !doc.rawXmlPath) {
      return res.status(404).json({ error: 'Arquivo XML não encontrado para este documento.' });
    }
    const xmlContent = await storageService.readXml(doc.rawXmlPath);
    res.setHeader('Content-Type', 'application/xml');
    res.send(xmlContent);
  } catch (error) {
    console.error('[DocumentsRoute] Error reading XML:', error);
    res.status(500).json({ error: 'Erro ao ler o conteúdo do arquivo XML.' });
  }
});

function renderDanfeCardHtml(doc: any, pageIndex: number, totalPages: number): string {
  const docType = String(doc.type || 'NFE').toUpperCase();
  if (docType === 'NFCE') return renderDanfeNFCeHtml(doc, pageIndex, totalPages);
  if (docType === 'CTE') return renderDanfeDACTEHtml(doc, pageIndex, totalPages);
  if (docType === 'NFSE' || docType === 'NFS-E' || docType === 'NFS_E') return renderDanfeNFSeHtml(doc, pageIndex, totalPages);
  return renderDanfeNFeHtml(doc, pageIndex, totalPages);
}

/** NF-e — DANFE tradicional SEFAZ (preto e branco) */
function renderDanfeNFeHtml(doc: any, pageIndex: number, totalPages: number): string {
  const itemsRows = (doc.items || []).map((item: any) => `
    <tr>
      <td style="border: 1px solid #000; padding: 3px; font-family: monospace;">${escapeHtml(item.code || '-')}</td>
      <td style="border: 1px solid #000; padding: 3px; font-weight: 500;">${escapeHtml(item.description || '')}</td>
      <td style="border: 1px solid #000; padding: 3px; text-align: right;">${escapeHtml(item.quantity || 1)}</td>
      <td style="border: 1px solid #000; padding: 3px; text-align: right;">R$ ${escapeHtml((item.unitPrice || 0).toFixed(2))}</td>
      <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: bold;">R$ ${escapeHtml((item.totalPrice || 0).toFixed(2))}</td>
    </tr>
  `).join('') || `
    <tr><td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: center; color: #666;">Nenhum item detalhado</td></tr>
  `;

  const formattedKey = doc.accessKey ? (doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey) : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';
  const issueDateStr = doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-';

  let billingHtml = '';
  const billing = (doc as any).billing;
  if (billing && ((billing.duplicates && billing.duplicates.length > 0) || billing.invoice)) {
    const dupBoxes = (billing.duplicates || []).map((dup: any) => {
      const numFormatted = String(dup.number || '').padStart(3, '0');
      const dateFormatted = dup.dueDate ? (
        dup.dueDate.includes('-') 
          ? dup.dueDate.split('T')[0].split('-').reverse().join('/') 
          : dup.dueDate
      ) : '-';
      return `
        <div style="border: 1px solid #000; padding: 3px 6px; min-width: 110px; font-size: 8px;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #555;">Num.</span> <b>${escapeHtml(numFormatted)}</b></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #555;">Venc.</span> <b>${escapeHtml(dateFormatted)}</b></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: #555;">Valor</span> <b>R$ ${escapeHtml((dup.amount || 0).toFixed(2))}</b></div>
        </div>
      `;
    }).join('');

    billingHtml = `
      <div class="title-sec">FATURA / DUPLICATA</div>
      <div class="border-all p-1" style="margin-bottom: 6px;">
        ${billing.invoice && (billing.invoice.number || billing.invoice.originalAmount) ? `
          <div style="display: flex; justify-content: space-between; font-size: 8px; border-bottom: 1px dashed #aaa; padding-bottom: 3px; margin-bottom: 4px;">
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
        <!-- Stub -->
        <div class="header-stub">
          <div style="font-size: 7.5px; font-weight: bold;">RECEBEMOS DE ${escapeHtml(doc.issuerName || 'EMITENTE')} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</div>
          <div class="grid border-all" style="margin-top: 4px;">
            <div class="p-1 border-r" style="width: 30%;">DATA DE RECEBIMENTO:</div>
            <div class="p-1 border-r" style="width: 50%;">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR:</div>
            <div class="p-1 text-center font-bold" style="width: 20%;">NF-e<br/>Nº ${escapeHtml(doc.number || '000.000')}</div>
          </div>
        </div>

        <!-- Header Principal -->
        <div class="grid border-all" style="margin-bottom: 6px;">
          <div class="p-2 border-r" style="width: 50%;">
            <div style="font-size: 13px; font-weight: bold; line-height: 1.2;">${escapeHtml(doc.issuerName || 'NOME / RAZÃO SOCIAL')}</div>
            <div style="font-size: 9.5px; font-family: monospace; margin-top: 4px;">CNPJ: ${escapeHtml(doc.issuerDocument || 'NÃO INFORMADO')}</div>
            <div style="font-size: 8px; color: #444; margin-top: 2px;">DOCUMENTO FISCAL ELETRÔNICO</div>
          </div>
          <div class="p-2 text-center" style="width: 50%; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 900; letter-spacing: 1px;">DANFE</div>
              <div style="font-size: 8px;">Documento Auxiliar da Nota Fiscal Eletrônica</div>
            </div>
            <div class="grid" style="justify-content: space-around; font-size: 9px; font-weight: bold;">
              <div style="border: 1px solid #000; padding: 2px 6px;">0-ENTRADA<br/>1-SAÍDA [ 1 ]</div>
              <div style="text-align: left;">
                <div>Nº ${escapeHtml(doc.number || '000.000')}</div>
                <div>SÉRIE ${escapeHtml(doc.series || '1')}</div>
                <div>FOLHA 1/1</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chave de Acesso -->
        <div class="border-all p-1" style="margin-bottom: 6px;">
          <div class="grid" style="justify-content: space-between; font-size: 7.5px; font-weight: bold;">
            <span>CHAVE DE ACESSO</span>
            <span>Consulta de autenticidade no portal nacional da NF-e</span>
          </div>
          <div class="barcode-line"></div>
          <div style="font-family: monospace; font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 1px;">
            ${formattedKey}
          </div>
        </div>

        <!-- Destinatário -->
        <div class="title-sec">DESTINATÁRIO / REMETENTE</div>
        <div class="border-all" style="margin-bottom: 6px;">
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 65%;">
              <div style="font-size: 7px; color: #555;">NOME / RAZÃO SOCIAL</div>
              <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.recipientName || 'CONSUMIDOR FINAL')}</div>
            </div>
            <div class="p-1" style="width: 35%;">
              <div style="font-size: 7px; color: #555;">CNPJ / CPF</div>
              <div style="font-weight: bold; font-family: monospace;">${escapeHtml(doc.recipientDocument || 'NÃO INFORMADO')}</div>
            </div>
          </div>
          <div class="grid">
            <div class="p-1 border-r" style="width: 50%;">
              <div style="font-size: 7px; color: #555;">DATA DE EMISSÃO</div>
              <div style="font-weight: bold;">${issueDateStr}</div>
            </div>
            <div class="p-1" style="width: 50%;">
              <div style="font-size: 7px; color: #555;">DATA DE SAÍDA / ENTRADA</div>
              <div style="font-weight: bold;">${issueDateStr}</div>
            </div>
          </div>
        </div>

        ${billingHtml}

        <!-- Cálculo do Imposto -->
        <div class="title-sec">CÁLCULO DO IMPOSTO</div>
        <div class="border-all" style="margin-bottom: 6px;">
          <div class="grid border-b">
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">BASE CÁLC. ICMS</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">VALOR ICMS</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">BASE CÁLC. ICMS ST</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">VALOR ICMS ST</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1" style="width: 20%;"><div style="font-size: 7px;">V. TOTAL PRODUTOS</div><div class="text-right font-bold">R$ ${escapeHtml((doc.totalAmount || 0).toFixed(2))}</div></div>
          </div>
          <div class="grid">
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">VALOR FRETE</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">VALOR SEGURO</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">DESCONTO</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1 border-r" style="width: 20%;"><div style="font-size: 7px;">OUTRAS DESP.</div><div class="text-right font-bold">R$ 0,00</div></div>
            <div class="p-1" style="width: 20%; background: #f0f4f8;"><div style="font-size: 7px; font-weight: bold;">VALOR TOTAL NOTA</div><div class="text-right font-black" style="font-size: 11px;">R$ ${escapeHtml((doc.totalAmount || 0).toFixed(2))}</div></div>
          </div>
        </div>

        <!-- Itens -->
        <div class="title-sec">DADOS DOS PRODUTOS / SERVIÇOS</div>
        <div class="border-all" style="margin-bottom: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
            <thead>
              <tr style="background: #eee;">
                <th style="border: 1px solid #000; padding: 3px; width: 60px; text-align: left;">CÓDIGO</th>
                <th style="border: 1px solid #000; padding: 3px; text-align: left;">DESCRIÇÃO</th>
                <th style="border: 1px solid #000; padding: 3px; width: 40px; text-align: right;">QTD</th>
                <th style="border: 1px solid #000; padding: 3px; width: 70px; text-align: right;">V. UNIT</th>
                <th style="border: 1px solid #000; padding: 3px; width: 70px; text-align: right;">V. TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <!-- Dados Adicionais -->
        <div class="title-sec">DADOS ADICIONAIS</div>
        <div class="border-all p-1" style="min-height: 45px; font-size: 8px;">
          <div style="font-weight: bold; font-size: 7.5px; color: #444;">INFORMAÇÕES COMPLEMENTARES</div>
          <div>Documento fiscal eletrônico processado e emitido via DANFE View. Conversão XML para PDF. Documento ${pageIndex + 1} de ${totalPages}.</div>
        </div>
      </div>
    </div>
  `;
}

// Helpers centralizados em src/core/danfe/helpers.ts (formatDate, formatMoney, etc.)

/** NFC-e — Cupom Fiscal Eletrônico (cupom 80mm, identidade verde) */
function renderDanfeNFCeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  const itemsRows = (doc.items || []).map((item: any) => `
    <tr>
      <td style="padding: 2px 4px 2px 0; font-weight: bold; vertical-align: top;">${escapeHtml(item.quantity || 1)}x</td>
      <td style="padding: 2px 4px 2px 0; vertical-align: top;">
        <div>${escapeHtml(item.description || '')}</div>
        <div style="color: #555; font-size: 8px;">${item.code ? `Cód: ${escapeHtml(item.code)} • ` : ''}${formatMoney(item.unitPrice)} un.</div>
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
          <div class="nfce-icon">🧾</div>
          <div class="nfce-title">CUPOM FISCAL ELETRÔNICO</div>
          <div class="nfce-subtitle">NFC-e • Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
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
          <div class="nfce-section-title">🛒 ITENS DA COMPRA</div>
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
          <div class="nfce-section-title">💳 FORMA DE PAGAMENTO</div>
          ${paymentsRows}
          ${payments.some((p: any) => p.changeAmount) ? `<div style="display: flex; justify-content: space-between; padding: 1px 0; color: #555;"><span>Troco</span><span style="font-weight: bold;">${formatMoney(payments[0].changeAmount)}</span></div>` : ''}
        </div>
        ` : ''}

        <!-- Consumidor -->
        <div class="nfce-section">
          <div class="nfce-section-title">👤 CONSUMIDOR</div>
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
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #047857; color: #555; font-size: 7px;">Documento emitido em ambiente de homologação/dev • NFView</div>
        </div>
      </div>
    </div>
  `;
}

/** CT-e — DACTE (Conhecimento de Transporte Eletrônico, identidade âmbar, layout horizontal) */
function renderDanfeDACTEHtml(doc: any, pageIndex: number, totalPages: number): string {
  const modFrete = doc.modFrete ?? 1;
  const cfop = doc.cfop || '6351';
  const modFreteLabel: Record<number, string> = {
    0: '0 - Por conta do Remetente (CIF)',
    1: '1 - Por conta do Destinatário (FOB)',
    2: '2 - Por conta de Terceiros',
    3: '3 - Transporte Próprio por Remetente',
    4: '4 - Transporte Próprio por Destinatário',
    9: '9 - Sem Ocorrência de Transporte',
  };
  const issAliq = doc.icmsAliq || 0;

  const field = (label: string, value: string | number | undefined | null, w: number) =>
    `<div style="padding: 3px 5px; width: ${w}%;">
       <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold;">${escapeHtml(label)}</div>
       <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(String(value ?? '-'))}</div>
     </div>`;

  return `
    <div class="danfe-page">
      <div class="danfe-box danfe-dacte">
        <!-- Header -->
        <div class="dacte-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="dacte-icon">🚚</div>
            <div>
              <div class="dacte-title">DACTE</div>
              <div class="dacte-subtitle">Documento Auxiliar do Conhecimento de Transporte Eletrônico</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 9px;">
            <div><span style="color: #fef3c7;">Nº:</span> <span style="font-weight: bold; font-size: 13px;">${escapeHtml(doc.number || '000.000')}</span></div>
            <div><span style="color: #fef3c7;">SÉRIE:</span> <span style="font-weight: bold; font-size: 13px;">${escapeHtml(doc.series || '1')}</span></div>
            <div><span style="color: #fef3c7;">FLHA:</span> 1/1</div>
          </div>
        </div>

        <!-- Tipo + Modelo + Data -->
        <div class="dacte-tipo-row">
          ${field('Modelo', '57 - CT-e', 25)}
          ${field('Tipo do CT-e', 'Normal', 25)}
          ${field('Data/Hora Emissão', `${formatDate(doc.issueDate)} ${formatTime(doc.issueDate)}`, 25)}
          ${field('Situação', 'Autorizado', 25)}
        </div>

        <!-- Emitente -->
        <div class="dacte-emitente">
          <span style="font-size: 12px;">🏢</span>
          <div style="flex: 1;">
            <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold;">Emitente</div>
            <div style="font-weight: bold; font-size: 11px;">${escapeHtml(doc.issuerName || 'EMITENTE DO CT-e')}</div>
            <div style="font-size: 8px; color: #555; font-family: monospace;">CNPJ/CPF: ${escapeHtml(doc.issuerDocument || '-')} | IE: ${escapeHtml(doc.issuerIE || '-')}</div>
          </div>
          <div style="text-align: right; font-size: 8px; color: #555;">
            <div>${escapeHtml(doc.issuerAddress || 'Endereço do emitente')}</div>
            <div>${escapeHtml(doc.issuerCity || 'Cidade')} / ${escapeHtml(doc.issuerState || 'UF')}</div>
          </div>
        </div>

        <!-- Partes -->
        <div class="dacte-section-title">📍 Partes do Transporte</div>
        <div class="dacte-partes">
          <div style="width: 33.33%; padding: 4px 6px;">
            <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">Remetente</div>
            <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.issuerName || '-')}</div>
            <div style="font-size: 8px; color: #555; font-family: monospace;">${escapeHtml(doc.issuerDocument || '-')}</div>
            <div style="font-size: 8px; color: #555;">Município: ${escapeHtml(doc.issuerCity || '-')}/${escapeHtml(doc.issuerState || '-')}</div>
          </div>
          <div style="width: 33.33%; padding: 4px 6px; border-left: 1px solid #fde68a;">
            <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">Destinatário</div>
            <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.recipientName || 'Consumidor Final')}</div>
            <div style="font-size: 8px; color: #555; font-family: monospace;">${escapeHtml(doc.recipientDocument || '-')}</div>
            <div style="font-size: 8px; color: #555;">Município: ${escapeHtml(doc.recipientCity || '-')}/${escapeHtml(doc.recipientState || '-')}</div>
          </div>
          <div style="width: 33.34%; padding: 4px 6px; border-left: 1px solid #fde68a;">
            <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">Tomador</div>
            <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.recipientName || '-')}</div>
            <div style="font-size: 8px; color: #555; font-family: monospace;">${escapeHtml(doc.recipientDocument || '-')}</div>
            <div style="font-size: 8px; color: #555;">Tipo: Destinatário</div>
          </div>
        </div>

        <!-- Mercadoria + Prestação -->
        <div style="display: flex; border-top: 1px solid #fde68a;">
          <div style="width: 50%; border-right: 1px solid #fde68a;">
            <div class="dacte-section-title">📦 Mercadoria Transportada</div>
            <div style="padding: 4px 6px;">
              <div style="display: flex; gap: 6px; font-size: 9px;">
                ${field('CFOP', `${cfop} - ${cfop.startsWith('5') ? 'Prestação' : 'Aquisição'}`, 33.33)}
                ${field('Natureza da Operação', 'Prestação de Serviço', 33.33)}
                ${field('Código NCM', doc.items?.[0]?.ncm || '00000000', 33.34)}
              </div>
              <div style="display: flex; gap: 6px; font-size: 9px; margin-top: 4px;">
                ${field('Qtd. Volumes', String(doc.items?.length || 1), 50)}
                ${field('Peso Bruto (kg)', (doc.totalWeight || 0).toFixed(3), 50)}
              </div>
              <div style="display: flex; gap: 6px; font-size: 9px; margin-top: 4px;">
                ${field('Valor da Mercadoria', formatMoney(doc.totalAmount), 50)}
                ${field('Modal do Frete', modFreteLabel[modFrete] || '-', 50)}
              </div>
            </div>
          </div>
          <div style="width: 50%;">
            <div class="dacte-section-title">📝 Componentes do Valor da Prestação</div>
            <div style="padding: 4px 6px;">
              <div style="display: flex; gap: 6px; font-size: 9px;">
                ${field('Valor Total do Serviço', formatMoney(doc.totalAmount), 50)}
                ${field('Valor a Receber', formatMoney(doc.totalAmount), 50)}
              </div>
              <div style="display: flex; gap: 6px; font-size: 9px; margin-top: 4px;">
                ${field('Frete Peso', formatMoney(doc.fretePeso), 25)}
                ${field('Frete Valor', formatMoney(doc.freteValor), 25)}
                ${field('ICMS', formatMoney(doc.icms), 25)}
                ${field('Pedágio', formatMoney(doc.pedagio), 25)}
              </div>
              <div style="display: flex; gap: 6px; font-size: 9px; margin-top: 4px;">
                ${field('GRIS', formatMoney(doc.gris), 25)}
                ${field('SEC/CAT', formatMoney(doc.secat), 25)}
                ${field('Desconto', formatMoney(doc.desconto), 25)}
                ${field('Outros', formatMoney(doc.outros), 25)}
              </div>
            </div>
          </div>
        </div>

        <!-- Impostos + Observações -->
        <div style="display: flex; border-top: 1px solid #fde68a;">
          <div style="width: 50%; padding: 6px 8px; border-right: 1px solid #fde68a;">
            <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold; margin-bottom: 3px;">Impostos</div>
            <div style="display: flex; gap: 4px; font-size: 8px;">
              <div style="flex: 1; padding: 3px 5px; background: #fef3c7; border-radius: 3px;">
                <div style="color: #555;">Alíq. ICMS</div>
                <div style="font-weight: bold; font-size: 11px;">${issAliq}%</div>
              </div>
              <div style="flex: 1; padding: 3px 5px; background: #fef3c7; border-radius: 3px;">
                <div style="color: #555;">Base ICMS</div>
                <div style="font-weight: bold; font-size: 11px;">${formatMoney(doc.totalAmount)}</div>
              </div>
              <div style="flex: 1; padding: 3px 5px; background: #fef3c7; border-radius: 3px;">
                <div style="color: #555;">Valor ICMS</div>
                <div style="font-weight: bold; font-size: 11px;">${formatMoney(doc.icms)}</div>
              </div>
            </div>
          </div>
          <div style="width: 50%; padding: 6px 8px;">
            <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold; margin-bottom: 3px;">Observações</div>
            <div style="font-size: 8.5px; color: #555;">Documento emitido em conformidade com o CT-e. Prestação de serviço de transporte conforme legislação vigente. Mercadoria entregue ao destinatário no prazo contratual.</div>
          </div>
        </div>

        <!-- Chave de Acesso -->
        <div style="padding: 6px 8px; border-top: 1px solid #fde68a;">
          <div style="font-size: 7.5px; color: #92400e; text-transform: uppercase; font-weight: bold; margin-bottom: 3px;"># Chave de Acesso para Consulta</div>
          <div class="dacte-key">${escapeHtml(doc.accessKey ? (doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey) : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000')}</div>
          <div style="text-align: center; font-size: 7.5px; color: #555; font-style: italic; margin-top: 3px;">Consulta em www.cte.fazenda.gov.br/portal</div>
        </div>
      </div>
    </div>
  `;
}

/** NFS-e — DANFSE (Documento Auxiliar da Nota Fiscal de Serviços Eletrônica, identidade violeta) */
function renderDanfeNFSeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  const municipalCode = doc.municipalCode || '4314902';
  const serviceCode = doc.serviceCode || '1.05';
  const issAliquot = doc.issAliquot || 5;
  const issRetained = doc.issRetained ? 'Sim' : 'Não';
  const rpsNumber = doc.rpsNumber || '-';
  const rpsSeries = doc.rpsSeries || 'NF';
  const verificationCode = doc.verificationCode || 'ABC123XYZ';
  const serviceDescription = doc.serviceDescription || doc.items?.[0]?.description || 'Prestação de serviço conforme contratado. Detalhes da execução descritos em contrato anexo.';
  const issValue = ((doc.totalAmount || 0) * issAliquot) / 100;

  const field = (label: string, value: string | number | undefined | null, w: number, highlight = false) =>
    `<div style="padding: 4px 6px; width: ${w}%; ${highlight ? 'background: #f5f3ff;' : ''}">
       <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">${escapeHtml(label)}</div>
       <div style="font-weight: bold; font-size: ${highlight ? '11px' : '9.5px'}; ${highlight ? 'color: #4c1d95;' : ''}">${escapeHtml(String(value ?? '-'))}</div>
     </div>`;

  return `
    <div class="danfe-page">
      <div class="danfe-box danfe-nfse">
        <!-- Header -->
        <div class="nfse-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="nfse-icon">📊</div>
            <div>
              <div class="nfse-title">DANFSE</div>
              <div class="nfse-subtitle">Documento Auxiliar da Nota Fiscal de Serviços Eletrônica</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 9px;">
            <div><span style="color: #ddd6fe;">NFS-e Nº:</span> <span style="font-weight: bold; font-size: 14px;">${escapeHtml(doc.number || '000.000')}</span></div>
            <div><span style="color: #ddd6fe;">RPS:</span> <span style="font-weight: bold;">${escapeHtml(rpsNumber)} / Série ${escapeHtml(rpsSeries)}</span></div>
          </div>
        </div>

        <!-- Identificação -->
        <div class="nfse-ident">
          ${field('Data de Emissão', formatDate(doc.issueDate), 25)}
          ${field('Competência', formatDate(doc.issueDate), 25)}
          ${field('Cód. Município', municipalCode, 25)}
          ${field('Natureza da Operação', 'Tributação no município', 25)}
        </div>

        <!-- Prestador -->
        <div class="nfse-section">
          <div class="nfse-section-title">🏢 Prestador de Serviços</div>
          <div class="nfse-block">
            <div style="width: 66.66%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Razão Social</div>
              <div style="font-weight: bold; font-size: 11px;">${escapeHtml(doc.issuerName || 'RAZÃO SOCIAL DO PRESTADOR')}</div>
            </div>
            <div style="width: 33.34%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">CNPJ/CPF</div>
              <div style="font-weight: bold; font-family: monospace; font-size: 10px;">${escapeHtml(doc.issuerDocument || '00.000.000/0001-00')}</div>
            </div>
            <div style="width: 33.33%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Inscrição Municipal</div>
              <div style="font-weight: bold; font-family: monospace; font-size: 9.5px;">${escapeHtml(doc.issuerIM || '0000000')}</div>
            </div>
            <div style="width: 33.33%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Endereço</div>
              <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.issuerAddress || 'Rua / Avenida, nº 0')}</div>
            </div>
            <div style="width: 33.34%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Município / UF</div>
              <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.issuerCity || 'Cidade')} / ${escapeHtml(doc.issuerState || 'UF')}</div>
            </div>
          </div>
        </div>

        <!-- Tomador -->
        <div class="nfse-section">
          <div class="nfse-section-title">👤 Tomador de Serviços</div>
          <div class="nfse-block">
            <div style="width: 66.66%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Razão Social / Nome</div>
              <div style="font-weight: bold; font-size: 11px;">${escapeHtml(doc.recipientName || 'Consumidor Final')}</div>
            </div>
            <div style="width: 33.34%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">CNPJ/CPF</div>
              <div style="font-weight: bold; font-family: monospace; font-size: 10px;">${escapeHtml(doc.recipientDocument || '000.000.000-00')}</div>
            </div>
            <div style="width: 33.33%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Endereço</div>
              <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.recipientAddress || 'Não Informado')}</div>
            </div>
            <div style="width: 33.33%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">Município / UF</div>
              <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.recipientCity || 'Cidade')} / ${escapeHtml(doc.recipientState || 'UF')}</div>
            </div>
            <div style="width: 33.34%;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold;">E-mail</div>
              <div style="font-weight: bold; font-size: 9.5px;">${escapeHtml(doc.recipientEmail || 'Não Informado')}</div>
            </div>
          </div>
        </div>

        <!-- Serviço -->
        <div class="nfse-section">
          <div class="nfse-section-title">🌐 Descrição do Serviço</div>
          <div style="padding: 4px 6px;">
            <div style="display: flex; gap: 6px; font-size: 9px; margin-bottom: 4px;">
              ${field('Código do Serviço (LC 116)', serviceCode, 33.33)}
              ${field('Atividade Municipal', serviceCode, 33.33)}
              ${field('Local da Prestação', 'No Município', 33.34)}
            </div>
            <div style="margin-top: 4px;">
              <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold; margin-bottom: 2px;">Discriminação dos Serviços</div>
              <div class="nfse-desc">${escapeHtml(serviceDescription)}</div>
            </div>
          </div>
        </div>

        <!-- Valores + Tributos -->
        <div class="nfse-section">
          <div class="nfse-section-title">🧮 Valores e Tributos</div>
          <div style="padding: 4px 0; display: flex; flex-wrap: wrap;">
            ${field('Valor dos Serviços', formatMoney(doc.totalAmount), 25, true)}
            ${field('(-) Descontos', formatMoney(doc.discountAmount), 25)}
            ${field('(-) Retenções Federais', formatMoney(doc.federalRetentions), 25)}
            ${field('(=) Valor Líquido', formatMoney((doc.totalAmount || 0) - (doc.discountAmount || 0)), 25, true)}
            ${field('Base de Cálculo ISS', formatMoney(doc.totalAmount), 25)}
            ${field('Alíquota ISS', `${issAliquot}%`, 25)}
            ${field('Valor do ISS', formatMoney(issValue), 25, true)}
            ${field('ISS Retido', issRetained, 25)}
          </div>
        </div>

        <!-- Verificação -->
        <div style="padding: 6px 8px;">
          <div style="font-size: 7.5px; color: #5b21b6; text-transform: uppercase; font-weight: bold; margin-bottom: 3px;"># Código de Verificação de Autenticidade</div>
          <div class="nfse-key">${escapeHtml(verificationCode)}</div>
          <div style="text-align: center; font-size: 7.5px; color: #555; font-style: italic; margin-top: 3px;">Consulte a autenticidade no portal da Prefeitura Municipal ou em <b style="color: #5b21b6;">www.nfse.gov.br</b></div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #ddd6fe; font-size: 7.5px; color: #555; font-style: italic;">
            <strong style="color: #4c1d95;">Documento emitido por ME/EPP optante pelo Simples Nacional.</strong>
            Não gera direito a crédito fiscal de IPI. ISS devido conforme legislação municipal vigente.
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateDanfeBatchHtml(docsList: any[]): string {
  const renderedPages = docsList.map((doc, idx) => renderDanfeCardHtml(doc, idx, docsList.length)).join('');
  const totalAmount = docsList.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANFE em Lote (${docsList.length} Documentos) - NFView</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, sans-serif;
      color: #000;
      background: #e2e8f0;
      font-size: 9px;
      padding: 0;
      margin: 0;
    }
    .danfe-page {
      page-break-after: always;
      break-after: page;
      padding: 16px 8px;
      display: flex;
      justify-content: center;
      background: #e2e8f0;
    }
    .danfe-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .danfe-box {
      border: 1.5px solid #000;
      padding: 8px;
      background: #fff;
      width: 100%;
      max-width: 800px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header-stub {
      border-bottom: 1px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .grid { display: flex; }
    .border-b { border-bottom: 1px solid #000; }
    .border-r { border-right: 1px solid #000; }
    .border-all { border: 1px solid #000; }
    .p-1 { padding: 4px; }
    .p-2 { padding: 8px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .title-sec {
      font-size: 8px;
      font-weight: bold;
      margin-top: 6px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .barcode-line {
      height: 36px;
      background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px);
      margin: 4px 0;
    }
    .top-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f172a;
      color: #fff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .top-toolbar-btn {
      padding: 9px 20px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .top-toolbar-btn:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
    }

    /* === NFC-e (cupom fiscal verde) === */
    .danfe-nfce {
      max-width: 380px !important;
      font-family: 'Courier New', monospace;
      background: #fff;
      color: #000;
      padding: 0 !important;
    }
    .nfce-header {
      text-align: center;
      border-bottom: 2px dashed #047857;
      padding: 8px 6px 6px;
    }
    .nfce-icon { font-size: 22px; margin-bottom: 2px; }
    .nfce-title {
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 0.5px;
      color: #065f46;
    }
    .nfce-subtitle {
      font-size: 7.5px;
      color: #047857;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .nfce-issuer { font-weight: bold; font-size: 9px; margin-top: 3px; }
    .nfce-issuer-doc { font-size: 8px; color: #555; }
    .nfce-docinfo {
      display: flex; justify-content: space-between;
      padding: 4px 6px; font-size: 8px;
      border-bottom: 1px dashed #047857;
    }
    .nfce-docinfo > div { text-align: center; }
    .nfce-docinfo > div:first-child { text-align: left; }
    .nfce-docinfo > div:last-child { text-align: right; }
    .nfce-label { color: #555; }
    .nfce-value-lg { font-weight: bold; font-size: 12px; }
    .nfce-tiny { font-size: 7.5px; color: #555; }
    .nfce-section {
      padding: 4px 6px;
      border-bottom: 1px dashed #047857;
    }
    .nfce-section-title {
      font-size: 8px;
      font-weight: bold;
      color: #047857;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .nfce-total-row {
      display: flex; justify-content: space-between;
      font-size: 13px; font-weight: 900;
      color: #064e3b;
      margin-top: 4px; padding-top: 4px;
      border-top: 1px solid #047857;
    }
    .nfce-key {
      font-family: 'Courier New', monospace;
      font-size: 8px;
      font-weight: bold;
      text-align: center;
      margin-top: 4px;
      word-break: break-all;
    }
    .nfce-footer {
      text-align: center;
      font-size: 8px;
      color: #065f46;
      padding: 6px;
      line-height: 1.5;
    }

    /* === CT-e (DACTE âmbar) === */
    .danfe-dacte {
      max-width: 1100px !important;
      border: 2px solid #d97706 !important;
      background: #fff;
      padding: 0 !important;
    }
    .dacte-header {
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
      color: #fff;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dacte-icon {
      width: 30px; height: 30px;
      background: #fff; color: #d97706;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .dacte-title {
      font-weight: 900;
      font-size: 16px;
      letter-spacing: 1px;
      line-height: 1;
    }
    .dacte-subtitle {
      font-size: 8px;
      opacity: 0.95;
      margin-top: 2px;
    }
    .dacte-tipo-row {
      display: flex;
      border-bottom: 2px solid #d97706;
    }
    .dacte-emitente {
      display: flex; align-items: center; gap: 8px;
      background: #fef3c7;
      padding: 6px 10px;
      border-bottom: 1px solid #fde68a;
    }
    .dacte-section-title {
      background: #fef3c7;
      padding: 4px 8px;
      font-size: 8px;
      font-weight: bold;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dacte-partes {
      display: flex;
      border-bottom: 1px solid #fde68a;
    }
    .dacte-key {
      font-family: 'Courier New', monospace;
      font-size: 10px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      background: #fef3c7;
      padding: 4px;
      border: 1px solid #fde68a;
      border-radius: 2px;
    }

    /* === NFS-e (DANFSE violeta) === */
    .danfe-nfse {
      max-width: 800px !important;
      border: 2px solid #6d28d9 !important;
      background: #fff;
      padding: 0 !important;
    }
    .nfse-header {
      background: linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%);
      color: #fff;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nfse-icon {
      width: 34px; height: 34px;
      background: #fff; color: #6d28d9;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .nfse-title {
      font-weight: 900;
      font-size: 16px;
      letter-spacing: 1px;
      line-height: 1;
    }
    .nfse-subtitle {
      font-size: 8px;
      opacity: 0.95;
      margin-top: 2px;
    }
    .nfse-ident {
      display: flex;
      border-bottom: 2px solid #6d28d9;
    }
    .nfse-section {
      border-bottom: 1px solid #ddd6fe;
    }
    .nfse-section-title {
      background: #ede9fe;
      padding: 4px 8px;
      font-size: 8px;
      font-weight: bold;
      color: #5b21b6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nfse-block {
      display: flex; flex-wrap: wrap;
      padding: 4px 0;
    }
    .nfse-desc {
      padding: 6px 8px;
      border: 1px solid #ddd6fe;
      background: #faf5ff;
      font-size: 9.5px;
      line-height: 1.4;
      min-height: 50px;
      white-space: pre-wrap;
    }
    .nfse-key {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      background: #ede9fe;
      padding: 6px;
      border: 1px solid #c4b5fd;
      border-radius: 2px;
    }

    @media print {
      body {
        background: #fff !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .danfe-page {
        padding: 0 !important;
        background: #fff !important;
      }
      .danfe-box {
        box-shadow: none !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      .danfe-nfce { border: 2px dashed #047857 !important; }
      .danfe-dacte { border: 2px solid #d97706 !important; }
      .danfe-nfse { border: 2px solid #6d28d9 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print top-toolbar">
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="background: #2563eb; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
        📄
      </div>
      <div>
        <div style="font-weight: bold; font-size: 14px;">Exportação de Documentos Fiscais (${docsList.length} notas)</div>
        <div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span>Valor Total: <b>R$ ${totalAmount.toFixed(2)}</b></span>
          <span>•</span>
          ${(() => {
            const counts: Record<string, number> = {};
            docsList.forEach(d => {
              const t = String(d.type || 'NFE').toUpperCase();
              counts[t] = (counts[t] || 0) + 1;
            });
            const colors: Record<string, string> = {
              NFE: '#60a5fa', NFCE: '#10b981', CTE: '#f59e0b', NFSE: '#a78bfa',
            };
            return Object.entries(counts)
              .map(([t, c]) => `<span style="background:${colors[t] || '#94a3b8'};color:#fff;padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:bold;">${c}× ${t}</span>`)
              .join(' ');
          })()}
        </div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <button class="top-toolbar-btn" onclick="window.print()">
        🖨️ Imprimir / Salvar Todas em PDF
      </button>
      <button onclick="window.close()" style="padding: 9px 14px; background: #334155; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
        Fechar
      </button>
    </div>
  </div>

  <div style="max-width: 860px; margin: 0 auto;">
    ${renderedPages}
  </div>

  <script>
    // Auto trigger print prompt if requested via query param
    if (new URLSearchParams(window.location.search).get('autoprint') === 'true') {
      setTimeout(() => window.print(), 350);
    }
  </script>
</body>
</html>`;
}

router.get('/:id/print', async (req, res) => {
  try {
    const doc = await documentsRepository.findById(req.params.id);
    if (!doc) {
      return res.status(404).send('Documento não encontrado.');
    }

    const html = generateDanfeBatchHtml([doc]);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[DocumentsRoute] Error generating print HTML:', error);
    res.status(500).send('Erro ao gerar visualização de impressão.');
  }
});

export default router;
