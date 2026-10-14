import {
  escapeHtml,
  formatDate,
  formatTime,
  formatCnpjCpf,
  formatCep,
  formatPhone,
  formatRole,
  formatUnit,
} from '../helpers';
import { buildCteViewModel } from '../view-models/cte.view-model';

export { formatRole, formatUnit };

/** CT-e — DACTE (Conhecimento de Transporte Eletrônico, padrão oficial SEFAZ) */
export function renderDanfeDACTEHtml(doc: any, _pageIndex: number, _totalPages: number): string {
  const vm = buildCteViewModel(doc);

  // Expedidor (Shipper)
  const exped = doc.expedidor || doc.cteParties?.expedidor || {};
  const expedName = exped.name || doc.shipper?.name || '-';
  const expedDoc = formatCnpjCpf(exped.document || doc.shipper?.document);
  const expedIE = exped.ie || doc.shipper?.ie || '-';
  const expedStreet = exped.address?.street || doc.shipper?.address?.street || '-';
  const expedCity = exped.address?.city || doc.shipper?.address?.city || '-';
  const expedState = exped.address?.state || doc.shipper?.address?.state || '-';

  // Recebedor (Receiver)
  const receb = doc.recebedor || doc.cteParties?.recebedor || {};
  const recebName = receb.name || doc.receiver?.name || '-';
  const recebDoc = formatCnpjCpf(receb.document || doc.receiver?.document);
  const recebIE = receb.ie || doc.receiver?.ie || '-';
  const recebStreet = receb.address?.street || doc.receiver?.address?.street || '-';
  const recebCity = receb.address?.city || doc.receiver?.address?.city || '-';
  const recebState = receb.address?.state || doc.receiver?.address?.state || '-';

  // Tomador do Serviço
  const tomador = doc.cteTomador || doc.tomador || {};
  const tomadorRole = String(tomador.role ?? '0');
  const tomadorName = vm.tomadorName || (tomadorRole === '0' ? vm.senderName : (tomadorRole === '3' ? vm.recipientName : '-'));
  const tomadorDoc = formatCnpjCpf(tomador.document || (tomadorRole === '0' ? doc.sender?.document : (tomadorRole === '3' ? doc.recipient?.document : undefined)));
  const tomadorIE = tomador.ie || (tomadorRole === '0' ? vm.senderIE : (tomadorRole === '3' ? vm.recipientIE : '-'));
  const tomadorCity = tomador.address?.city || (tomadorRole === '0' ? vm.senderCity : (tomadorRole === '3' ? vm.recipientCity : '-'));
  const tomadorState = tomador.address?.state || (tomadorRole === '0' ? vm.senderState : (tomadorRole === '3' ? vm.recipientState : '-'));

  // Carga
  const cargo = doc.cteCargo || doc.cargo || {};
  const proPred = cargo.predominantProduct || 'CARGA GERAL';
  const outCat = cargo.otherCharacteristics || '-';
  const vCarga = Number(cargo.cargoValue ?? doc.totalAmount ?? 0);
  const quantities = cargo.quantities || [];

  // Componentes do Frete
  const components = doc.cteComponents && doc.cteComponents.length > 0 ? doc.cteComponents : [
    { name: 'FRETE VALOR', amount: vm.valorTotal }
  ];

  // Tributos ICMS
  const icmsCst = doc.cteCst || '00';
  const icmsBase = vm.baseIcms;
  const icmsAliq = vm.aliquotaIcms;
  const icmsValor = vm.valorIcms;
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
  const cfop = doc.items?.[0]?.cfop || '5353';
  const natOp = doc.operationNature || 'PRESTACAO DE SERVICO DE TRANSPORTE';

  return `
    <div class="danfe-page">
      <div class="danfe-box" style="font-size: 7.5px; line-height: 1.15;">
        <!-- CABEÇALHO DACTE -->
        <div style="display: flex; border-bottom: 1px solid #000;">
          <!-- Emitente -->
          <div style="width: 42%; padding: 6px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">${escapeHtml(vm.issuerName)}</div>
            <div style="font-size: 7.5px; color: #333; margin-top: 2px; line-height: 1.2;">
              <div>${escapeHtml(vm.issuerStreet)} - ${escapeHtml(vm.issuerBairro)}</div>
              <div>CEP: ${escapeHtml(vm.issuerCep)} - ${escapeHtml(vm.issuerCity)} / ${escapeHtml(vm.issuerState)}</div>
              ${vm.issuerPhone !== '-' ? `<div>Fone: ${escapeHtml(vm.issuerPhone)}</div>` : ''}
              <div style="font-family: monospace; margin-top: 2px;"><b>CNPJ:</b> ${escapeHtml(vm.issuerDoc)} | <b>IE:</b> ${escapeHtml(vm.issuerIE)}</div>
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
              ${escapeHtml(vm.modal)}
            </div>
            <div class="grid" style="font-size: 7px; text-align: left;">
              <div style="width: 50%;"><b>MOD:</b> 57</div>
              <div style="width: 50%;"><b>SÉRIE:</b> ${escapeHtml(vm.series)}</div>
              <div style="width: 100%; font-size: 8.5px; font-family: monospace; font-weight: bold; margin-top: 2px;"><b>Nº:</b> ${escapeHtml(vm.number)}</div>
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
              <div style="font-family: monospace; font-size: 8px; font-weight: bold; letter-spacing: -0.2px;">${escapeHtml(vm.formattedKey)}</div>
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
            <div style="font-family: monospace; font-weight: bold;">${escapeHtml(vm.protocol)}</div>
          </div>
        </div>

        <!-- INÍCIO E FIM DA PRESTAÇÃO -->
        <div class="grid" style="border-bottom: 1px solid #000; font-size: 7px;">
          <div style="width: 50%; padding: 3px 6px; border-right: 1px solid #000;">
            <div style="font-size: 6px; text-transform: uppercase; font-weight: bold; color: #555;">INÍCIO DA PRESTAÇÃO (ORIGEM)</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(vm.startCity)} / ${escapeHtml(vm.startState)}</div>
          </div>
          <div style="width: 50%; padding: 3px 6px;">
            <div style="font-size: 6px; text-transform: uppercase; font-weight: bold; color: #555;">TÉRMINO DA PRESTAÇÃO (DESTINO)</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(vm.endCity)} / ${escapeHtml(vm.endState)}</div>
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
            <div style="width: 30%; margin-top: 1px;"><b>Tipo:</b> ${escapeHtml(formatRole(tomadorRole))}</div>
          </div>
        </div>

        <!-- PARTES ENVOLVIDAS: REMETENTE E DESTINATÁRIO -->
        <div class="grid" style="border-bottom: 1px solid #000; font-size: 7px;">
          <!-- Remetente -->
          <div style="width: 50%; padding: 4px 6px; border-right: 1px solid #000;">
            <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">REMETENTE</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(vm.senderName)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 60%;"><b>CNPJ/CPF:</b> <span style="font-family: monospace;">${escapeHtml(vm.senderDoc)}</span></div>
              <div style="width: 40%;"><b>IE:</b> ${escapeHtml(vm.senderIE)}</div>
            </div>
            <div style="margin-top: 1px;"><b>Endereço:</b> ${escapeHtml(vm.senderStreet)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 40%;"><b>Bairro:</b> ${escapeHtml(vm.senderBairro)}</div>
              <div style="width: 35%;"><b>Mun/UF:</b> ${escapeHtml(vm.senderCity)}/${escapeHtml(vm.senderState)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(vm.senderCep)}</div>
            </div>
          </div>

          <!-- Destinatário -->
          <div style="width: 50%; padding: 4px 6px;">
            <div style="font-size: 6.5px; font-weight: bold; text-transform: uppercase; color: #555;">DESTINATÁRIO</div>
            <div style="font-weight: bold; text-transform: uppercase; font-size: 8px;">${escapeHtml(vm.recipientName)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 60%;"><b>CNPJ/CPF:</b> <span style="font-family: monospace;">${escapeHtml(vm.recipientDoc)}</span></div>
              <div style="width: 40%;"><b>IE:</b> ${escapeHtml(vm.recipientIE)}</div>
            </div>
            <div style="margin-top: 1px;"><b>Endereço:</b> ${escapeHtml(vm.recipientStreet)}</div>
            <div class="grid" style="margin-top: 1px;">
              <div style="width: 40%;"><b>Bairro:</b> ${escapeHtml(vm.recipientBairro)}</div>
              <div style="width: 35%;"><b>Mun/UF:</b> ${escapeHtml(vm.recipientCity)}/${escapeHtml(vm.recipientState)}</div>
              <div style="width: 25%;"><b>CEP:</b> ${escapeHtml(vm.recipientCep)}</div>
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
              <div><span style="color: #555; font-weight: bold; text-transform: uppercase;">${escapeHtml(q.measureType)}:</span> <span style="font-family: monospace; font-weight: bold;">${q.quantity.toFixed(q.measureType.includes('VOLUME') ? 0 : 3)} ${escapeHtml(formatUnit(q.unit))}</span></div>
            `).join('') : '<div style="color: #666; font-style: italic;">Pesos e volumes não discriminados no XML</div>'}
          </div>
        </div>

        <!-- COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO -->
        <div style="border-bottom: 1px solid #000;">
          <div class="title-sec">COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO</div>
          <div style="padding: 3px 6px; display: flex; flex-wrap: wrap; gap: 14px; font-size: 7px; border-bottom: 1px solid #eee;">
            ${components.map((c: any) => `
              <div><span style="color: #555; font-weight: bold; text-transform: uppercase;">${escapeHtml(c.name)}:</span> <span style="font-family: monospace; font-weight: bold;">R$ ${Number(c.amount || 0).toFixed(2)}</span></div>
            `).join('')}
          </div>
          <div class="grid" style="padding: 3px 6px; background: #fafafa; align-items: center;">
            <div style="width: 50%; font-size: 7.5px;">
              <span style="color: #555; font-weight: bold; text-transform: uppercase; margin-right: 4px;">VALOR TOTAL DO SERVIÇO:</span>
              <span style="font-family: monospace; font-weight: bold; font-size: 9px;">R$ ${vm.valorTotal.toFixed(2)}</span>
            </div>
            <div style="width: 50%; text-align: right; font-size: 7.5px;">
              <span style="color: #444; font-weight: bold; text-transform: uppercase; margin-right: 4px;">VALOR A RECEBER:</span>
              <span style="font-family: monospace; font-weight: 900; font-size: 11px;">R$ ${vm.valorReceber.toFixed(2)}</span>
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
                    ${d.type === 'NF' ? `<div><b>NF Papel:</b> Nº ${escapeHtml(d.number)} Série ${escapeHtml(d.series || '1')} ${d.amount ? `| R$ ${Number(d.amount).toFixed(2)}` : ''}</div>` : ''}
                    ${d.type === 'OUTROS' ? `<div><b>Outro Doc:</b> Nº ${escapeHtml(d.number || '-')} ${d.amount ? `| R$ ${Number(d.amount).toFixed(2)}` : ''}</div>` : ''}
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
