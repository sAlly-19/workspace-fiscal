import { renderDanfeNFeHtml } from './danfe-nfe.renderer';
import { renderDanfeNFCeHtml } from './danfe-nfce.renderer';
import { renderDanfeDACTEHtml } from './danfe-cte.renderer';
import { renderDanfeNFSeHtml } from './danfe-nfse.renderer';

export function renderDanfeCardHtml(doc: any, pageIndex: number, totalPages: number): string {
  const docType = String(doc.type || 'NFE').toUpperCase();
  if (docType === 'NFCE') return renderDanfeNFCeHtml(doc, pageIndex, totalPages);
  if (docType === 'CTE') return renderDanfeDACTEHtml(doc, pageIndex, totalPages);
  if (docType === 'NFSE' || docType === 'NFS-E' || docType === 'NFS_E') return renderDanfeNFSeHtml(doc, pageIndex, totalPages);
  return renderDanfeNFeHtml(doc, pageIndex, totalPages);
}

