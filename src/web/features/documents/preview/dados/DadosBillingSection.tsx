import { Receipt, CalendarClock, CreditCard } from 'lucide-react';
import { getPaymentLabel } from '../../../../../core/danfe';

export interface DadosBillingSectionProps {
  doc: any;
  isLight: boolean;
}

export function DadosBillingSection({ doc, isLight }: DadosBillingSectionProps) {
  if (
    !doc.billing ||
    (!doc.billing.invoice &&
      (!doc.billing.duplicates || doc.billing.duplicates.length === 0) &&
      (!doc.billing.payments || doc.billing.payments.length === 0))
  ) {
    return null;
  }

  return (
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
  );
}

