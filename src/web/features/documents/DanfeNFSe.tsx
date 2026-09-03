import { formatDate, formatTime, formatMoney, formatCnpjCpf, formatCep, formatPhone } from '../../../core/danfe/helpers';

interface DanfeNFSeProps {
  doc: any;
}

export function DanfeNFSe({ doc }: DanfeNFSeProps) {
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
  const issuerCity = doc.issuer?.address?.city || doc.issuerCity || '-';
  const issuerState = doc.issuer?.address?.state || doc.issuerState || '-';
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

  // Informações de Serviço
  const serviceCode = doc.serviceCode || doc.items?.[0]?.code || '-';
  const cnaeCode = doc.cnaeCode || '-';
  const cityServiceCode = doc.cityServiceCode || '-';
  const serviceCity = doc.serviceCity || issuerCity;
  const serviceDescription = doc.serviceDescription || doc.items?.[0]?.description || '-';

  // Identificação e Autenticidade
  const number = doc.number || '000.000';
  const series = doc.series || '1';
  const rpsNumber = doc.rpsNumber || '-';
  const rpsSeries = doc.rpsSeries || '-';
  const verificationCode = doc.verificationCode || doc.accessKey || '-';
  const issueDateStr = doc.issueDate ? formatDate(doc.issueDate) : '-';
  const issueTimeStr = doc.issueDate ? formatTime(doc.issueDate) : '-';

  // Valores reais (SEM inventar impostos não presentes no XML)
  const taxesObj = doc.totals?.taxes || {};
  const valorServicos = doc.totals?.products ?? doc.totalAmount ?? 0;
  const deducoes = doc.totals?.deductions ?? taxesObj.deductions ?? 0;
  const descIncond = doc.totals?.unconditionalDiscount ?? doc.totals?.discount ?? 0;
  const descCond = doc.totals?.conditionalDiscount ?? 0;

  const issValor = taxesObj.iss ?? (doc.taxes?.find((t: any) => t.taxType === 'ISS')?.amount ?? 0);
  const issBase = taxesObj.issBase ?? doc.totals?.icmsBase ?? (valServBase(valorServicos, deducoes, descIncond));
  const issAliquot = taxesObj.issAliquot !== undefined && taxesObj.issAliquot !== null ? Number(taxesObj.issAliquot) : (doc.issAliquot ? Number(doc.issAliquot) : null);
  
  const issRetidoValor = typeof taxesObj.issRetained === 'number' ? taxesObj.issRetained : (taxesObj.issRetained ? issValor : 0);
  const isIssRetido = issRetidoValor > 0 || taxesObj.issRetained === true || doc.issRetained === true;

  // Impostos Federais Retidos
  const pis = taxesObj.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount ?? 0);
  const cofins = taxesObj.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount ?? 0);
  const inss = taxesObj.inss ?? (doc.taxes?.find((t: any) => t.taxType === 'INSS')?.amount ?? 0);
  const ir = taxesObj.ir ?? (doc.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount ?? 0);
  const csll = taxesObj.csll ?? (doc.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount ?? 0);
  const outrasRet = taxesObj.outrasRetencoes ?? 0;

  const totalRetencoesFederais = pis + cofins + inss + ir + csll + outrasRet;
  const totalRetencoesGeral = totalRetencoesFederais + (isIssRetido ? (issRetidoValor || issValor) : 0);
  const valorLiquido = doc.totals?.total ?? (doc.totalAmount || (valorServicos - descIncond - totalRetencoesGeral));

  // Regimes
  const optanteSimples = doc.optanteSimplesNacional;
  const regimeEspecial = doc.regimeEspecialTributacao;
  const exigibilidade = doc.exigibilidadeISS;

  return (
    <div className="p-4 md:p-8 min-h-full flex justify-center bg-gray-100 print:bg-white print:p-0">
      <div 
        className="bg-white text-black w-full max-w-[850px] min-w-[700px] border border-black shadow-lg print:shadow-none print:border print:max-w-none print:w-full print:min-w-0"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9px', lineHeight: 1.2 }}
      >
        {/* Cabeçalho Oficial */}
        <div className="border-b border-black flex">
          <div className="w-[65%] p-2.5 border-r border-black flex flex-col justify-center">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-700">
              PREFEITURA MUNICIPAL DE {issuerCity.toUpperCase()}
            </div>
            <div className="text-[9px] text-gray-600 font-semibold uppercase">
              SECRETARIA MUNICIPAL DE FINANÇAS E TRIBUTAÇÃO
            </div>
            <div className="text-[13px] font-black uppercase mt-1">
              NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFS-e
            </div>
            <div className="text-[8px] text-gray-500 mt-0.5">
              Documento Auxiliar da NFS-e (Padrão Nacional / ABRASF)
            </div>
          </div>
          <div className="w-[35%] p-2 flex flex-col justify-between bg-gray-50/50">
            <div className="flex justify-between items-center border-b border-gray-300 pb-1">
              <span className="text-[8px] font-bold text-gray-600">NÚMERO DA NFS-e:</span>
              <span className="text-[14px] font-black font-mono">{number}</span>
            </div>
            <div className="flex justify-between items-center text-[8px] pt-1">
              <span className="text-gray-600 font-bold">EMISSÃO:</span>
              <span className="font-bold">{issueDateStr} {issueTimeStr !== '--:--' ? issueTimeStr : ''}</span>
            </div>
            <div className="flex justify-between items-center text-[8px]">
              <span className="text-gray-600 font-bold">COMPETÊNCIA:</span>
              <span className="font-bold">{issueDateStr}</span>
            </div>
            <div className="flex justify-between items-center text-[8px]">
              <span className="text-gray-600 font-bold">RPS Nº:</span>
              <span className="font-bold font-mono">{rpsNumber} {rpsSeries !== '-' ? `Série ${rpsSeries}` : ''}</span>
            </div>
          </div>
        </div>

        {/* Código de Verificação */}
        <div className="border-b border-black px-2 py-1 bg-gray-50 flex justify-between items-center text-[8.5px]">
          <div>
            <span className="font-bold text-gray-600">CÓDIGO DE VERIFICAÇÃO DE AUTENTICIDADE: </span>
            <span className="font-mono font-bold text-[10px] tracking-wider">{verificationCode}</span>
          </div>
          <div className="text-[7.5px] text-gray-500">
            Consulte a autenticidade deste documento no portal da Prefeitura
          </div>
        </div>

        {/* PRESTADOR DE SERVIÇOS */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[8px] border-b border-black uppercase">
            PRESTADOR DE SERVIÇOS
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <div className="text-[11px] font-bold uppercase">{issuerName}</div>
              <div className="font-mono text-[9.5px]"><b>CNPJ/CPF:</b> {issuerDoc}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[8px] pt-0.5 border-t border-gray-200">
              <div className="col-span-2"><b>Endereço:</b> {issuerStreet}</div>
              <div><b>Bairro:</b> {issuerBairro}</div>
              <div><b>CEP:</b> {issuerCep}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[8px]">
              <div><b>Município/UF:</b> {issuerCity} / {issuerState}</div>
              <div><b>Insc. Municipal:</b> {issuerIM}</div>
              <div><b>Insc. Estadual:</b> {issuerIE}</div>
              <div><b>Telefone:</b> {issuerPhone}</div>
            </div>
            {issuerEmail !== '-' && (
              <div className="text-[8px]"><b>E-mail:</b> {issuerEmail}</div>
            )}
          </div>
        </div>

        {/* TOMADOR DE SERVIÇOS */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[8px] border-b border-black uppercase">
            TOMADOR DE SERVIÇOS
          </div>
          <div className="p-2 space-y-1">
            <div className="flex justify-between items-baseline">
              <div className="text-[10px] font-bold uppercase">{recipientName}</div>
              <div className="font-mono text-[9.5px]"><b>CNPJ/CPF:</b> {recipientDoc}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[8px] pt-0.5 border-t border-gray-200">
              <div className="col-span-2"><b>Endereço:</b> {recipientStreet}</div>
              <div><b>Bairro:</b> {recipientBairro}</div>
              <div><b>CEP:</b> {recipientCep}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[8px]">
              <div><b>Município/UF:</b> {recipientCity} / {recipientState}</div>
              <div><b>Insc. Municipal:</b> {recipientIM}</div>
              <div><b>Insc. Estadual:</b> {recipientIE}</div>
              <div><b>Telefone:</b> {recipientPhone}</div>
            </div>
            {recipientEmail !== '-' && (
              <div className="text-[8px]"><b>E-mail:</b> {recipientEmail}</div>
            )}
          </div>
        </div>

        {/* DISCRIMINAÇÃO DOS SERVIÇOS */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[8px] border-b border-black uppercase">
            DISCRIMINAÇÃO DOS SERVIÇOS
          </div>
          <div className="p-2 min-h-[90px] whitespace-pre-wrap font-mono text-[8.5px] leading-relaxed">
            {serviceDescription}
          </div>
          <div className="border-t border-gray-300 p-1.5 bg-gray-50/50 grid grid-cols-3 gap-2 text-[8px]">
            <div><b>Item LC 116/2003:</b> {serviceCode}</div>
            <div><b>Cód. CNAE:</b> {cnaeCode}</div>
            <div><b>Município de Prestação:</b> {serviceCity}</div>
          </div>
        </div>

        {/* QUADRO DE RETENÇÕES DE TRIBUTOS NA FONTE */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[8px] border-b border-black uppercase">
            RETENÇÕES DE TRIBUTOS NA FONTE
          </div>
          <div className="grid grid-cols-6 text-center border-b border-gray-200 text-[8px]">
            <div className="p-1 border-r border-gray-200">
              <div className="text-gray-600 font-bold">PIS (R$)</div>
              <div className="font-bold mt-0.5">{pis > 0 ? pis.toFixed(2) : '-'}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-gray-600 font-bold">COFINS (R$)</div>
              <div className="font-bold mt-0.5">{cofins > 0 ? cofins.toFixed(2) : '-'}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-gray-600 font-bold">INSS (R$)</div>
              <div className="font-bold mt-0.5">{inss > 0 ? inss.toFixed(2) : '-'}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-gray-600 font-bold">IRRF (R$)</div>
              <div className="font-bold mt-0.5">{ir > 0 ? ir.toFixed(2) : '-'}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-gray-600 font-bold">CSLL (R$)</div>
              <div className="font-bold mt-0.5">{csll > 0 ? csll.toFixed(2) : '-'}</div>
            </div>
            <div className="p-1">
              <div className="text-gray-600 font-bold">OUTRAS RET. (R$)</div>
              <div className="font-bold mt-0.5">{outrasRet > 0 ? outrasRet.toFixed(2) : '-'}</div>
            </div>
          </div>
          <div className="px-2 py-1 bg-gray-50 flex justify-between text-[8px]">
            <span><b>ISS Retido na Fonte:</b> {isIssRetido ? `SIM (${(issRetidoValor || issValor).toFixed(2)})` : 'NÃO'}</span>
            <span><b>Total de Retenções na Fonte:</b> <b className="text-black">R$ {totalRetencoesGeral.toFixed(2)}</b></span>
          </div>
        </div>

        {/* CÁLCULO DO ISSQN E TOTALIZAÇÃO */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[8px] border-b border-black uppercase">
            CÁLCULO DO ISSQN E VALOR TOTAL
          </div>
          <div className="grid grid-cols-6 text-right text-[8px] border-b border-gray-200">
            <div className="p-1 border-r border-gray-200">
              <div className="text-left text-gray-600 font-bold">VALOR DOS SERVIÇOS</div>
              <div className="font-bold mt-0.5">{valorServicos.toFixed(2)}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-left text-gray-600 font-bold">DEDUÇÕES LEGAIS</div>
              <div className="font-bold mt-0.5">{deducoes > 0 ? deducoes.toFixed(2) : '0,00'}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-left text-gray-600 font-bold">DESCONTO INCOND.</div>
              <div className="font-bold mt-0.5">{descIncond > 0 ? descIncond.toFixed(2) : '0,00'}</div>
            </div>
            <div className="p-1 border-r border-gray-200">
              <div className="text-left text-gray-600 font-bold">BASE DE CÁLCULO</div>
              <div className="font-bold mt-0.5">{issBase.toFixed(2)}</div>
            </div>
            <div className="p-1 border-r border-gray-200 text-center">
              <div className="text-gray-600 font-bold">ALÍQUOTA</div>
              <div className="font-bold mt-0.5">{issAliquot !== null ? `${issAliquot.toFixed(2)}%` : '-'}</div>
            </div>
            <div className="p-1">
              <div className="text-left text-gray-600 font-bold">VALOR DO ISS</div>
              <div className="font-bold mt-0.5">{issValor > 0 ? issValor.toFixed(2) : '0,00'}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 p-1.5 bg-gray-50 items-center">
            <div className="text-[8px]">
              <div><b>(-) Total Retenções:</b> R$ {totalRetencoesGeral.toFixed(2)}</div>
              {descCond > 0 && <div><b>(-) Desc. Condicionado:</b> R$ {descCond.toFixed(2)}</div>}
            </div>
            <div className="col-span-2 text-right">
              <span className="text-[9px] font-bold uppercase text-gray-700 mr-2">VALOR LÍQUIDO DA NFS-e:</span>
              <span className="text-[14px] font-black font-mono">R$ {valorLiquido.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* OUTRAS INFORMAÇÕES / DADOS COMPLEMENTARES */}
        <div className="p-2 text-[8px] space-y-1">
          <div className="font-bold uppercase text-gray-700">OUTRAS INFORMAÇÕES</div>
          <div className="text-gray-700 leading-normal space-y-0.5">
            {optanteSimples !== undefined && (
              <div><b>Regime de Tributação:</b> {optanteSimples ? 'Optante pelo Simples Nacional' : 'Tributação Normal'}</div>
            )}
            {regimeEspecial && (
              <div><b>Regime Especial de Tributação:</b> {regimeEspecial}</div>
            )}
            {exigibilidade && (
              <div><b>Exigibilidade do ISS:</b> {formatExigibilidade(exigibilidade)}</div>
            )}
            {doc.additionalInfo && (
              <div className="whitespace-pre-wrap mt-1 border-t border-gray-200 pt-1 text-gray-800">
                {doc.additionalInfo}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function valServBase(total: number, ded: number, desc: number): number {
  const base = total - ded - desc;
  return base > 0 ? base : total;
}

function formatExigibilidade(code: string | number): string {
  const map: Record<string, string> = {
    '1': '1 - Exigível',
    '2': '2 - Não incidência',
    '3': '3 - Isenção',
    '4': '4 - Imunidade',
    '5': '5 - Exigibilidade Suspensa por Decisão Judicial',
    '6': '6 - Exigibilidade Suspensa por Procedimento Administrativo',
  };
  return map[String(code)] || String(code);
}
