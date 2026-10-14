import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { resolveFiscalStatus } from '../fiscal-status.utils';

export interface DadosHeaderSectionProps {
  doc: any;
  isLight: boolean;
}

export function DadosHeaderSection({ doc, isLight }: DadosHeaderSectionProps) {
  const statusInfo = resolveFiscalStatus(doc);
  const hasSignature = doc.hasSignature === true;

  return (
    <>
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

      {/* Autenticidade, Protocolo & Assinatura Digital (IMP-019) */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg border shrink-0 ${
              statusInfo.category === 'AUTHORIZED'
                ? isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : statusInfo.category === 'CANCELLED_DENIED'
                ? isLight
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                : isLight
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            {statusInfo.category === 'AUTHORIZED' && <ShieldCheck className="w-5 h-5" />}
            {statusInfo.category === 'CANCELLED_DENIED' && <XCircle className="w-5 h-5" />}
            {statusInfo.category === 'UNAUTHORIZED_OR_DRAFT' && <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                {statusInfo.label}
              </span>
              {doc.protocol && (
                <span className={`text-[11px] font-mono font-semibold ${isLight ? 'text-gray-600' : 'text-zinc-400'}`}>
                  • Protocolo: {doc.protocol}
                </span>
              )}
            </div>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-gray-500' : 'text-zinc-400'}`}>
              {statusInfo.description}
            </p>
          </div>
        </div>

        {/* Assinatura Digital XMLDSig */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              hasSignature
                ? isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : isLight
                ? 'bg-gray-100 text-gray-500 border-gray-200'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{hasSignature ? 'Assinado Digitalmente (XMLDSig)' : 'Sem Assinatura Digital'}</span>
          </span>
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
    </>
  );
}
