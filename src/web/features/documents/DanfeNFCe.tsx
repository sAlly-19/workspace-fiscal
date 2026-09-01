import { Receipt, Smartphone, Store, User } from 'lucide-react';
import { formatDate, formatTime, formatMoney, getPaymentLabel } from '../../../core/danfe/helpers';

/**
 * QR Code procedural sem dependência externa.
 * Gera uma matriz 21x21 estilo QR Code Version 1 a partir de um seed (chave de acesso).
 * Inclui os 3 padrões de detecção nos cantos.
 */
function QrCodePattern({ seed, size = 120 }: { seed: string; size?: number }) {
  const modules = 21;
  const cell = size / modules;
  // Hash determinístico simples da chave
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const isFinder = (x: number, y: number) => {
    // Cantos superiores-esquerdo, superior-direito, inferior-esquerdo
    const inBox = (cx: number, cy: number) =>
      x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    const finder = (cx: number, cy: number) => {
      if (!inBox(cx, cy)) return false;
      // Quadrado 7x7
      if (x === cx || x === cx + 6 || y === cy || y === cy + 6) return true;
      // Quadrado 3x3 interno
      if (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4) return true;
      return false;
    };
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true;
    return false;
  };
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      // Reserva separadores (linha branca em volta dos finders)
      const sep = (cx: number, cy: number) =>
        (x === cx - 1 && y >= cy - 1 && y <= cy + 7) ||
        (x === cx + 7 && y >= cy - 1 && y <= cy + 7) ||
        (y === cy - 1 && x >= cx - 1 && x <= cx + 7) ||
        (y === cy + 7 && x >= cx - 1 && x <= cx + 7);
      if (isFinder(x, y) || sep(0, 0) || sep(14, 0) || sep(0, 14)) {
        cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="black" />);
        continue;
      }
      // Pontos de alinhamento (canto inferior-direito do QR v1 simplificado)
      if (x >= 14 && x <= 18 && y >= 14 && y <= 18) {
        const dx = x - 16, dy = y - 16;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === 0 || (Math.abs(dx) <= 1 && Math.abs(dy) <= 1)) {
          cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="black" />);
          continue;
        }
      }
      // Timing patterns
      if (x === 6 || y === 6) {
        const dark = (x + y) % 2 === 0;
        if (dark) {
          cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="black" />);
          continue;
        }
      }
      // Data area: pseudo-aleatório baseado no hash da chave
      const bit = ((h >>> ((x * 3 + y * 5) % 32)) ^ (h * (x + 1) + y)) & 1;
      if (bit) {
        cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="black" />);
      }
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ shapeRendering: 'crispEdges' }}
    >
      <rect width={size} height={size} fill="white" />
      {cells}
    </svg>
  );
}

/**
 * NFC-e: Cupom Fiscal Eletrônico
 * - Layout vertical compacto (~58mm / 72mm / A4 reduções)
 * - Sem duplicatas / sem fatura
 * - QR Code para consulta (em vez de código de barras)
 * - Destaque no valor total
 * - Identidade visual verde (cor associada ao consumidor)
 */
export function DanfeNFCe({ doc }: { doc: any }) {
  const accessKeyUrl = doc.accessKey
    ? `https://www.sefaz.rs.gov.br/NFCE/CONSULTA?p=${doc.accessKey}`
    : '';

  return (
    <div className="p-4 md:p-8 min-h-full flex justify-center print:bg-white print:p-0 bg-[#0d4f2e]/10">
      <div
        className="bg-white text-black w-full max-w-[400px] font-mono text-[10px] leading-tight shadow-2xl p-4 border-2 border-emerald-700 print:shadow-none print:border-none print:max-w-none print:w-full print:p-2"
        style={{ borderRadius: '4px' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-emerald-700 pb-2 mb-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 text-white mb-1">
            <Receipt className="w-5 h-5" />
          </div>
          <h1 className="font-black text-base tracking-wider text-emerald-800">CUPOM FISCAL ELETRÔNICO</h1>
          <p className="text-[8px] text-emerald-700 uppercase">NFC-e • Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p>
          <p className="text-[9px] font-bold text-black mt-1">{doc.issuerName || 'NOME / RAZÃO SOCIAL DO EMITENTE'}</p>
          <p className="text-[8px] text-gray-700">CNPJ/CPF: {doc.issuerDocument || 'NÃO INFORMADO'}</p>
        </div>

        {/* Doc Info */}
        <div className="flex justify-between text-[9px] py-1 border-b border-dashed border-emerald-700">
          <div>
            <div className="text-gray-600">Nº</div>
            <div className="font-bold text-sm">{doc.number || '000.000'}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">SÉRIE</div>
            <div className="font-bold text-sm">{doc.series || '1'}</div>
          </div>
          <div className="text-right">
            <div className="text-gray-600">EMISSÃO</div>
            <div className="font-bold text-sm">
              {doc.issueDate ? formatDate(doc.issueDate) : '--/--/----'}
            </div>
            <div className="text-[8px] text-gray-600">{formatTime(doc.issueDate)}</div>
          </div>
        </div>

        {/* Endereço simplificado do emitente (se houver) */}
        {doc.issuerAddress && (
          <div className="text-[8px] text-gray-700 py-1 border-b border-dashed border-emerald-700">
            {doc.issuerAddress}
          </div>
        )}

        {/* Items */}
        <div className="py-2 border-b border-dashed border-emerald-700">
          <div className="text-[8px] font-bold text-emerald-800 mb-1 flex items-center gap-1">
            <Store className="w-2.5 h-2.5" /> ITENS DA COMPRA
          </div>
          {doc.items && doc.items.length > 0 ? (
            <table className="w-full text-[9px]">
              <tbody>
                {doc.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="align-top">
                    <td className="py-0.5 pr-1 font-bold">{item.quantity}x</td>
                    <td className="py-0.5 pr-1 flex-1">
                      <div>{item.description}</div>
                      <div className="text-[8px] text-gray-600">
                        {item.code && `Cód: ${item.code} • `}
                        {formatMoney(item.unitPrice)} un.
                      </div>
                    </td>
                    <td className="py-0.5 text-right font-bold whitespace-nowrap">
                      {formatMoney(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 italic text-[9px] py-2">Nenhum item detalhado.</p>
          )}
        </div>

        {/* Totals */}
        <div className="py-2 border-b border-dashed border-emerald-700 text-[9px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold">{formatMoney(doc.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Desconto</span>
            <span className="font-bold">R$ 0,00</span>
          </div>
          <div className="flex justify-between text-base font-black mt-1 pt-1 border-t border-emerald-700 text-emerald-900">
            <span>TOTAL</span>
            <span>{formatMoney(doc.totalAmount)}</span>
          </div>
        </div>

        {/* Pagamento */}
        {doc.billing?.payments && doc.billing.payments.length > 0 && (
          <div className="py-2 border-b border-dashed border-emerald-700 text-[9px]">
            <div className="text-[8px] font-bold text-emerald-800 mb-1 flex items-center gap-1">
              <Smartphone className="w-2.5 h-2.5" /> FORMA DE PAGAMENTO
            </div>
            {doc.billing.payments.map((pag: any, idx: number) => (
              <div key={idx} className="flex justify-between">
                <span>{getPaymentLabel(pag.paymentType)}</span>
                <span className="font-bold">{formatMoney(pag.amount)}</span>
              </div>
            ))}
            {doc.billing.payments.some((p: any) => p.changeAmount) && (
              <div className="flex justify-between text-gray-700">
                <span>Troco</span>
                <span className="font-bold">{formatMoney(doc.billing.payments[0].changeAmount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Consumidor */}
        <div className="py-2 border-b border-dashed border-emerald-700 text-[9px]">
          <div className="text-[8px] font-bold text-emerald-800 mb-1 flex items-center gap-1">
            <User className="w-2.5 h-2.5" /> CONSUMIDOR
          </div>
          <div className="font-bold">{doc.recipientName || 'Consumidor não identificado'}</div>
          {doc.recipientDocument && (
            <div className="text-gray-700 text-[8px]">CPF/CNPJ: {doc.recipientDocument}</div>
          )}
        </div>

        {/* QR Code */}
        {doc.accessKey && (
          <div className="py-3 text-center border-b border-dashed border-emerald-700">
            <div className="text-[8px] font-bold text-emerald-800 mb-2 uppercase">Consulte pela chave via QR Code</div>
            <div className="inline-block p-2 bg-white border-2 border-emerald-700">
              <QrCodePattern seed={doc.accessKey} size={120} />
            </div>
            <div className="font-mono text-[8px] font-bold text-center mt-2 break-all px-2">
              {doc.accessKey.match(/.{1,4}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[8px] text-emerald-900 pt-2 space-y-1">
          <p className="font-bold">NFC-e nº {doc.number || '000.000'} Série {doc.series || '1'}</p>
          <p>Emissão: {doc.issueDate ? formatDate(doc.issueDate) : '--/--/----'} {formatTime(doc.issueDate)}</p>
          <p className="italic">Consulte em www.sefaz.rs.gov.br/nfce/consulta</p>
          <div className="border-t border-dashed border-emerald-700 pt-1 mt-1 text-[7px] text-gray-600">
            Documento emitido em ambiente de homologação/dev • NFView
          </div>
        </div>
      </div>
    </div>
  );
}
