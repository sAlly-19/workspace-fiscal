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

  // 1b. Tags <chNFe>, <chCTe>, <chNFCe> com suporte a namespaces opcionais
  const tagKeyMatch = content.match(/<(?:\w+:)?(?:chNFe|chCTe|chNFCe)[^>]*>(\d{44})<\/(?:\w+:)?(?:chNFe|chCTe|chNFCe)>/i);
  if (tagKeyMatch && tagKeyMatch[1]) {
    return { type: 'KEY', accessKey: tagKeyMatch[1] };
  }

  // 2. NFS-e (Número da nota + CNPJ/CPF do Prestador)
  // 2a. Número da nota (evitando tags <Numero> de <Endereco> ou <IdentificacaoRps>)
  let nfseNumber: string | null = null;

  // Prioridade para tags explícitas de número de NFS-e
  const explicitNumberMatch = content.match(/<(?:\w+:)?(?:NumeroNfse|NumeroNota)[^>]*>(\d+)<\/(?:\w+:)?(?:NumeroNfse|NumeroNota)>/i);
  if (explicitNumberMatch && explicitNumberMatch[1]) {
    nfseNumber = explicitNumberMatch[1];
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

  // 2b. CNPJ / CPF do Prestador (estritamente dentro de bloco Prestador/Emitente, evitando Tomador)
  let issuerDoc: string | null = null;
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
