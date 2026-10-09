import { escapeHtml } from '../../../api/utils/escapeHtml';
import {
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../helpers';

export function formatRole(role: string): string {
  const map: Record<string, string> = {
    '0': 'Remetente',
    '1': 'Expedidor',
    '2': 'Recebedor',
    '3': 'Destinatário',
    '4': 'Outros',
  };
  return map[role] || 'Remetente';
}

export function formatUnit(unit: string): string {
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
export function renderDanfeDACTEHtml(doc: any, _pageIndex: number, _totalPages: number): string {
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

