import fs from 'fs';

export interface SniffedXmlIdentifier {
  type: 'KEY' | 'NFSE';
  accessKey?: string;
  number?: string;
  issuerDocument?: string;
  compositeKey?: string; // `${issuerDocument}:${number}`
}

/**
 * Realiza extração rápida (em até 4 KB de buffer) de identificadores de XML fiscal
 * sem carregar o parser DOM completo. Suporta namespaces XML opcionais (<(?:\w+:)?...>).
 */
export function sniffXmlIdentifier(content: string): SniffedXmlIdentifier | null {
  if (!content || typeof content !== 'string') return null;

  // 1. Chave de 44 dígitos (NF-e, CT-e, NFC-e)
  // 1a. Atributo Id="NFe...", Id="CTe...", Id="NFCe..." ou Id="35..."
  const attrKeyMatch = content.match(/Id\s*=\s*["'](?:NFe|CTe|NFCe)?(\d{44})["']/i);
  if (attrKeyMatch && attrKeyMatch[1]) {
    return { type: 'KEY', accessKey: attrKeyMatch[1] };
  }

  // 1b. Atributo Id de Eventos: Id="ID[tpEvento:6][chNFe:44][nSeq:2]"
  const eventAttrKeyMatch = content.match(/Id\s*=\s*["']ID\d{6}(\d{44})\d{2}["']/i);
  if (eventAttrKeyMatch && eventAttrKeyMatch[1]) {
    return { type: 'KEY', accessKey: eventAttrKeyMatch[1] };
  }

  // 1c. Tags <chNFe>, <chCTe>, <chNFCe> com suporte a namespaces opcionais
  const tagKeyMatch = content.match(/<(?:\w+:)?(?:chNFe|chCTe|chNFCe)[^>]*>(\d{44})<\/(?:\w+:)?(?:chNFe|chCTe|chNFCe)>/i);
  if (tagKeyMatch && tagKeyMatch[1]) {
    return { type: 'KEY', accessKey: tagKeyMatch[1] };
  }

  // 2. Inutilização (NFe / NFCe) via bloco <infInut>
  if (/<(?:\w+:)?(?:infInut|inutNFe|retInutNFe)/i.test(content)) {
    const inutCnpj = content.match(/<(?:\w+:)?CNPJ[^>]*>(\d{14})<\/(?:\w+:)?CNPJ>/i);
    const inutIni = content.match(/<(?:\w+:)?nNFIni[^>]*>(\d+)<\/(?:\w+:)?nNFIni>/i);
    const inutFin = content.match(/<(?:\w+:)?nNFFin[^>]*>(\d+)<\/(?:\w+:)?nNFFin>/i);
    if (inutCnpj && inutIni) {
      const cnpj = inutCnpj[1];
      const ini = inutIni[1];
      const fin = inutFin ? inutFin[1] : ini;
      const num = ini === fin ? ini : `${ini} a ${fin}`;
      return {
        type: 'NFSE',
        number: num,
        issuerDocument: cnpj,
        compositeKey: `${cnpj}:${num}`,
      };
    }
  }

  // 3. NFS-e (Número da nota + CNPJ/CPF do Prestador)
  let nfseNumber: string | null = null;
  let issuerDoc: string | null = null;

  // 3a. Tags convertidas ou planas de sistemas municipais/legados (<N_DA_NFSE>, <CPFCNPJ_PRESTADOR>)
  const flatNumberMatch = content.match(/<(?:\w+:)?(?:N_DA_NFSE|NUMERO_NOTA|NumeroNfse|NumeroNota)[^>]*>(\d+)<\/(?:\w+:)?(?:N_DA_NFSE|NUMERO_NOTA|NumeroNfse|NumeroNota)>/i);
  const flatDocMatch = content.match(/<(?:\w+:)?(?:CPFCNPJ_PRESTADOR|CPFCNPJ_EMISSOR|CNPJ_PRESTADOR)[^>]*>(\d{11,14})<\/(?:\w+:)?(?:CPFCNPJ_PRESTADOR|CPFCNPJ_EMISSOR|CNPJ_PRESTADOR)>/i);

  if (flatNumberMatch && flatDocMatch) {
    return {
      type: 'NFSE',
      number: flatNumberMatch[1],
      issuerDocument: flatDocMatch[1],
      compositeKey: `${flatDocMatch[1]}:${flatNumberMatch[1]}`,
    };
  }

  if (flatNumberMatch && flatNumberMatch[1]) {
    nfseNumber = flatNumberMatch[1];
  } else {
    // Procura <Numero> dentro de <InfNfse> ou <IdentificacaoNfse> antes de <Endereco>
    const infNfseBlock = content.match(/<(?:\w+:)?(?:InfNfse|IdentificacaoNfse)[^>]*>([\s\S]*?)(?:<\/(?:\w+:)?(?:InfNfse|IdentificacaoNfse)>|<(?:\w+:)?Endereco>)/i);
    if (infNfseBlock && infNfseBlock[1]) {
      const numMatch = infNfseBlock[1].match(/<(?:\w+:)?Numero[^>]*>(\d+)<\/(?:\w+:)?Numero>/i);
      if (numMatch && numMatch[1]) {
        nfseNumber = numMatch[1];
      }
    }
  }

  // 3b. CNPJ / CPF do Prestador (estritamente dentro de bloco Prestador/Emitente, evitando Tomador)
  const prestadorBlock = content.match(/<(?:\w+:)?(?:PrestadorServico|Prestador|IdentificacaoPrestador|emit|Emitente)[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:PrestadorServico|Prestador|IdentificacaoPrestador|emit|Emitente)>/i);
  if (prestadorBlock && prestadorBlock[1]) {
    const docMatch = prestadorBlock[1].match(/<(?:\w+:)?(?:Cnpj|CNPJ|Cpf|CPF)[^>]*>(\d{11,14})<\/(?:\w+:)?(?:Cnpj|CNPJ|Cpf|CPF)>/i);
    if (docMatch && docMatch[1]) {
      issuerDoc = docMatch[1];
    }
  }

  if (nfseNumber && issuerDoc) {
    return {
      type: 'NFSE',
      number: nfseNumber,
      issuerDocument: issuerDoc,
      compositeKey: `${issuerDoc}:${nfseNumber}`,
    };
  }

  return null;
}

/**
 * Lê até 4 KB (1 página de disco) de um arquivo XML e extrai o identificador.
 */
export async function sniffXmlFile(filePath: string): Promise<SniffedXmlIdentifier | null> {
  let fileHandle: fs.promises.FileHandle | null = null;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await fileHandle.read(buffer, 0, 4096, 0);
    await fileHandle.close();
    fileHandle = null;

    if (bytesRead === 0) return null;
    const content = buffer.subarray(0, bytesRead).toString('utf-8');
    return sniffXmlIdentifier(content);
  } catch {
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {}
    }
    return null;
  }
}
