import { Router } from 'express';
import { documentsRepository } from '../repositories/documents.repository';
import { storageService } from '../services/storage.service';
import { parseFiscalDocument } from '../../core/parsers';
import { db } from '../../db';
import { documents } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { escapeHtml } from '../utils/escapeHtml';
import { formatDate, formatTime, formatMoney, formatModFrete, formatCnpjCpf, formatCep, formatPhone, getPaymentLabel, renderQrCodeSvg } from '../../core/danfe/helpers';

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

    let enrichedDoc: any = { ...doc };

    if (doc.rawXmlPath) {
      try {
        const xmlContent = await storageService.readXml(doc.rawXmlPath);
        const parsed = parseFiscalDocument(xmlContent, doc.type as any, doc.rawXmlPath);
        if (parsed) {
          if (parsed.billing && !doc.billing) {
            await db.update(documents).set({ billing: parsed.billing as any }).where(eq(documents.id, doc.id)).catch(() => {});
          }
          enrichedDoc = {
            ...enrichedDoc,
            issuer: parsed.issuer || (doc as any).issuer,
            recipient: parsed.recipient || (doc as any).recipient,
            transport: parsed.transport,
            protocol: parsed.protocol,
            operationNature: parsed.operationNature,
            exitDate: parsed.exitDate,
            exitTime: parsed.exitTime,
            additionalInfo: parsed.additionalInfo,
            fiscoInfo: parsed.fiscoInfo,
            rpsNumber: parsed.rpsNumber || (doc as any).rpsNumber,
            rpsSeries: parsed.rpsSeries || (doc as any).rpsSeries,
            verificationCode: parsed.verificationCode || (doc as any).verificationCode,
            serviceCode: parsed.serviceCode || (doc as any).serviceCode,
            cnaeCode: parsed.cnaeCode || (doc as any).cnaeCode,
            cityServiceCode: parsed.cityServiceCode || (doc as any).cityServiceCode,
            serviceDescription: parsed.serviceDescription || (doc as any).serviceDescription,
            serviceCity: parsed.serviceCity || (doc as any).serviceCity,
            optanteSimplesNacional: parsed.optanteSimplesNacional ?? (doc as any).optanteSimplesNacional,
            regimeEspecialTributacao: parsed.regimeEspecialTributacao || (doc as any).regimeEspecialTributacao,
            exigibilidadeISS: parsed.exigibilidadeISS || (doc as any).exigibilidadeISS,
            sender: parsed.sender || (doc as any).sender,
            shipper: parsed.shipper || (doc as any).shipper,
            receiver: parsed.receiver || (doc as any).receiver,
            cteTomador: parsed.cteTomador || (doc as any).cteTomador,
            cteRoute: parsed.cteRoute || (doc as any).cteRoute,
            cteCargo: parsed.cteCargo || (doc as any).cteCargo,
            cteComponents: parsed.cteComponents || (doc as any).cteComponents,
            cteDocs: parsed.cteDocs || (doc as any).cteDocs,
            cteModal: parsed.cteModal || (doc as any).cteModal,
            cteServiceType: parsed.cteServiceType || (doc as any).cteServiceType,
            cteType: parsed.cteType || (doc as any).cteType,
            cteCst: parsed.cteCst || (doc as any).cteCst,
            cteIcmsAliq: parsed.cteIcmsAliq ?? (doc as any).cteIcmsAliq,
            cteIcmsValue: parsed.cteIcmsValue ?? (doc as any).cteIcmsValue,
            cteIcmsBase: parsed.cteIcmsBase ?? (doc as any).cteIcmsBase,
            cteIcmsReduction: parsed.cteIcmsReduction ?? (doc as any).cteIcmsReduction,
            totals: parsed.totals || (doc as any).totals,
            items: parsed.items && parsed.items.length > 0 ? parsed.items : (doc as any).items || [],
            billing: parsed.billing || (doc as any).billing,
            taxes: parsed.totals?.taxes
              ? Object.entries(parsed.totals.taxes)
                  .filter(([k, v]) => typeof v === 'number' && v > 0 && !k.endsWith('Base') && !k.endsWith('Aliquot') && k !== 'totalTaxes')
                  .map(([k, v]) => ({
                    id: k,
                    documentId: doc.id,
                    taxType: k.toUpperCase(),
                    amount: v as number,
                    base: (parsed.totals?.taxes as any)[`${k}Base`] || (k === 'icms' ? parsed.totals?.icmsBase : undefined),
                  }))
              : (doc as any).taxes || [],
          };
        }
      } catch (err) {
        console.warn(`[DocumentsRoute] Could not on-demand parse XML details for ${escapeHtml(doc.id)}:`, err);
      }
    }

    res.json(enrichedDoc);
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

/** NFC-e — Cupom Fiscal Eletrônico (cupom 80mm, identidade verde) */
function renderDanfeNFCeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
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

function formatRole(role: string): string {
  const map: Record<string, string> = {
    '0': 'Remetente',
    '1': 'Expedidor',
    '2': 'Recebedor',
    '3': 'Destinatário',
    '4': 'Outros',
  };
  return map[role] || 'Remetente';
}

function formatUnit(unit: string): string {
  const map: Record<string, string> = {
    '00': 'M3',
    '01': 'KG',
    '02': 'TON',
    '03': 'UN',
    '04': 'LT',
    '05': 'MMBTU',
  };
  return map[unit] || unit;
}

/** CT-e — DACTE (Conhecimento de Transporte Eletrônico, padrão oficial SEFAZ) */
function renderDanfeDACTEHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  // Emitente / Transportadora
  const issuerName = doc.issuer?.name || doc.issuerName || 'TRANSPORTADORA';
  const issuerDoc = formatCnpjCpf(doc.issuer?.document || doc.issuerDocument);
  const issuerIE = doc.issuer?.ie || doc.issuerIE || '-';
  const issuerStreet = doc.issuer?.address?.street 
    ? `${doc.issuer.address.street}${doc.issuer.address.number ? ', ' + doc.issuer.address.number : ''}${doc.issuer.address.complement ? ' - ' + doc.issuer.address.complement : ''}`
    : (doc.issuerAddress || '-');
  const issuerBairro = doc.issuer?.address?.neighborhood || '-';
  const issuerCep = formatCep(doc.issuer?.address?.zipCode);
  const issuerCity = doc.issuer?.address?.city || doc.issuerCity || '-';
  const issuerState = doc.issuer?.address?.state || doc.issuerState || '-';
  const issuerPhone = formatPhone(doc.issuer?.phone);

  // Remetente (Sender)
  const senderName = doc.sender?.name || '-';
  const senderDoc = formatCnpjCpf(doc.sender?.document);
  const senderIE = doc.sender?.ie || '-';
  const senderStreet = doc.sender?.address?.street 
    ? `${doc.sender.address.street}${doc.sender.address.number ? ', ' + doc.sender.address.number : ''}${doc.sender.address.complement ? ' - ' + doc.sender.address.complement : ''}`
    : '-';
  const senderBairro = doc.sender?.address?.neighborhood || '-';
  const senderCep = formatCep(doc.sender?.address?.zipCode);
  const senderCity = doc.sender?.address?.city || '-';
  const senderState = doc.sender?.address?.state || '-';

  // Destinatário (Recipient)
  const destName = doc.recipient?.name || doc.recipientName || '-';
  const destDoc = formatCnpjCpf(doc.recipient?.document || doc.recipientDocument);
  const destIE = doc.recipient?.ie || doc.recipientIE || '-';
  const destStreet = doc.recipient?.address?.street 
    ? `${doc.recipient.address.street}${doc.recipient.address.number ? ', ' + doc.recipient.address.number : ''}${doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''}`
    : (doc.recipientAddress || '-');
  const destBairro = doc.recipient?.address?.neighborhood || '-';
  const destCep = formatCep(doc.recipient?.address?.zipCode);
  const destCity = doc.recipient?.address?.city || doc.recipientCity || '-';
  const destState = doc.recipient?.address?.state || doc.recipientState || '-';

  // Expedidor (Shipper)
  const expedName = doc.shipper?.name || '-';
  const expedDoc = formatCnpjCpf(doc.shipper?.document);
  const expedIE = doc.shipper?.ie || '-';
  const expedStreet = doc.shipper?.address?.street 
    ? `${doc.shipper.address.street}${doc.shipper.address.number ? ', ' + doc.shipper.address.number : ''}`
    : '-';
  const expedCity = doc.shipper?.address?.city || '-';
  const expedState = doc.shipper?.address?.state || '-';

  // Recebedor (Receiver)
  const recebName = doc.receiver?.name || '-';
  const recebDoc = formatCnpjCpf(doc.receiver?.document);
  const recebIE = doc.receiver?.ie || '-';
  const recebStreet = doc.receiver?.address?.street 
    ? `${doc.receiver.address.street}${doc.receiver.address.number ? ', ' + doc.receiver.address.number : ''}`
    : '-';
  const recebCity = doc.receiver?.address?.city || '-';
  const recebState = doc.receiver?.address?.state || '-';

  // Tomador do Serviço
  const tomador = doc.cteTomador || {};
  const tomadorRole = String(tomador.role ?? '0');
  const tomadorName = tomador.name || (tomadorRole === '0' ? senderName : (tomadorRole === '3' ? destName : '-'));
  const tomadorDoc = formatCnpjCpf(tomador.document || (tomadorRole === '0' ? doc.sender?.document : (tomadorRole === '3' ? doc.recipient?.document : undefined)));
  const tomadorIE = tomador.ie || (tomadorRole === '0' ? senderIE : (tomadorRole === '3' ? destIE : '-'));
  const tomadorCity = tomador.address?.city || (tomadorRole === '0' ? senderCity : (tomadorRole === '3' ? destCity : '-'));
  const tomadorState = tomador.address?.state || (tomadorRole === '0' ? senderState : (tomadorRole === '3' ? destState : '-'));

  // Rota
  const route = doc.cteRoute || {};
  const startCity = route.startCity || doc.sender?.address?.city || issuerCity;
  const startState = route.startState || doc.sender?.address?.state || issuerState;
  const endCity = route.endCity || doc.recipient?.address?.city || '-';
  const endState = route.endState || doc.recipient?.address?.state || '-';

  // Carga
  const cargo = doc.cteCargo || {};
  const proPred = cargo.predominantProduct || 'CARGA GERAL';
  const outCat = cargo.otherCharacteristics || '-';
  const vCarga = cargo.cargoValue ?? doc.totalAmount ?? 0;
  const quantities = cargo.quantities || [];

  // Componentes do Frete
  const components = doc.cteComponents && doc.cteComponents.length > 0 ? doc.cteComponents : [
    { name: 'FRETE VALOR', amount: doc.totalAmount || 0 }
  ];
  const totalPrestacao = doc.totals?.total ?? doc.totalAmount ?? 0;
  const valorReceber = totalPrestacao;

  // Tributos ICMS
  const icmsCst = doc.cteCst || '00';
  const icmsBase = doc.cteIcmsBase ?? doc.totals?.icmsBase ?? (doc.totals?.taxes?.icmsBase ?? 0);
  const icmsAliq = doc.cteIcmsAliq ?? (doc.totals?.taxes?.icmsAliquot ?? 0);
  const icmsValor = doc.cteIcmsValue ?? doc.totals?.taxes?.icms ?? 0;
  const icmsRed = doc.cteIcmsReduction ?? 0;

  // Modal Rodoviário
  const modal = doc.cteModal || {};
  const rntrc = modal.rntrc || '-';
  const ciot = modal.ciot || '-';
  const placa = modal.vehiclePlate || '-';
  const ufVeic = modal.vehicleUf || '-';
  const motorista = modal.driverName || '-';
  const motoristaCpf = formatCnpjCpf(modal.driverCpf);

  // Documentos Originários (NF-e)
  const docsList = doc.cteDocs || [];

  // Identificação e Chave
  const accessKey = doc.accessKey || '00000000000000000000000000000000000000000000';
  const formattedKey = accessKey.match(/.{1,4}/g)?.join(' ') || accessKey;
  const number = doc.number || '000.000';
  const series = doc.series || '1';
  const issueDateStr = doc.issueDate ? formatDate(doc.issueDate) : '-';
  const issueTimeStr = doc.issueDate ? formatTime(doc.issueDate) : '';
  const protocolStr = doc.protocol || '-';
  const cfop = doc.items?.[0]?.cfop || '5353';
  const natOp = doc.operationNature || 'PRESTACAO DE SERVICO DE TRANSPORTE';

  return `
    <div class="danfe-page">
      <div class="danfe-box" style="font-size: 7.5px; line-height: 1.15;">
        <!-- CABEÇALHO DACTE -->
        <div style="display: flex; border-bottom: 1px solid #000;">
          <!-- Emitente -->
          <div style="width: 42%; padding: 6px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">${escapeHtml(issuerName)}</div>
            <div style="font-size: 7.5px; color: #333; margin-top: 2px; line-height: 1.2;">
              <div>${escapeHtml(issuerStreet)} - ${escapeHtml(issuerBairro)}</div>
              <div>CEP: ${escapeHtml(issuerCep)} - ${escapeHtml(issuerCity)} / ${escapeHtml(issuerState)}</div>
              ${issuerPhone !== '-' ? `<div>Fone: ${escapeHtml(issuerPhone)}</div>` : ''}
              <div style="font-family: monospace; margin-top: 2px;"><b>CNPJ:</b> ${escapeHtml(issuerDoc)} | <b>IE:</b> ${escapeHtml(issuerIE)}</div>
            </div>
          </div>

          <!-- DACTE Box -->
          <div style="width: 20%; padding: 4px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: space-between; text-align: center; background: #fafafa;">
            <div>
              <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">DACTE</div>
              <div style="font-size: 6px; text-transform: uppercase; color: #555; font-weight: bold; line-height: 1.1;">
                Documento Auxiliar do Conhecimento de Transporte Eletrônico
              </div>
            </div>
            <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; margin: 2px 0; font-weight: bold; font-size: 6.5px;">
              MODAL RODOVIÁRIO
            </div>
            <div class="grid" style="font-size: 7px; text-align: left;">
              <div style="width: 50%;"><b>MOD:</b> 57</div>
              <div style="width: 50%;"><b>SÉRIE:</b> ${escapeHtml(series)}</div>
              <div style="width: 100%; font-size: 8.5px; font-family: monospace; font-weight: bold; margin-top: 2px;"><b>Nº:</b> ${escapeHtml(number)}</div>
              <div style="width: 100%; font-size: 6px; color: #555;">FL: 1/1</div>
            </div>
          </div>

          <!-- Código de Barras e Chave -->
          <div style="width: 38%; padding: 6px; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="height: 32px; background: #000; display: flex; align-items: center; justify-content: center; padding: 1px;">
              <div style="width: 100%; height: 100%; background: #fff; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 7px; letter-spacing: 2px; font-weight: bold;">
                ||| | |||| || ||| ||||| ||| || |||| ||| |||| ||||
              </div>
            </div>
            <div style="margin-top: 3px;">
              <div style="font-size: 6.5px; text-transform: uppercase; font-weight: bold; color: #555;">CHAVE DE ACESSO</div>
              <div style="font-family: monospace; font-size: 8px; font-weight: bold; letter-spacing: -0.2px;">${escapeHtml(formattedKey)}</div>
            </div>
            <div style="margin-top: 2px; padding-top: 2px; border-top: 1px solid #eee; font-size: 6px; color: #666;">
              Consulta de autenticidade no portal nacional do CT-e: <b>www.cte.fazenda.gov.br/portal</b>
            </div>
          </div>
        </div>

        <!-- PROTOCOLO E NATUREZA DA OPERAÇÃO -->
        <div class="grid" style="border-bottom: 1px solid #000; font-size: 7px;">
          <div style="width: 62%; padding: 3px 6px; border-right: 1px solid #000;">
            <div style="font-size: 6px; text-transform: uppercase; font-weight: bold; color: #555;">NATUREZA DA OPERAÇÃO / CFOP</div>
            <div style="font-weight: bold; text-transform: uppercase;">${escapeHtml(cfop)} - ${escapeHtml(natOp)}</div>
          </div>
          <div style="width: 38%; padding: 3px 6px;">
            <div style="font-size: 6px; text-transform: uppercase; font-weight: bold; color: #555;">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
            <div style="font-family: monospace; font-weight: bold;">${escapeHtml(protocolStr)}</div>
          </div>
        </div>

        <!-- INÍCIO E FIM DA PRESTAÇÃO -->
        <div class="grid" style="border-bottom: 1px solid #000; font-size: 7px;">
          <div style="width: 50%; padding: 3px 6px; border-right: 1px solid #000;">
            <div style="font-size: 6px; text-transform: uppercase; font-weight: bold; color: #555;">INÍCIO DA PRESTAÇÃO (ORIGEM)</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(startCity)} / ${escapeHtml(startState)}</div>
          </div>
          <div style="width: 50%; padding: 3px 6px;">
            <div style="font-size: 6px; text-transform: uppercase; font-weight: bold; color: #555;">TÉRMINO DA PRESTAÇÃO (DESTINO)</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(endCity)} / ${escapeHtml(endState)}</div>
          </div>
        </div>

        <!-- TOMADOR DO SERVIÇO -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec" style="display: flex; justify-content: space-between;">
            <span>TOMADOR DO SERVIÇO</span>
            <span style="font-weight: normal; font-size: 6px;">
              [${tomadorRole === '0' ? 'X' : ' '}] Remetente &nbsp;&nbsp;
              [${tomadorRole === '1' ? 'X' : ' '}] Expedidor &nbsp;&nbsp;
              [${tomadorRole === '2' ? 'X' : ' '}] Recebedor &nbsp;&nbsp;
              [${tomadorRole === '3' ? 'X' : ' '}] Destinatário &nbsp;&nbsp;
              [${tomadorRole === '4' ? 'X' : ' '}] Outros
            </span>
          </div>
          <div class="grid" style="padding: 3px 6px; font-size: 7px;">
            <div style="width: 45%;"><b>Nome/Razão Social:</b> ${escapeHtml(tomadorName)}</div>
            <div style="width: 25%;"><b>CNPJ/CPF:</b> <span style="font-family: monospace;">${escapeHtml(tomadorDoc)}</span></div>
            <div style="width: 30%;"><b>Inscrição Estadual:</b> ${escapeHtml(tomadorIE)}</div>
            <div style="width: 70%; margin-top: 1px;"><b>Município/UF:</b> ${escapeHtml(tomadorCity)} / ${escapeHtml(tomadorState)}</div>
            <div style="width: 30%; margin-top: 1px;"><b>Tipo:</b> ${formatRole(tomadorRole)}</div>
          </div>
        </div>

        <!-- PARTES ENVOLVIDAS: REMETENTE E DESTINATÁRIO -->
        <div class="grid" style="border-bottom: 1px solid #000; font-size: 7px;">
          <!-- Remetente -->
          <div style="width: 50%; padding: 4px 6px; border-right: 1px solid #000;">
            <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">REMETENTE</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(senderName)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 60%;"><b>CNPJ/CPF:</b> <span style="font-family: monospace;">${escapeHtml(senderDoc)}</span></div>
              <div style="width: 40%;"><b>IE:</b> ${escapeHtml(senderIE)}</div>
            </div>
            <div style="margin-top: 1px;"><b>Endereço:</b> ${escapeHtml(senderStreet)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 40%;"><b>Bairro:</b> ${escapeHtml(senderBairro)}</div>
              <div style="width: 35%;"><b>Mun/UF:</b> ${escapeHtml(senderCity)}/${escapeHtml(senderState)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(senderCep)}</div>
            </div>
          </div>

          <!-- Destinatário -->
          <div style="width: 50%; padding: 4px 6px;">
            <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">DESTINATÁRIO</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(destName)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 60%;"><b>CNPJ/CPF:</b> <span style="font-family: monospace;">${escapeHtml(destDoc)}</span></div>
              <div style="width: 40%;"><b>IE:</b> ${escapeHtml(destIE)}</div>
            </div>
            <div style="margin-top: 1px;"><b>Endereço:</b> ${escapeHtml(destStreet)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 40%;"><b>Bairro:</b> ${escapeHtml(destBairro)}</div>
              <div style="width: 35%;"><b>Mun/UF:</b> ${escapeHtml(destCity)}/${escapeHtml(destState)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(destCep)}</div>
            </div>
          </div>
        </div>

        <!-- EXPEDIDOR E RECEBEDOR (SE HOUVER) -->
        ${(expedName !== '-' || recebName !== '-') ? `
          <div class="grid" style="border-bottom: 1px solid #000; font-size: 7px; background: #fafafa;">
            <div style="width: 50%; padding: 3px 6px; border-right: 1px solid #000;">
              <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">EXPEDIDOR</div>
              <div style="font-weight: bold;">${escapeHtml(expedName)}</div>
              <div><b>CNPJ/CPF:</b> ${escapeHtml(expedDoc)} | <b>IE:</b> ${escapeHtml(expedIE)}</div>
              <div><b>Endereço:</b> ${escapeHtml(expedStreet)} - ${escapeHtml(expedCity)}/${escapeHtml(expedState)}</div>
            </div>
            <div style="width: 50%; padding: 3px 6px;">
              <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">RECEBEDOR</div>
              <div style="font-weight: bold;">${escapeHtml(recebName)}</div>
              <div><b>CNPJ/CPF:</b> ${escapeHtml(recebDoc)} | <b>IE:</b> ${escapeHtml(recebIE)}</div>
              <div><b>Endereço:</b> ${escapeHtml(recebStreet)} - ${escapeHtml(recebCity)}/${escapeHtml(recebState)}</div>
            </div>
          </div>
        ` : ''}

        <!-- INFORMAÇÕES DA CARGA -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">INFORMAÇÕES DA CARGA</div>
          <div class="grid" style="padding: 3px 6px; font-size: 7px; border-bottom: 1px solid #eee;">
            <div style="width: 45%;"><b>Produto Predominante:</b> <span style="font-weight: bold; text-transform: uppercase;">${escapeHtml(proPred)}</span></div>
            <div style="width: 30%;"><b>Outras Características:</b> ${escapeHtml(outCat)}</div>
            <div style="width: 25%;"><b>Valor Total Carga:</b> <span style="font-weight: bold;">R$ ${vCarga.toFixed(2)}</span></div>
          </div>
          <div style="padding: 3px 6px; background: #fafafa; display: flex; flex-wrap: wrap; gap: 12px; font-size: 7px;">
            ${quantities.length > 0 ? quantities.map((q: any) => `
              <div><span style="color: #555; font-weight: bold; text-transform: uppercase;">${escapeHtml(q.measureType)}:</span> <span style="font-family: monospace; font-weight: bold;">${q.quantity.toFixed(q.measureType.includes('VOLUME') ? 0 : 3)} ${formatUnit(q.unit)}</span></div>
            `).join('') : '<div style="color: #666; font-style: italic;">Pesos e volumes não discriminados no XML</div>'}
          </div>
        </div>

        <!-- COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO</div>
          <div style="padding: 3px 6px; display: flex; flex-wrap: wrap; gap: 14px; font-size: 7px; border-bottom: 1px solid #eee;">
            ${components.map((c: any) => `
              <div><span style="color: #555; font-weight: bold; text-transform: uppercase;">${escapeHtml(c.name)}:</span> <span style="font-family: monospace; font-weight: bold;">R$ ${c.amount.toFixed(2)}</span></div>
            `).join('')}
          </div>
          <div class="grid" style="padding: 3px 6px; background: #fafafa; align-items: center;">
            <div style="width: 50%; font-size: 7.5px;">
              <span style="color: #555; font-weight: bold; text-transform: uppercase; margin-right: 4px;">VALOR TOTAL DO SERVIÇO:</span>
              <span style="font-family: monospace; font-weight: bold; font-size: 9px;">R$ ${totalPrestacao.toFixed(2)}</span>
            </div>
            <div style="width: 50%; text-align: right; font-size: 7.5px;">
              <span style="color: #444; font-weight: bold; text-transform: uppercase; margin-right: 4px;">VALOR A RECEBER:</span>
              <span style="font-family: monospace; font-weight: 900; font-size: 11px;">R$ ${valorReceber.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- INFORMAÇÕES RELATIVAS AO IMPOSTO (ICMS) -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">INFORMAÇÕES RELATIVAS AO IMPOSTO (ICMS)</div>
          <div class="grid text-center" style="padding: 3px; font-size: 7px;">
            <div style="width: 20%; border-right: 1px solid #eee;"><div style="color: #555; font-weight: bold;">SITUAÇÃO TRIBUTÁRIA (CST)</div><div style="font-weight: bold; margin-top: 1px; font-family: monospace;">${escapeHtml(icmsCst)}</div></div>
            <div style="width: 20%; border-right: 1px solid #eee;"><div style="color: #555; font-weight: bold;">BASE DE CÁLCULO (R$)</div><div style="font-weight: bold; margin-top: 1px; font-family: monospace;">${icmsBase > 0 ? icmsBase.toFixed(2) : '0,00'}</div></div>
            <div style="width: 20%; border-right: 1px solid #eee;"><div style="color: #555; font-weight: bold;">ALÍQUOTA (%)</div><div style="font-weight: bold; margin-top: 1px; font-family: monospace;">${icmsAliq > 0 ? `${icmsAliq.toFixed(2)}%` : '0,00%'}</div></div>
            <div style="width: 20%; border-right: 1px solid #eee;"><div style="color: #555; font-weight: bold;">VALOR DO ICMS (R$)</div><div style="font-weight: bold; margin-top: 1px; font-family: monospace;">${icmsValor > 0 ? icmsValor.toFixed(2) : '0,00'}</div></div>
            <div style="width: 20%;"><div style="color: #555; font-weight: bold;">% REDUÇÃO BC</div><div style="font-weight: bold; margin-top: 1px; font-family: monospace;">${icmsRed > 0 ? `${icmsRed.toFixed(2)}%` : '0,00%'}</div></div>
          </div>
        </div>

        <!-- DOCUMENTOS ORIGINÁRIOS (NF-E TRANSPORTADAS) -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">DOCUMENTOS ORIGINÁRIOS (NF-e / NOTAS FISCAIS TRANSPORTADAS)</div>
          <div style="padding: 3px 6px; font-size: 7px;">
            ${docsList.length > 0 ? `
              <div class="grid" style="font-family: monospace; font-size: 6.5px;">
                ${docsList.map((d: any) => `
                  <div style="width: 50%; padding: 2px;">
                    ${d.type === 'NFE' ? `<div><b>NF-e Chave:</b> ${escapeHtml(d.key ? d.key.match(/.{1,4}/g)?.join(' ') : '-')}</div>` : ''}
                    ${d.type === 'NF' ? `<div><b>NF Papel:</b> Nº ${escapeHtml(d.number)} Série ${escapeHtml(d.series || '1')} ${d.amount ? `| R$ ${d.amount.toFixed(2)}` : ''}</div>` : ''}
                    ${d.type === 'OUTROS' ? `<div><b>Outro Doc:</b> Nº ${escapeHtml(d.number || '-')} ${d.amount ? `| R$ ${d.amount.toFixed(2)}` : ''}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : '<div style="color: #666; font-style: italic;">Nenhum documento originário discriminado no XML</div>'}
          </div>
        </div>

        <!-- DADOS ESPECÍFICOS DO MODAL RODOVIÁRIO -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">DADOS ESPECÍFICOS DO MODAL RODOVIÁRIO</div>
          <div class="grid" style="padding: 3px 6px; font-size: 7px;">
            <div style="width: 25%;"><b>RNTRC da Empresa:</b> <span style="font-family: monospace;">${escapeHtml(rntrc)}</span></div>
            <div style="width: 25%;"><b>CIOT:</b> <span style="font-family: monospace;">${escapeHtml(ciot)}</span></div>
            <div style="width: 25%;"><b>Veículo / Placa:</b> <span style="font-family: monospace; text-transform: uppercase;">${escapeHtml(placa)} / ${escapeHtml(ufVeic)}</span></div>
            <div style="width: 25%;"><b>Motorista:</b> ${escapeHtml(motorista)} ${motoristaCpf !== '-' ? `(${escapeHtml(motoristaCpf)})` : ''}</div>
          </div>
        </div>

        <!-- OBSERVAÇÕES E DADOS DO FISCO -->
        <div style="padding: 4px 6px; font-size: 7px;">
          <div style="font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 1px;">OBSERVAÇÕES GERAIS</div>
          <div style="color: #333; line-height: 1.2;">
            ${doc.additionalInfo ? `<div style="white-space: pre-wrap;">${escapeHtml(doc.additionalInfo)}</div>` : ''}
            ${doc.fiscoInfo ? `<div style="white-space: pre-wrap; margin-top: 2px; border-top: 1px solid #eee; padding-top: 2px; font-weight: bold;">[RESERVADO AO FISCO] ${escapeHtml(doc.fiscoInfo)}</div>` : ''}
            ${!doc.additionalInfo && !doc.fiscoInfo ? '<div style="color: #666; font-style: italic;">Sem observações adicionais.</div>' : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/** NFS-e — DANFSE (Documento Auxiliar da Nota Fiscal de Serviços Eletrônica, padrão oficial) */
function renderDanfeNFSeHtml(doc: any, _pageIndex: number, _totalPages: number): string {
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
