import { formatDate, formatMoney } from '../../../../../core/danfe';

export interface DanfeBillingProps {
  billing?: any;
  defaultDocNumber?: string;
}

export function DanfeBilling({ billing, defaultDocNumber }: DanfeBillingProps) {
  if (
    !billing ||
    ((!billing.duplicates || billing.duplicates.length === 0) &&
      (!billing.invoice || (!billing.invoice.number && !billing.invoice.originalAmount)))
  ) {
    return null;
  }

  return (
    <>
      <div className="text-[8px] font-black uppercase text-black mb-0.5">FATURA / DUPLICATA</div>
      <div className="border border-black mb-1.5 p-1 text-[8px]">
        {billing.invoice && (billing.invoice.number || billing.invoice.originalAmount) && (
          <div className="flex items-center justify-between border-b border-dashed border-gray-400 pb-1 mb-1 text-[7.5px]">
            <div>
              <span className="font-bold text-gray-600">Nº FATURA:</span>{' '}
              <span className="font-black">{billing.invoice.number || defaultDocNumber || '-'}</span>
            </div>
            <div>
              <span className="font-bold text-gray-600">VALOR ORIG.:</span>{' '}
              <span className="font-black">{formatMoney(billing.invoice.originalAmount)}</span>
            </div>
            <div>
              <span className="font-bold text-gray-600">DESC.:</span>{' '}
              <span className="font-black">{formatMoney(billing.invoice.discountAmount)}</span>
            </div>
            <div>
              <span className="font-bold text-gray-600">VALOR LÍQ.:</span>{' '}
              <span className="font-black">
                {formatMoney(billing.invoice.netAmount || billing.invoice.originalAmount)}
              </span>
            </div>
          </div>
        )}
        {billing.duplicates && billing.duplicates.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {billing.duplicates.map((dup: any, idx: number) => (
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
  );
}

