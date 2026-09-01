import { DocumentType } from './fiscal.types';

export function detectFiscalDocument(xmlContent: string): DocumentType {
  const contentLower = xmlContent.toLowerCase();
  
  // NFS-e detection (National standard SPED/Sefin, ABRASF, simplified municipal XMLs, etc.)
  if (
    contentLower.includes('<nfse') ||
    contentLower.includes('<infnfse') ||
    contentLower.includes('<compnfse') ||
    contentLower.includes('<consultarnfsresposta') ||
    contentLower.includes('<enviarloterpsenvio') ||
    contentLower.includes('<dps') ||
    contentLower.includes('<infdps') ||
    contentLower.includes('<n_da_nfse') ||
    contentLower.includes('<chavenfse') ||
    contentLower.includes('http://www.sped.fazenda.gov.br/nfse') ||
    contentLower.includes('http://www.abrasf.org.br/nfse.xsd') ||
    (contentLower.includes('<notas>') && contentLower.includes('<data_emissao>'))
  ) {
    return 'NFSE';
  }

  // CT-e detection
  if (
    contentLower.includes('<cteproc') || 
    contentLower.includes('<cte') ||
    contentLower.includes('<infcte')
  ) {
    return 'CTE';
  }

  // NF-e / NFC-e / Inutilização / Eventos
  if (
    contentLower.includes('<proceventonfe') || 
    contentLower.includes('<evento') || 
    contentLower.includes('<nfeproc') || 
    contentLower.includes('<nfe') ||
    contentLower.includes('<retinutnfe') ||
    contentLower.includes('<inutnfe')
  ) {
    if (contentLower.includes('<mod>65</mod>') || contentLower.includes('<mod>65 </mod>')) {
      return 'NFCE';
    }
    return 'NFE';
  }

  return 'UNKNOWN';
}

