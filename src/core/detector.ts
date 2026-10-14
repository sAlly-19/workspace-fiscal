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

  // Explicit CT-e events (prioritized before generic <evento>)
  if (
    contentLower.includes('<proceventocte') ||
    contentLower.includes('<eventocte') ||
    contentLower.includes('<reseventocte') ||
    contentLower.includes('<chcte>')
  ) {
    return 'CTE';
  }

  // Explicit NF-e events
  if (
    contentLower.includes('<proceventonfe') ||
    contentLower.includes('<eventonfe') ||
    contentLower.includes('<reseventonfe') ||
    contentLower.includes('<chnfe>')
  ) {
    if (contentLower.includes('<mod>65</mod>') || contentLower.includes('<mod>65 </mod>')) {
      return 'NFCE';
    }
    return 'NFE';
  }

  // CT-e documents (delimited to avoid matching <cTexto> or other tags)
  if (
    contentLower.includes('<cteproc') || 
    contentLower.includes('<infcte') ||
    contentLower.includes('<rescte') ||
    /<cte[\s>]/i.test(xmlContent)
  ) {
    return 'CTE';
  }

  // NF-e / NFC-e / Inutilização / Generic Events
  if (
    contentLower.includes('<proceventonfe') || 
    contentLower.includes('<evento') || 
    contentLower.includes('<resevento') ||
    contentLower.includes('<nfeproc') || 
    contentLower.includes('<infnfe') ||
    contentLower.includes('<resnfe') ||
    contentLower.includes('<retinutnfe') ||
    contentLower.includes('<inutnfe') ||
    /<nfe[\s>]/i.test(xmlContent)
  ) {
    if (contentLower.includes('<mod>65</mod>') || contentLower.includes('<mod>65 </mod>')) {
      return 'NFCE';
    }
    return 'NFE';
  }

  return 'UNKNOWN';
}

