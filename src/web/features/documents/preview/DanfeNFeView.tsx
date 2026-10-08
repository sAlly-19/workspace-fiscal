import {
  formatDate,
  formatTime,
  formatMoney,
  formatModFrete,
  formatCnpjCpf,
  formatCep,
  formatPhone,
} from '../../../../core/danfe/helpers';

export interface DanfeNFeViewProps {
  doc: any;
  theme: string;
}

export function DanfeNFeView({ doc, theme }: DanfeNFeViewProps) {
  const isLight = theme === 'light';

  const baseIcms = doc.totals?.icmsBase ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base || 0);
  const valorIcms = doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0);
  const baseIcmsSt = doc.totals?.icmsStBase ?? 0;
  const valorIcmsSt =
    doc.totals?.taxes?.icmsSt ??
    (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0);
  const impImportacao = doc.totals?.taxes?.ii ?? 0;
  const icmsUfRemet = doc.totals?.taxes?.icmsUfRemet ?? 0;
  const fcpUfDest = doc.totals?.taxes?.fcpUfDest ?? 0;
  const pis = doc.totals?.taxes?.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount || 0);
  const valorProdutos = doc.totals?.products || doc.totalAmount || 0;

  const valorFrete = doc.totals?.freight || 0;
  const valorSeguro = doc.totals?.insurance || 0;
  const valorDesconto = doc.totals?.discount || 0;
  const outrasDespesas = doc.totals?.otherExpenses || 0;
  const valorIpi = doc.totals?.taxes?.ipi ?? (doc.taxes?.find((t: any) => t.taxType === 'IPI')?.amount || 0);
  const icmsUfDest = doc.totals?.taxes?.icmsUfDest ?? 0;
  const totalTrib = doc.totals?.totalTaxes ?? 0;
  const cofins = doc.totals?.taxes?.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount || 0);
  const valorTotalNota = doc.totalAmount || doc.totals?.total || 0;

  const issuerName = doc.issuer?.name || doc.issuerName || 'NOME / RAZÃO SOCIAL';
  const issuerDoc = formatCnpjCpf(doc.issuer?.document || doc.issuerDocument);
  const issuerIE = doc.issuer?.ie || doc.issuerIE || '-';
  const issuerIM = doc.issuer?.im || doc.issuerIM || '-';
  const issuerStreet = doc.issuer?.address?.street || '';
  const issuerNumber = doc.issuer?.address?.number || '';
  const issuerComp = doc.issuer?.address?.complement ? ` - ${doc.issuer.address.complement}` : '';
  const issuerBairro = doc.issuer?.address?.neighborhood || '';
  const issuerCep = formatCep(doc.issuer?.address?.zipCode);
  const issuerCity = doc.issuer?.address?.city || '';
  const issuerState = doc.issuer?.address?.state || '';
  const issuerPhone = formatPhone(doc.issuer?.phone);

  const recipientName = doc.recipient?.name || doc.recipientName || 'CONSUMIDOR FINAL';
  const recipientDoc = formatCnpjCpf(doc.recipient?.document || doc.recipientDocument);
  const recipientIE = doc.recipient?.ie || doc.recipientIE || '-';
  const recipientStreet = doc.recipient?.address?.street
    ? `${doc.recipient.address.street}, ${doc.recipient.address.number || 'S/N'}${
        doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''
      }`
    : '-';
  const recipientBairro = doc.recipient?.address?.neighborhood || '-';
  const recipientCep = formatCep(doc.recipient?.address?.zipCode);
  const recipientCity = doc.recipient?.address?.city || '-';
  const recipientState = doc.recipient?.address?.state || '-';
  const recipientPhone = formatPhone(doc.recipient?.phone);

  const issueDateStr = formatDate(doc.issueDate);
  const exitDateStr = formatDate(doc.exitDate || doc.issueDate);
  const exitTimeStr = doc.exitTime || formatTime(doc.issueDate);

  const formattedKey = doc.accessKey
    ? doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey
    : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';

  const transport = doc.transport || {};
  const transpMod = formatModFrete(transport.modFrete);

  return (
    <div
      className={`p-2 sm:p-4 md:p-8 min-h-full flex justify-center overflow-x-auto print:bg-white print:p-0 ${
        isLight ? 'bg-[#e2e8f0]' : 'bg-[#27272a]'
      }`}
    >
      <div className="bg-white text-black w-full max-w-[850px] min-w-[700px] shadow-2xl p-4 sm:p-6 font-sans text-[9px] border border-black select-text danfe-selectable cursor-text print:shadow-none print:border-none print:max-w-none print:w-full print:min-w-0 print:p-0">
        {/* Canhoto de Recebimento */}
        <div className="border border-black mb-1.5">
          <div className="flex border-b border-black text-[8px]">
            <div className="flex-1 p-1 border-r border-black uppercase leading-tight">
              RECEBEMOS DE <span className="font-bold">{issuerName}</span> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA
              FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: <span className="font-bold">{issueDateStr}</span> VALOR
              TOTAL: <span className="font-bold">{formatMoney(valorTotalNota)}</span> DESTINATÁRIO:{' '}
              <span className="font-bold">{recipientName}</span> - {recipientStreet} {recipientBairro} {recipientCity}-
              {recipientState}
            </div>
            <div className="w-28 p-1 text-center font-bold">
              <div className="text-[10px]">NF-e</div>
              <div className="text-[9px]">Nº. {doc.number || '000.000'}</div>
              <div className="text-[8px]">Série {doc.series || '001'}</div>
            </div>
          </div>
          <div className="flex text-[7.5px] uppercase">
            <div className="w-32 p-1 border-r border-black font-semibold text-gray-700">DATA DE RECEBIMENTO</div>
            <div className="flex-1 p-1 font-semibold text-gray-700">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
          </div>
        </div>

        {/* Header Principal */}
        <div className="border border-black mb-1.5">
          <div className="flex border-b border-black">
            {/* Emitente */}
            <div className="w-[45%] p-2 border-r border-black flex flex-col justify-between">
              <div>
                <div className="text-[7px] text-gray-600 font-bold uppercase text-center mb-1">
                  IDENTIFICAÇÃO DO EMITENTE
                </div>
                <h1 className="font-black text-xs sm:text-sm leading-tight uppercase text-center">{issuerName}</h1>
                <div className="text-[8px] text-center mt-1 text-gray-800 leading-tight">
                  {issuerStreet ? `${issuerStreet}, ${issuerNumber}${issuerComp}` : ''}
                  {issuerBairro ? (
                    <>
                      <br />
                      {issuerBairro} - {issuerCep}
                    </>
                  ) : (
                    ''
                  )}
                  {issuerCity ? (
                    <>
                      <br />
                      {issuerCity} - {issuerState} {issuerPhone ? `Fone/Fax: ${issuerPhone}` : ''}
                    </>
                  ) : (
                    ''
                  )}
                </div>
              </div>
            </div>

            {/* DANFE center box */}
            <div className="w-[20%] p-1.5 border-r border-black flex flex-col justify-between items-center text-center">
              <div>
                <h2 className="font-black text-base tracking-wider leading-none">DANFE</h2>
                <p className="text-[7px] text-gray-700 font-semibold mt-0.5 leading-tight">
                  Documento Auxiliar da Nota Fiscal Eletrônica
                </p>
              </div>
              <div className="my-1 border border-black px-1.5 py-0.5 text-[8px] font-bold">
                0 - ENTRADA
                <br />1 - SAÍDA <span className="font-black text-[10px] ml-1">[ 1 ]</span>
              </div>
              <div className="text-[8.5px] font-bold leading-tight">
                <div>Nº. {doc.number || '000.000'}</div>
                <div>Série {doc.series || '001'}</div>
                <div>Folha 1/1</div>
              </div>
            </div>

            {/* Chave de Acesso + Código de Barras */}
            <div className="w-[35%] p-1.5 flex flex-col justify-between">
              <div>
                {/* Barcode representation */}
                <div className="h-9 w-full flex items-center justify-between px-1 bg-white mb-1 overflow-hidden select-none danfe-no-select">
                  {Array.from({ length: 55 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full bg-black ${i % 4 === 0 ? 'w-1' : i % 7 === 0 ? 'w-1.5' : 'w-0.5'}`}
                    />
                  ))}
                </div>
                <div className="text-[7px] text-gray-600 font-bold uppercase">CHAVE DE ACESSO</div>
                <div className="font-mono text-[9px] font-black tracking-wide text-center select-text cursor-text">
                  {formattedKey}
                </div>
              </div>
              <div className="text-center text-[7px] text-gray-600 leading-tight mt-1 pt-1 border-t border-gray-300">
                Consulta de autenticidade no portal nacional da NF-e
                <br />
                <span className="font-bold">www.nfe.fazenda.gov.br/portal</span> ou no site da Sefaz Autorizadora
              </div>
            </div>
          </div>

          {/* Natureza da Operação e Protocolo */}
          <div className="flex border-b border-black text-[8px]">
            <div className="w-[60%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">NATUREZA DA OPERAÇÃO</div>
              <div className="font-black uppercase">{doc.operationNature || 'VENDA DE MERCADORIA'}</div>
            </div>
            <div className="w-[40%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
              <div className="font-black font-mono">{doc.protocol || '-'}</div>
            </div>
          </div>

          {/* Inscrições e CNPJ Emitente */}
          <div className="flex text-[8px]">
            <div className="w-[28%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div>
              <div className="font-bold font-mono">{issuerIE}</div>
            </div>
            <div className="w-[28%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO MUNICIPAL</div>
              <div className="font-bold font-mono">{issuerIM}</div>
            </div>
            <div className="w-[20%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">INSC. ESTADUAL SUBST. TRIB.</div>
              <div className="font-bold font-mono">-</div>
            </div>
            <div className="w-[24%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div>
              <div className="font-black font-mono">{issuerDoc}</div>
            </div>
          </div>
        </div>

        {/* Destinatário / Remetente */}
        <div className="text-[8px] font-black uppercase text-black mb-0.5">DESTINATÁRIO / REMETENTE</div>
        <div className="border border-black mb-1.5 text-[8px]">
          <div className="flex border-b border-black">
            <div className="w-[60%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">NOME / RAZÃO SOCIAL</div>
              <div className="font-black uppercase">{recipientName}</div>
            </div>
            <div className="w-[25%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div>
              <div className="font-black font-mono">{recipientDoc}</div>
            </div>
            <div className="w-[15%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">DATA DA EMISSÃO</div>
              <div className="font-bold">{issueDateStr}</div>
            </div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-[45%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">ENDEREÇO</div>
              <div className="font-bold uppercase">{recipientStreet}</div>
            </div>
            <div className="w-[25%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">BAIRRO / DISTRITO</div>
              <div className="font-bold uppercase">{recipientBairro}</div>
            </div>
            <div className="w-[15%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">CEP</div>
              <div className="font-bold font-mono">{recipientCep}</div>
            </div>
            <div className="w-[15%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">DATA DA SAÍDA/ENTRADA</div>
              <div className="font-bold">{exitDateStr}</div>
            </div>
          </div>
          <div className="flex">
            <div className="w-[35%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">MUNICÍPIO</div>
              <div className="font-bold uppercase">{recipientCity}</div>
            </div>
            <div className="w-[8%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">UF</div>
              <div className="font-bold uppercase">{recipientState}</div>
            </div>
            <div className="w-[22%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">FONE / FAX</div>
              <div className="font-bold font-mono">{recipientPhone}</div>
            </div>
            <div className="w-[20%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div>
              <div className="font-bold font-mono">{recipientIE}</div>
            </div>
            <div className="w-[15%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">HORA DA SAÍDA/ENTRADA</div>
              <div className="font-bold">{exitTimeStr}</div>
            </div>
          </div>
        </div>

        {/* Fatura / Duplicata */}
        {((doc.billing?.duplicates && doc.billing.duplicates.length > 0) || doc.billing?.invoice) && (
          <>
            <div className="text-[8px] font-black uppercase text-black mb-0.5">FATURA / DUPLICATA</div>
            <div className="border border-black mb-1.5 p-1 text-[8px]">
              {doc.billing?.invoice && (doc.billing.invoice.number || doc.billing.invoice.originalAmount) && (
                <div className="flex items-center justify-between border-b border-dashed border-gray-400 pb-1 mb-1 text-[7.5px]">
                  <div>
                    <span className="font-bold text-gray-600">Nº FATURA:</span>{' '}
                    <span className="font-black">{doc.billing.invoice.number || doc.number || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-600">VALOR ORIG.:</span>{' '}
                    <span className="font-black">{formatMoney(doc.billing.invoice.originalAmount)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-600">DESC.:</span>{' '}
                    <span className="font-black">{formatMoney(doc.billing.invoice.discountAmount)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-600">VALOR LÍQ.:</span>{' '}
                    <span className="font-black">
                      {formatMoney(doc.billing.invoice.netAmount || doc.billing.invoice.originalAmount)}
                    </span>
                  </div>
                </div>
              )}
              {doc.billing?.duplicates && doc.billing.duplicates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doc.billing.duplicates.map((dup: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-black p-1 min-w-[120px] flex-1 max-w-[170px] text-[8px] bg-white"
                    >
                      <div className="flex justify-between">
                        <span className="text-[7px] text-gray-600 font-bold">Num.</span>{' '}
                        <span className="font-bold font-mono">{String(dup.number).padStart(3, '0')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[7px] text-gray-600 font-bold">Venc.</span>{' '}
                        <span className="font-bold">{dup.dueDate ? formatDate(dup.dueDate) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[7px] text-gray-600 font-bold">Valor</span>{' '}
                        <span className="font-black">{formatMoney(dup.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Cálculo do Imposto */}
        <div className="text-[8px] font-black uppercase text-black mb-0.5">CÁLCULO DO IMPOSTO</div>
        <div className="border border-black mb-1.5 text-[8px]">
          <div className="flex border-b border-black">
            <div className="w-[12%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">BASE DE CÁLC. DO ICMS</div>
              <div className="font-bold text-right">{baseIcms.toFixed(2)}</div>
            </div>
            <div className="w-[10%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO ICMS</div>
              <div className="font-bold text-right">{valorIcms.toFixed(2)}</div>
            </div>
            <div className="w-[13%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">BASE DE CÁLC. ICMS S.T.</div>
              <div className="font-bold text-right">{baseIcmsSt.toFixed(2)}</div>
            </div>
            <div className="w-[12%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO ICMS SUBST.</div>
              <div className="font-bold text-right">{valorIcmsSt.toFixed(2)}</div>
            </div>
            <div className="w-[11%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. IMP. IMPORTAÇÃO</div>
              <div className="font-bold text-right">{impImportacao.toFixed(2)}</div>
            </div>
            <div className="w-[11%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. ICMS UF REMET.</div>
              <div className="font-bold text-right">{icmsUfRemet.toFixed(2)}</div>
            </div>
            <div className="w-[10%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. FCP UF DEST.</div>
              <div className="font-bold text-right">{fcpUfDest.toFixed(2)}</div>
            </div>
            <div className="w-[9%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO PIS</div>
              <div className="font-bold text-right">{pis.toFixed(2)}</div>
            </div>
            <div className="w-[12%] p-0.5 bg-gray-50">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. TOTAL PRODUTOS</div>
              <div className="font-black text-right">{valorProdutos.toFixed(2)}</div>
            </div>
          </div>
          <div className="flex">
            <div className="w-[12%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO FRETE</div>
              <div className="font-bold text-right">{valorFrete.toFixed(2)}</div>
            </div>
            <div className="w-[10%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO SEGURO</div>
              <div className="font-bold text-right">{valorSeguro.toFixed(2)}</div>
            </div>
            <div className="w-[13%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">DESCONTO</div>
              <div className="font-bold text-right">{valorDesconto.toFixed(2)}</div>
            </div>
            <div className="w-[12%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">OUTRAS DESPESAS</div>
              <div className="font-bold text-right">{outrasDespesas.toFixed(2)}</div>
            </div>
            <div className="w-[11%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR TOTAL IPI</div>
              <div className="font-bold text-right">{valorIpi.toFixed(2)}</div>
            </div>
            <div className="w-[11%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. ICMS UF DEST.</div>
              <div className="font-bold text-right">{icmsUfDest.toFixed(2)}</div>
            </div>
            <div className="w-[10%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">V. TOT. TRIB.</div>
              <div className="font-bold text-right">{totalTrib.toFixed(2)}</div>
            </div>
            <div className="w-[9%] p-0.5 border-r border-black">
              <div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DA COFINS</div>
              <div className="font-bold text-right">{cofins.toFixed(2)}</div>
            </div>
            <div className="w-[12%] p-0.5 bg-gray-100">
              <div className="text-[6.5px] text-black font-black uppercase">V. TOTAL DA NOTA</div>
              <div className="font-black text-right text-[10px]">{valorTotalNota.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Transportador / Volumes Transportados */}
        <div className="text-[8px] font-black uppercase text-black mb-0.5">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
        <div className="border border-black mb-1.5 text-[8px]">
          <div className="flex border-b border-black">
            <div className="w-[40%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">NOME / RAZÃO SOCIAL</div>
              <div className="font-bold uppercase">{transport.name || '-'}</div>
            </div>
            <div className="w-[18%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">FRETE</div>
              <div className="font-bold">{transpMod}</div>
            </div>
            <div className="w-[10%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">CÓDIGO ANTT</div>
              <div className="font-bold font-mono">{transport.anttCode || '-'}</div>
            </div>
            <div className="w-[10%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">PLACA DO VEÍCULO</div>
              <div className="font-bold font-mono">{transport.vehiclePlate || '-'}</div>
            </div>
            <div className="w-[4%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">UF</div>
              <div className="font-bold uppercase">{transport.vehicleUf || '-'}</div>
            </div>
            <div className="w-[18%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div>
              <div className="font-bold font-mono">{formatCnpjCpf(transport.document)}</div>
            </div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-[45%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">ENDEREÇO</div>
              <div className="font-bold uppercase">{transport.address || '-'}</div>
            </div>
            <div className="w-[30%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">MUNICÍPIO</div>
              <div className="font-bold uppercase">{transport.city || '-'}</div>
            </div>
            <div className="w-[5%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">UF</div>
              <div className="font-bold uppercase">{transport.state || '-'}</div>
            </div>
            <div className="w-[20%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div>
              <div className="font-bold font-mono">{transport.ie || '-'}</div>
            </div>
          </div>
          <div className="flex">
            <div className="w-[12%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">QUANTIDADE</div>
              <div className="font-bold text-center">{transport.volumeQuantity ?? '-'}</div>
            </div>
            <div className="w-[15%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">ESPÉCIE</div>
              <div className="font-bold uppercase">{transport.volumeSpecies || '-'}</div>
            </div>
            <div className="w-[15%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">MARCA</div>
              <div className="font-bold uppercase">{transport.volumeBrand || '-'}</div>
            </div>
            <div className="w-[18%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">NUMERAÇÃO</div>
              <div className="font-bold">{transport.volumeNumber || '-'}</div>
            </div>
            <div className="w-[20%] p-1 border-r border-black">
              <div className="text-[7px] text-gray-600 font-bold uppercase">PESO BRUTO</div>
              <div className="font-bold text-right">
                {transport.grossWeight !== undefined ? transport.grossWeight.toFixed(3) : '-'}
              </div>
            </div>
            <div className="w-[20%] p-1">
              <div className="text-[7px] text-gray-600 font-bold uppercase">PESO LÍQUIDO</div>
              <div className="font-bold text-right">
                {transport.netWeight !== undefined ? transport.netWeight.toFixed(3) : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Dados dos Produtos / Serviços (Tabela SEFAZ completa) */}
        <div className="text-[8px] font-black uppercase text-black mb-0.5">DADOS DOS PRODUTOS / SERVIÇOS</div>
        <div className="border border-black mb-1.5">
          <table className="w-full text-[7.5px] text-left border-collapse">
            <thead className="bg-gray-100 border-b border-black font-bold">
              <tr>
                <th className="p-0.5 border-r border-black w-10">CÓDIGO</th>
                <th className="p-0.5 border-r border-black">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                <th className="p-0.5 border-r border-black w-12 text-center">NCM/SH</th>
                <th className="p-0.5 border-r border-black w-8 text-center">O/CST</th>
                <th className="p-0.5 border-r border-black w-8 text-center">CFOP</th>
                <th className="p-0.5 border-r border-black w-6 text-center">UN</th>
                <th className="p-0.5 border-r border-black w-10 text-right">QUANT</th>
                <th className="p-0.5 border-r border-black w-12 text-right">VALOR UNIT</th>
                <th className="p-0.5 border-r border-black w-12 text-right">VALOR TOTAL</th>
                <th className="p-0.5 border-r border-black w-10 text-right">VALOR DESC</th>
                <th className="p-0.5 border-r border-black w-12 text-right">B.CÁLC ICMS</th>
                <th className="p-0.5 border-r border-black w-10 text-right">VALOR ICMS</th>
                <th className="p-0.5 border-r border-black w-8 text-right">VALOR IPI</th>
                <th className="p-0.5 border-r border-black w-8 text-right">ALÍQ. ICMS</th>
                <th className="p-0.5 w-8 text-right">ALÍQ. IPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {doc.items && doc.items.length > 0 ? (
                doc.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="p-0.5 border-r border-black font-mono">{item.code || '-'}</td>
                    <td className="p-0.5 border-r border-black font-medium uppercase">{item.description}</td>
                    <td className="p-0.5 border-r border-black font-mono text-center">{item.ncm || '-'}</td>
                    <td className="p-0.5 border-r border-black font-mono text-center">{item.cst || '0/00'}</td>
                    <td className="p-0.5 border-r border-black font-mono font-bold text-center">{item.cfop || '-'}</td>
                    <td className="p-0.5 border-r border-black text-center uppercase font-mono">{item.unit || 'UN'}</td>
                    <td className="p-0.5 border-r border-black text-right">{(item.quantity || 1).toFixed(4)}</td>
                    <td className="p-0.5 border-r border-black text-right">{(item.unitPrice || 0).toFixed(4)}</td>
                    <td className="p-0.5 border-r border-black text-right font-bold">
                      {(item.totalPrice || 0).toFixed(2)}
                    </td>
                    <td className="p-0.5 border-r border-black text-right">
                      {item.discount ? item.discount.toFixed(2) : '0,00'}
                    </td>
                    <td className="p-0.5 border-r border-black text-right">
                      {item.icmsBase ? item.icmsBase.toFixed(2) : '0,00'}
                    </td>
                    <td className="p-0.5 border-r border-black text-right">
                      {item.icmsValue ? item.icmsValue.toFixed(2) : '0,00'}
                    </td>
                    <td className="p-0.5 border-r border-black text-right">
                      {item.ipiValue ? item.ipiValue.toFixed(2) : '-'}
                    </td>
                    <td className="p-0.5 border-r border-black text-right">
                      {item.icmsAliq ? item.icmsAliq.toFixed(2) : '-'}
                    </td>
                    <td className="p-0.5 text-right">{item.ipiAliq ? item.ipiAliq.toFixed(2) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="p-2 text-center text-gray-500 italic">
                    Nenhum item detalhado encontrado no XML.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dados Adicionais */}
        <div className="text-[8px] font-black uppercase text-black mb-0.5">DADOS ADICIONAIS</div>
        <div className="border border-black flex text-[7.5px] min-h-[50px]">
          <div className="w-[65%] p-1 border-r border-black">
            <div className="font-bold text-[7px] text-gray-600 uppercase mb-0.5">INFORMAÇÕES COMPLEMENTARES</div>
            <div className="whitespace-pre-line text-gray-800 leading-tight">
              {doc.additionalInfo || 'Documento emitido em conformidade com o padrão nacional da SEFAZ.'}
            </div>
          </div>
          <div className="w-[35%] p-1">
            <div className="font-bold text-[7px] text-gray-600 uppercase mb-0.5">RESERVADO AO FISCO</div>
            <div className="whitespace-pre-line text-gray-800 leading-tight">{doc.fiscoInfo || ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

