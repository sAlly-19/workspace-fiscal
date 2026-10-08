import { Receipt, CalendarClock, CreditCard } from 'lucide-react';
import { getPaymentLabel } from '../../../../core/danfe/helpers';

export interface DadosViewProps {
  doc: any;
  theme: string;
}

export function DadosView({ doc, theme }: DadosViewProps) {
  const isLight = theme === 'light';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Tipo de Documento
          </div>
          <div className="text-sm font-bold text-blue-400">{doc.type || 'NF-e'}</div>
        </div>
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Número / Série
          </div>
          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            Nº {doc.number || 'S/N'} • Série {doc.series || '0'}
          </div>
        </div>
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Data de Emissão
          </div>
          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
        <div
          className={`p-3.5 rounded-xl border ${
            isLight ? 'bg-green-50 border-green-200' : 'border-green-500/30 bg-green-500/5'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-green-700' : 'text-emerald-300'}`}>
            Valor Total da Nota
          </div>
          <div className={`text-base font-black ${isLight ? 'text-green-700' : 'text-emerald-300'}`}>
            {doc.totalAmount ? `R$ ${doc.totalAmount.toFixed(2)}` : 'R$ 0,00'}
          </div>
        </div>
      </div>

      {/* Access Key */}
      {doc.accessKey && (
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Chave de Acesso (44 dígitos)
          </div>
          <div className={`font-mono text-xs font-semibold break-all ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
            {doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey}
          </div>
        </div>
      )}

      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Emitente
          </div>
          <div className={`text-sm font-bold mb-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.issuerName || 'Não Informado'}
          </div>
          <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            CNPJ/CPF:{' '}
            <span className={`font-mono font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              {doc.issuerDocument || 'Não Informado'}
            </span>
          </div>
        </div>
        <div
          className={`p-4 rounded-xl border ${
            isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
          }`}
        >
          <div className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Destinatário / Remetente
          </div>
          <div className={`text-sm font-bold mb-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.recipientName || 'Não Informado / Consumidor Final'}
          </div>
          <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            CNPJ/CPF:{' '}
            <span className={`font-mono font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              {doc.recipientDocument || 'Não Informado'}
            </span>
          </div>
        </div>
      </div>

      {/* Fatura / Duplicatas & Cobrança Section */}
      {doc.billing &&
        (doc.billing.invoice ||
          (doc.billing.duplicates && doc.billing.duplicates.length > 0) ||
          (doc.billing.payments && doc.billing.payments.length > 0)) && (
          <div
            className={`rounded-xl overflow-hidden border ${
              isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
            }`}
          >
            <div
              className={`px-4 py-3 border-b flex items-center justify-between ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Receipt className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  Fatura / Duplicatas & Cobrança
                </span>
              </div>
              {doc.billing.duplicates && doc.billing.duplicates.length > 0 && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {doc.billing.duplicates.length}{' '}
                  {doc.billing.duplicates.length === 1 ? 'parcela' : 'parcelas'}
                </span>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Invoice Summary */}
              {doc.billing.invoice && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                    }`}
                  >
                    <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      Nº da Fatura
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                      {doc.billing.invoice.number || doc.number || '-'}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                    }`}
                  >
                    <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      Valor Original
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                      R$ {doc.billing.invoice.originalAmount?.toFixed(2) || '0,00'}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                    }`}
                  >
                    <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      Desconto
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                      R$ {doc.billing.invoice.discountAmount?.toFixed(2) || '0,00'}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border ${
                      isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                      Valor Líquido
                    </div>
                    <div className={`text-xs font-bold ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                      R${' '}
                      {doc.billing.invoice.netAmount?.toFixed(2) ||
                        doc.billing.invoice.originalAmount?.toFixed(2) ||
                        '0,00'}
                    </div>
                  </div>
                </div>
              )}

              {/* Duplicates / Installments Grid */}
              {doc.billing.duplicates && doc.billing.duplicates.length > 0 && (
                <div>
                  <div
                    className={`text-[11px] font-bold uppercase mb-2 flex items-center gap-1.5 ${
                      isLight ? 'text-[#334155]' : 'text-slate-300'
                    }`}
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Duplicatas / Parcelas
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {doc.billing.duplicates.map((dup: any, idx: number) => {
                      const numFormatted = String(dup.number).padStart(3, '0');
                      const dateFormatted = dup.dueDate
                        ? dup.dueDate.includes('-')
                          ? dup.dueDate.split('T')[0].split('-').reverse().join('/')
                          : dup.dueDate
                        : '-';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border transition-all ${
                            isLight
                              ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300 shadow-xs'
                              : 'bg-[#141417] border-[#27272a] hover:border-blue-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              Duplicata #{numFormatted}
                            </span>
                            <span
                              className={`text-[10px] font-mono ${
                                isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'
                              }`}
                            >
                              {idx + 1} de {doc.billing.duplicates.length}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Vencimento:</span>
                              <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                                {dateFormatted}
                              </span>
                            </div>
                            <div
                              className={`flex justify-between items-center pt-1.5 border-t ${
                                isLight ? 'border-gray-200' : 'border-zinc-800'
                              }`}
                            >
                              <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Valor:</span>
                              <span className={`font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                                R$ {dup.amount?.toFixed(2) || '0,00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              {doc.billing.payments && doc.billing.payments.length > 0 && (
                <div
                  className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
                    isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span className={`text-xs font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                      Forma de Pagamento:
                    </span>
                    <span className={`text-xs font-medium ${isLight ? 'text-[#334155]' : 'text-slate-300'}`}>
                      {doc.billing.payments.map((p: any) => getPaymentLabel(p.paymentType)).join(', ')}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className={`font-semibold ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Total: </span>
                    <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      R${' '}
                      {doc.billing.payments
                        .reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Impostos e Tributos */}
      {(doc.totals?.taxes || (doc.taxes && doc.taxes.length > 0)) && (
        <div
          className={`rounded-xl overflow-hidden border ${
            isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
          }`}
        >
          <div
            className={`px-4 py-2.5 border-b flex items-center justify-between ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Quadro de Tributos e Retenções
            </span>
            {doc.totals?.totalTaxes && doc.totals.totalTaxes > 0 && (
              <span className={`text-[11px] font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                Total Aprox. Tributos: R$ {doc.totals.totalTaxes.toFixed(2)}
              </span>
            )}
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* ICMS */}
            <div
              className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                ICMS
              </div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0)).toFixed(2)}
              </div>
              {doc.totals?.icmsBase ?? doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base ? (
                <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                  Base: R$ {(doc.totals?.icmsBase ?? doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base).toFixed(2)}
                </div>
              ) : null}
            </div>

            {/* ICMS ST */}
            {doc.totals?.taxes?.icmsSt ||
            doc.totals?.icmsStBase ||
            doc.taxes?.some((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST') ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  ICMS ST
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R${' '}
                  {(
                    doc.totals?.taxes?.icmsSt ??
                    (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0)
                  ).toFixed(2)}
                </div>
                {doc.totals?.icmsStBase ? (
                  <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                    Base: R$ {doc.totals.icmsStBase.toFixed(2)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* IPI */}
            <div
              className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                IPI
              </div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.ipi ?? (doc.taxes?.find((t: any) => t.taxType === 'IPI')?.amount || 0)).toFixed(2)}
              </div>
            </div>

            {/* PIS */}
            <div
              className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                PIS
              </div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount || 0)).toFixed(2)}
              </div>
            </div>

            {/* COFINS */}
            <div
              className={`p-2.5 rounded-lg border ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                COFINS
              </div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount || 0)).toFixed(2)}
              </div>
            </div>

            {/* ISS (se houver) */}
            {doc.totals?.taxes?.iss || doc.taxes?.some((t: any) => t.taxType === 'ISS') ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  ISS
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.iss ?? (doc.taxes?.find((t: any) => t.taxType === 'ISS')?.amount || 0)).toFixed(2)}
                </div>
                {doc.totals?.taxes?.issBase ? (
                  <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                    Base: R$ {doc.totals.taxes.issBase.toFixed(2)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* INSS (se houver) */}
            {doc.totals?.taxes?.inss || doc.taxes?.some((t: any) => t.taxType === 'INSS') ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  INSS
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.inss ?? (doc.taxes?.find((t: any) => t.taxType === 'INSS')?.amount || 0)).toFixed(2)}
                </div>
              </div>
            ) : null}

            {/* IR / IRRF (se houver) */}
            {doc.totals?.taxes?.ir || doc.taxes?.some((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF') ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  IRRF
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.ir ?? (doc.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount || 0)).toFixed(2)}
                </div>
              </div>
            ) : null}

            {/* CSLL (se houver) */}
            {doc.totals?.taxes?.csll || doc.taxes?.some((t: any) => t.taxType === 'CSLL') ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  CSLL
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.csll ?? (doc.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount || 0)).toFixed(2)}
                </div>
              </div>
            ) : null}

            {/* ISS Retido (se houver) */}
            {doc.totals?.taxes?.issRetained || doc.issRetained ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  ISS Retido
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  {typeof doc.totals?.taxes?.issRetained === 'number' && doc.totals.taxes.issRetained > 0
                    ? `R$ ${doc.totals.taxes.issRetained.toFixed(2)}`
                    : 'Sim'}
                </div>
              </div>
            ) : null}

            {/* Outras Retenções (se houver) */}
            {doc.totals?.taxes?.outrasRetencoes && doc.totals.taxes.outrasRetencoes > 0 ? (
              <div
                className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}
              >
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Outras Retenções
                </div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {doc.totals.taxes.outrasRetencoes.toFixed(2)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Items Table */}
      {doc.items && doc.items.length > 0 && (
        <div
          className={`rounded-xl overflow-hidden border ${
            isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
          }`}
        >
          <div
            className={`px-4 py-2.5 border-b flex items-center justify-between ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Itens da Nota ({doc.items.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[650px]">
              <thead
                className={`border-b ${
                  isLight
                    ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]'
                    : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]'
                }`}
              >
                <tr>
                  <th className="px-3 py-2.5 font-semibold w-16">Cód.</th>
                  <th className="px-3 py-2.5 font-semibold">Descrição do Produto / Serviço</th>
                  <th className="px-3 py-2.5 font-semibold w-24">NCM</th>
                  <th className="px-3 py-2.5 font-semibold w-16">CFOP</th>
                  <th className="px-3 py-2.5 font-semibold w-12 text-center">Un</th>
                  <th className="px-3 py-2.5 font-semibold text-right w-16">Qtd</th>
                  <th className="px-3 py-2.5 font-semibold text-right w-24">V. Unitário</th>
                  <th className="px-3 py-2.5 font-semibold text-right w-24">V. Total</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isLight ? 'divide-[#e2e8f0] text-[#0f172a]' : 'divide-[#18181b] text-[#fafafa]'
                }`}
              >
                {doc.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className={isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/5'}>
                    <td className={`px-3 py-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      {item.code || '-'}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.description}</td>
                    <td className={`px-3 py-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      {item.ncm || '-'}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-500">{item.cfop || '-'}</td>
                    <td className="px-3 py-2 text-center uppercase font-mono text-[11px]">{item.unit || 'UN'}</td>
                    <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                    <td className={`px-3 py-2 text-right ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      R$ {item.unitPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold ${
                        isLight ? 'text-[#0f172a]' : 'text-emerald-400'
                      }`}
                    >
                      R$ {item.totalPrice?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

