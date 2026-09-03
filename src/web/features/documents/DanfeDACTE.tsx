import { formatDate, formatTime, formatMoney, formatCnpjCpf, formatCep, formatPhone } from '../../../core/danfe/helpers';

interface DanfeDACTEProps {
  doc: any;
}

export function DanfeDACTE({ doc }: DanfeDACTEProps) {
  // Emitente / Transportadora
  const issuerName = doc.issuer?.name || doc.issuerName || 'TRANSPORTADORA';
  const issuerDoc = formatCnpjCpf(doc.issuer?.document || doc.issuerDocument);
  const issuerIE = doc.issuer?.ie || doc.issuerIE || '-';
  const issuerIM = doc.issuer?.im || doc.issuerIM || '-';
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
  const senderPhone = formatPhone(doc.sender?.phone);

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
  const destPhone = formatPhone(doc.recipient?.phone);

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
  const tomadorRole = String(tomador.role ?? '0'); // 0-Rem, 1-Exped, 2-Receb, 3-Dest, 4-Outros
  const tomadorName = tomador.name || (tomadorRole === '0' ? senderName : (tomadorRole === '3' ? destName : '-'));
  const tomadorDoc = formatCnpjCpf(tomador.document || (tomadorRole === '0' ? doc.sender?.document : (tomadorRole === '3' ? doc.recipient?.document : undefined)));
  const tomadorIE = tomador.ie || (tomadorRole === '0' ? senderIE : (tomadorRole === '3' ? destIE : '-'));
  const tomadorCity = tomador.address?.city || (tomadorRole === '0' ? senderCity : (tomadorRole === '3' ? destCity : '-'));
  const tomadorState = tomador.address?.state || (tomadorRole === '0' ? senderState : (tomadorRole === '3' ? destState : '-'));
  const tomadorPhone = formatPhone(tomador.phone || (tomadorRole === '0' ? senderPhone : (tomadorRole === '3' ? destPhone : undefined)));

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
  const renavam = modal.renavam || '-';
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

  return (
    <div className="p-4 md:p-8 min-h-full flex justify-center bg-gray-100 print:bg-white print:p-0">
      <div 
        className="bg-white text-black w-full max-w-[950px] min-w-[750px] border border-black shadow-lg print:shadow-none print:border print:max-w-none print:w-full print:min-w-0"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8px', lineHeight: 1.15 }}
      >
        {/* CABEÇALHO DACTE */}
        <div className="border-b border-black flex">
          {/* Identificação do Emitente */}
          <div className="w-[42%] p-2 border-r border-black flex flex-col justify-center">
            <div className="text-[11px] font-black uppercase tracking-tight leading-tight">{issuerName}</div>
            <div className="text-[7.5px] text-gray-700 mt-1 leading-snug">
              <div>{issuerStreet} - {issuerBairro}</div>
              <div>CEP: {issuerCep} - {issuerCity} / {issuerState}</div>
              {issuerPhone !== '-' && <div>Fone: {issuerPhone}</div>}
              <div className="font-mono mt-0.5"><b>CNPJ:</b> {issuerDoc} | <b>IE:</b> {issuerIE}</div>
            </div>
          </div>

          {/* DACTE Box */}
          <div className="w-[20%] p-1.5 border-r border-black flex flex-col justify-between text-center bg-gray-50/50">
            <div>
              <div className="text-[14px] font-black tracking-wider">DACTE</div>
              <div className="text-[6.5px] uppercase text-gray-600 font-bold leading-tight">
                Documento Auxiliar do Conhecimento de Transporte Eletrônico
              </div>
            </div>
            <div className="border-t border-b border-black py-1 my-0.5">
              <div className="text-[7px] font-bold">MODAL RODOVIÁRIO</div>
            </div>
            <div className="grid grid-cols-2 text-[7.5px] text-left">
              <div><b>MOD:</b> 57</div>
              <div><b>SÉRIE:</b> {series}</div>
              <div className="col-span-2 text-[9px] font-mono font-bold mt-0.5"><b>Nº:</b> {number}</div>
              <div className="col-span-2 text-[6.5px] text-gray-600 mt-0.5">FL: 1/1</div>
            </div>
          </div>

          {/* Código de Barras e Chave */}
          <div className="w-[38%] p-2 flex flex-col justify-between">
            {/* Barcode visual */}
            <div className="h-9 w-full bg-black flex items-center justify-center p-0.5">
              <div className="w-full h-full bg-white flex items-center justify-center font-mono text-[7px] tracking-widest font-bold">
                ||| | |||| || ||| ||||| ||| || |||| ||| |||| ||||
              </div>
            </div>
            <div className="mt-1">
              <div className="text-[6.5px] uppercase font-bold text-gray-600">CHAVE DE ACESSO</div>
              <div className="font-mono text-[8.5px] font-bold tracking-tight">{formattedKey}</div>
            </div>
            <div className="mt-1 pt-1 border-t border-gray-200 text-[6.5px] text-gray-600">
              Consulta de autenticidade no portal nacional do CT-e: <span className="font-bold text-black">www.cte.fazenda.gov.br/portal</span>
            </div>
          </div>
        </div>

        {/* PROTOCOLO E NATUREZA DA OPERAÇÃO */}
        <div className="border-b border-black flex text-[7.5px]">
          <div className="w-[62%] p-1.5 border-r border-black">
            <div className="text-[6.5px] uppercase font-bold text-gray-600">NATUREZA DA OPERAÇÃO / CFOP</div>
            <div className="font-bold uppercase text-[8px]">{cfop} - {natOp}</div>
          </div>
          <div className="w-[38%] p-1.5">
            <div className="text-[6.5px] uppercase font-bold text-gray-600">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
            <div className="font-mono font-bold text-[8px]">{protocolStr}</div>
          </div>
        </div>

        {/* INÍCIO E FIM DA PRESTAÇÃO */}
        <div className="border-b border-black flex text-[7.5px]">
          <div className="w-[50%] p-1.5 border-r border-black">
            <div className="text-[6.5px] uppercase font-bold text-gray-600">INÍCIO DA PRESTAÇÃO (ORIGEM)</div>
            <div className="font-bold uppercase text-[8.5px]">{startCity} / {startState}</div>
          </div>
          <div className="w-[50%] p-1.5">
            <div className="text-[6.5px] uppercase font-bold text-gray-600">TÉRMINO DA PRESTAÇÃO (DESTINO)</div>
            <div className="font-bold uppercase text-[8.5px]">{endCity} / {endState}</div>
          </div>
        </div>

        {/* TOMADOR DO SERVIÇO */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase flex justify-between">
            <span>TOMADOR DO SERVIÇO</span>
            <span className="font-normal text-[6.5px]">
              [{tomadorRole === '0' ? 'X' : ' '}] Remetente &nbsp;&nbsp;
              [{tomadorRole === '1' ? 'X' : ' '}] Expedidor &nbsp;&nbsp;
              [{tomadorRole === '2' ? 'X' : ' '}] Recebedor &nbsp;&nbsp;
              [{tomadorRole === '3' ? 'X' : ' '}] Destinatário &nbsp;&nbsp;
              [{tomadorRole === '4' ? 'X' : ' '}] Outros
            </span>
          </div>
          <div className="p-1.5 grid grid-cols-4 gap-2 text-[7.5px]">
            <div className="col-span-2"><b>Nome/Razão Social:</b> {tomadorName}</div>
            <div><b>CNPJ/CPF:</b> <span className="font-mono">{tomadorDoc}</span></div>
            <div><b>Inscrição Estadual:</b> {tomadorIE}</div>
            <div className="col-span-2"><b>Município/UF:</b> {tomadorCity} / {tomadorState}</div>
            <div><b>Telefone:</b> {tomadorPhone || '-'}</div>
            <div><b>Tipo:</b> {formatRole(tomadorRole)}</div>
          </div>
        </div>

        {/* PARTES ENVOLVIDAS: REMETENTE E DESTINATÁRIO */}
        <div className="border-b border-black grid grid-cols-2 divide-x divide-black">
          {/* Remetente */}
          <div className="p-1.5 space-y-0.5">
            <div className="text-[7px] font-bold uppercase text-gray-600">REMETENTE</div>
            <div className="text-[8.5px] font-bold uppercase">{senderName}</div>
            <div className="grid grid-cols-2 text-[7.5px]">
              <div><b>CNPJ/CPF:</b> <span className="font-mono">{senderDoc}</span></div>
              <div><b>IE:</b> {senderIE}</div>
            </div>
            <div className="text-[7.5px]"><b>Endereço:</b> {senderStreet}</div>
            <div className="grid grid-cols-3 text-[7.5px]">
              <div><b>Bairro:</b> {senderBairro}</div>
              <div><b>Município/UF:</b> {senderCity}/{senderState}</div>
              <div><b>CEP:</b> {senderCep}</div>
            </div>
          </div>

          {/* Destinatário */}
          <div className="p-1.5 space-y-0.5">
            <div className="text-[7px] font-bold uppercase text-gray-600">DESTINATÁRIO</div>
            <div className="text-[8.5px] font-bold uppercase">{destName}</div>
            <div className="grid grid-cols-2 text-[7.5px]">
              <div><b>CNPJ/CPF:</b> <span className="font-mono">{destDoc}</span></div>
              <div><b>IE:</b> {destIE}</div>
            </div>
            <div className="text-[7.5px]"><b>Endereço:</b> {destStreet}</div>
            <div className="grid grid-cols-3 text-[7.5px]">
              <div><b>Bairro:</b> {destBairro}</div>
              <div><b>Município/UF:</b> {destCity}/{destState}</div>
              <div><b>CEP:</b> {destCep}</div>
            </div>
          </div>
        </div>

        {/* EXPEDIDOR E RECEBEDOR (SE HOUVER) */}
        {(expedName !== '-' || recebName !== '-') && (
          <div className="border-b border-black grid grid-cols-2 divide-x divide-black bg-gray-50/30">
            <div className="p-1.5 text-[7.5px]">
              <div className="text-[7px] font-bold uppercase text-gray-600">EXPEDIDOR</div>
              <div className="font-bold">{expedName}</div>
              <div><b>CNPJ/CPF:</b> {expedDoc} | <b>IE:</b> {expedIE}</div>
              <div><b>Endereço:</b> {expedStreet} - {expedCity}/{expedState}</div>
            </div>
            <div className="p-1.5 text-[7.5px]">
              <div className="text-[7px] font-bold uppercase text-gray-600">RECEBEDOR</div>
              <div className="font-bold">{recebName}</div>
              <div><b>CNPJ/CPF:</b> {recebDoc} | <b>IE:</b> {recebIE}</div>
              <div><b>Endereço:</b> {recebStreet} - {recebCity}/{recebState}</div>
            </div>
          </div>
        )}

        {/* INFORMAÇÕES DA CARGA */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
            INFORMAÇÕES DA CARGA
          </div>
          <div className="p-1.5 grid grid-cols-4 gap-2 text-[7.5px] border-b border-gray-200">
            <div className="col-span-2"><b>Produto Predominante:</b> <span className="font-bold uppercase">{proPred}</span></div>
            <div><b>Outras Características:</b> {outCat}</div>
            <div><b>Valor Total da Carga:</b> <span className="font-bold">R$ {vCarga.toFixed(2)}</span></div>
          </div>
          {/* Quantidades e Medidas */}
          <div className="p-1.5 flex flex-wrap gap-4 text-[7.5px] bg-gray-50/50">
            {quantities.length > 0 ? (
              quantities.map((q: any, idx: number) => (
                <div key={idx} className="flex gap-1 items-baseline">
                  <span className="text-gray-600 font-bold uppercase">{q.measureType}:</span>
                  <span className="font-mono font-bold">{q.quantity.toFixed(q.measureType.includes('VOLUME') ? 0 : 3)} {formatUnit(q.unit)}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">Pesos e volumes não discriminados no XML</div>
            )}
          </div>
        </div>

        {/* COMPONENTES DO VALOR DA PRESTAÇÃO E VALOR DO SERVIÇO */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
            COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO
          </div>
          <div className="p-1.5 flex flex-wrap gap-x-6 gap-y-1 text-[7.5px] border-b border-gray-200">
            {components.map((comp: any, idx: number) => (
              <div key={idx} className="flex gap-2 items-baseline">
                <span className="text-gray-600 font-bold uppercase">{comp.name}:</span>
                <span className="font-mono font-bold">R$ {comp.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="p-1.5 bg-gray-50 flex justify-between items-center text-[8px]">
            <div>
              <span className="text-gray-600 font-bold uppercase mr-2">VALOR TOTAL DO SERVIÇO:</span>
              <span className="font-mono font-bold text-[10px]">R$ {totalPrestacao.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-700 font-bold uppercase mr-2">VALOR A RECEBER:</span>
              <span className="font-mono font-black text-[12px]">R$ {valorReceber.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* INFORMAÇÕES RELATIVAS AO IMPOSTO (ICMS) */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
            INFORMAÇÕES RELATIVAS AO IMPOSTO (ICMS)
          </div>
          <div className="grid grid-cols-5 text-center p-1.5 text-[7.5px] border-b border-gray-200">
            <div className="border-r border-gray-200">
              <div className="text-gray-600 font-bold">SITUAÇÃO TRIBUTÁRIA (CST)</div>
              <div className="font-bold mt-0.5 font-mono">{icmsCst}</div>
            </div>
            <div className="border-r border-gray-200">
              <div className="text-gray-600 font-bold">BASE DE CÁLCULO (R$)</div>
              <div className="font-bold mt-0.5 font-mono">{icmsBase > 0 ? icmsBase.toFixed(2) : '0,00'}</div>
            </div>
            <div className="border-r border-gray-200">
              <div className="text-gray-600 font-bold">ALÍQUOTA (%)</div>
              <div className="font-bold mt-0.5 font-mono">{icmsAliq > 0 ? `${icmsAliq.toFixed(2)}%` : '0,00%'}</div>
            </div>
            <div className="border-r border-gray-200">
              <div className="text-gray-600 font-bold">VALOR DO ICMS (R$)</div>
              <div className="font-bold mt-0.5 font-mono">{icmsValor > 0 ? icmsValor.toFixed(2) : '0,00'}</div>
            </div>
            <div>
              <div className="text-gray-600 font-bold">% REDUÇÃO BC</div>
              <div className="font-bold mt-0.5 font-mono">{icmsRed > 0 ? `${icmsRed.toFixed(2)}%` : '0,00%'}</div>
            </div>
          </div>
        </div>

        {/* DOCUMENTOS ORIGINÁRIOS / NF-E TRANSPORTADAS */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
            DOCUMENTOS ORIGINÁRIOS (NF-e / NOTAS FISCAIS TRANSPORTADAS)
          </div>
          <div className="p-1.5 text-[7.5px]">
            {docsList.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[7px]">
                {docsList.map((d: any, idx: number) => (
                  <div key={idx} className="p-1 bg-gray-50 border border-gray-200 rounded">
                    {d.type === 'NFE' && (
                      <div><b>NF-e Chave:</b> {d.key ? d.key.match(/.{1,4}/g)?.join(' ') : '-'}</div>
                    )}
                    {d.type === 'NF' && (
                      <div><b>NF Papel:</b> Nº {d.number} Série {d.series || '1'} {d.amount ? `| R$ ${d.amount.toFixed(2)}` : ''}</div>
                    )}
                    {d.type === 'OUTROS' && (
                      <div><b>Outro Doc:</b> Nº {d.number || '-'} {d.amount ? `| R$ ${d.amount.toFixed(2)}` : ''}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">Nenhum documento originário discriminado no XML</div>
            )}
          </div>
        </div>

        {/* INFORMAÇÕES ESPECÍFICAS DO MODAL RODOVIÁRIO */}
        <div className="border-b border-black">
          <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
            DADOS ESPECÍFICOS DO MODAL RODOVIÁRIO
          </div>
          <div className="p-1.5 grid grid-cols-4 gap-2 text-[7.5px]">
            <div><b>RNTRC da Empresa:</b> <span className="font-mono">{rntrc}</span></div>
            <div><b>CIOT:</b> <span className="font-mono">{ciot}</span></div>
            <div><b>Veículo / Placa:</b> <span className="font-mono uppercase">{placa} / {ufVeic}</span></div>
            <div><b>Motorista:</b> {motorista} {motoristaCpf !== '-' ? `(${motoristaCpf})` : ''}</div>
          </div>
        </div>

        {/* OBSERVAÇÕES E DADOS DO FISCO */}
        <div className="p-2 text-[7.5px] space-y-1">
          <div className="font-bold uppercase text-gray-700">OBSERVAÇÕES GERAIS</div>
          <div className="text-gray-700 leading-normal space-y-0.5">
            {doc.additionalInfo && (
              <div className="whitespace-pre-wrap">{doc.additionalInfo}</div>
            )}
            {doc.fiscoInfo && (
              <div className="whitespace-pre-wrap border-t border-gray-200 pt-1 text-gray-800 font-semibold">
                [RESERVADO AO FISCO] {doc.fiscoInfo}
              </div>
            )}
            {!doc.additionalInfo && !doc.fiscoInfo && (
              <div className="text-gray-500 italic">Sem observações adicionais.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
