import { db } from '../../db';
import { documents } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { storageService } from './storage.service';
import { parseFiscalDocument } from '../../core/parsers';
import { escapeHtml } from '../utils/escapeHtml';

/**
 * Enriquece o documento fiscal sob demanda através do parsing de seu XML original.
 */
export async function enrichDocumentFromXml(doc: any): Promise<any> {
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

  return enrichedDoc;
}

