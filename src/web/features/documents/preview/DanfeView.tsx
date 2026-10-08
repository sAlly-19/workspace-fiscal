import { DanfeNFCe } from '../DanfeNFCe';
import { DanfeDACTE } from '../DanfeDACTE';
import { DanfeNFSe } from '../DanfeNFSe';
import { DanfeNFeView } from './DanfeNFeView';

export interface DanfeViewProps {
  doc: any;
  theme: string;
}

// Routes to the appropriate DANFE/DACTE/DANFSE layout based on the document type.
export function DanfeView({ doc, theme }: DanfeViewProps) {
  const docType = String(doc.type || 'NFE').toUpperCase();

  if (docType === 'NFCE') {
    return <DanfeNFCe doc={doc} />;
  }
  if (docType === 'CTE') {
    return <DanfeDACTE doc={doc} />;
  }
  if (docType === 'NFSE' || docType === 'NFS-E' || docType === 'NFS_E') {
    return <DanfeNFSe doc={doc} />;
  }

  // NF-e → Padrão SEFAZ DANFE Oficial
  return <DanfeNFeView doc={doc} theme={theme} />;
}

