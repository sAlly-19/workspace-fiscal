import { Truck, MapPin, Package, FileSignature, Hash, Building2 } from 'lucide-react';
import { formatDate, formatTime, formatMoney, formatCFOP, formatModFrete } from '../../../core/danfe/helpers';

interface FieldProps {
  label: string;
  value: string | number;
  className?: string;
}

function Field({ label, value, className = '' }: FieldProps) {
  return (
    <div className={`p-1 ${className}`}>
      <div className="text-[7px] uppercase text-gray-600 leading-none mb-0.5">{label}</div>
      <div className="font-bold text-[10px] leading-tight break-words">{value || '-'}</div>
    </div>
  );
}

/**
 * DACTE: Documento Auxiliar do Conhecimento de Transporte Eletrônico
 * - Layout horizontal A4 paisagem
 * - Identidade visual âmbar/laranja (cor associada a transporte)
 * - Seções: Emitente, Remetente, Destinatário, Tomador, Mercadoria, ICMS, etc.
 * - Destaque na modalidade do frete e CFOP
 */
export function DanfeDACTE({ doc }: { doc: any }) {
  const modalidadeFrete = doc.modFrete ?? 1;
  const cfop = doc.cfop || '6351';

  return (
    <div className="p-4 md:p-6 min-h-full flex justify-center print:bg-white print:p-0 bg-amber-100/40">
      <div className="bg-white text-black w-full max-w-[1100px] min-w-[720px] shadow-2xl border-2 border-amber-600 print:shadow-none print:border-none print:max-w-none print:w-full print:min-w-0" style={{ borderRadius: '2px' }}>
        {/* Header */}
        <div className="bg-amber-500 text-white px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-white text-amber-600 flex items-center justify-center">
              <Truck className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-wider leading-none">DACTE</h1>
              <p className="text-[9px] leading-tight opacity-90">
                Documento Auxiliar do Conhecimento de Transporte Eletrônico
              </p>
            </div>
          </div>
          <div className="text-right text-[9px] space-y-0.5">
            <div className="flex gap-3 justify-end">
              <div>
                <span className="opacity-75">Nº:</span>{' '}
                <span className="font-bold text-sm">{doc.number || '000.000'}</span>
              </div>
              <div>
                <span className="opacity-75">SÉRIE:</span>{' '}
                <span className="font-bold text-sm">{doc.series || '1'}</span>
              </div>
            </div>
            <div>
              <span className="opacity-75">FLHA:</span> 1/1
            </div>
          </div>
        </div>

        {/* Tipo de CT-e + Modelo + Situação */}
        <div className="flex border-b-2 border-amber-600 text-[9px]">
          <div className="flex-1 p-2 border-r border-amber-300">
            <div className="text-[7px] uppercase text-gray-600">Modelo</div>
            <div className="font-bold text-base">57 - CT-e</div>
          </div>
          <div className="flex-1 p-2 border-r border-amber-300">
            <div className="text-[7px] uppercase text-gray-600">Tipo do CT-e</div>
            <div className="font-bold">Normal</div>
          </div>
          <div className="flex-1 p-2 border-r border-amber-300">
            <div className="text-[7px] uppercase text-gray-600">Data/Hora Emissão</div>
            <div className="font-bold">
              {doc.issueDate ? `${formatDate(doc.issueDate)} ${formatTime(doc.issueDate)}` : '-'}
            </div>
          </div>
          <div className="flex-1 p-2">
            <div className="text-[7px] uppercase text-gray-600">Situação</div>
            <div className="font-bold text-emerald-700">Autorizado</div>
          </div>
        </div>

        {/* Emitente */}
        <div className="border-b border-amber-300 p-2 flex items-center gap-3 bg-amber-50">
          <Building2 className="w-5 h-5 text-amber-700 shrink-0" />
          <div className="flex-1">
            <div className="text-[7px] uppercase text-amber-800 font-bold">Emitente</div>
            <div className="font-bold text-sm">{doc.issuerName || 'EMITENTE DO CT-e'}</div>
            <div className="text-[8px] text-gray-700 font-mono">
              CNPJ/CPF: {doc.issuerDocument || '-'} | IE: {doc.issuerIE || '-'}
            </div>
          </div>
          <div className="text-right text-[8px] text-gray-700">
            <div>{doc.issuerAddress || 'Endereço do emitente'}</div>
            <div>{doc.issuerCity || 'Cidade'} / {doc.issuerState || 'UF'}</div>
          </div>
        </div>

        {/* Remetente / Destinatário / Tomador */}
        <div className="border-b-2 border-amber-600">
          <div className="bg-amber-100 px-2 py-1 text-[8px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> Partes do Transporte
          </div>
          <div className="grid grid-cols-3 divide-x divide-amber-300 text-[9px]">
            <div className="p-1.5">
              <div className="text-[7px] uppercase text-amber-700 font-bold mb-0.5">Remetente</div>
              <div className="font-bold text-[10px]">{doc.issuerName || '-'}</div>
              <div className="text-[8px] text-gray-700 font-mono">{doc.issuerDocument || '-'}</div>
              <div className="text-[8px] text-gray-600">Município: {doc.issuerCity || '-'}/{doc.issuerState || '-'}</div>
            </div>
            <div className="p-1.5">
              <div className="text-[7px] uppercase text-amber-700 font-bold mb-0.5">Destinatário</div>
              <div className="font-bold text-[10px]">{doc.recipientName || 'Consumidor Final'}</div>
              <div className="text-[8px] text-gray-700 font-mono">{doc.recipientDocument || '-'}</div>
              <div className="text-[8px] text-gray-600">Município: {doc.recipientCity || '-'}/{doc.recipientState || '-'}</div>
            </div>
            <div className="p-1.5">
              <div className="text-[7px] uppercase text-amber-700 font-bold mb-0.5">Tomador</div>
              <div className="font-bold text-[10px]">{doc.recipientName || '-'}</div>
              <div className="text-[8px] text-gray-700 font-mono">{doc.recipientDocument || '-'}</div>
              <div className="text-[8px] text-gray-600">Tipo: Destinatário</div>
            </div>
          </div>
        </div>

        {/* Mercadoria / Valores da Prestação */}
        <div className="grid grid-cols-2 border-b border-amber-300">
          {/* Esquerda: Mercadoria transportada */}
          <div className="border-r border-amber-300">
            <div className="bg-amber-100 px-2 py-1 text-[8px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Package className="w-2.5 h-2.5" /> Mercadoria Transportada
            </div>
            <div className="p-2 space-y-1.5">
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <Field label="CFOP" value={formatCFOP(cfop)} />
                <Field label="Natureza da Operação" value="Prestação de Serviço" />
                <Field label="Código NCM" value={doc.items?.[0]?.ncm || '00000000'} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <Field label="Qtd. Volumes" value={doc.items?.length || 1} />
                <Field label="Peso Bruto (kg)" value={(doc.totalWeight || 0).toFixed(3)} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <Field label="Valor da Mercadoria" value={formatMoney(doc.totalAmount)} />
                <Field label="Modal do Frete" value={formatModFrete(modalidadeFrete)} />
              </div>
            </div>
          </div>

          {/* Direita: Cálculo do Serviço */}
          <div>
            <div className="bg-amber-100 px-2 py-1 text-[8px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <FileSignature className="w-2.5 h-2.5" /> Componentes do Valor da Prestação
            </div>
            <div className="p-2 space-y-1.5 text-[9px]">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Valor Total do Serviço" value={formatMoney(doc.totalAmount)} />
                <Field label="Valor a Receber" value={formatMoney(doc.totalAmount)} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Field label="Frete Peso" value={formatMoney(doc.fretePeso)} />
                <Field label="Frete Valor" value={formatMoney(doc.freteValor)} />
                <Field label="ICMS" value={formatMoney(doc.icms)} />
                <Field label="Pedágio" value={formatMoney(doc.pedagio)} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Field label="GRIS" value={formatMoney(doc.gris)} />
                <Field label="SEC/CAT" value={formatMoney(doc.secat)} />
                <Field label="Desconto" value={formatMoney(doc.desconto)} />
                <Field label="Outros" value={formatMoney(doc.outros)} />
              </div>
            </div>
          </div>
        </div>

        {/* Impostos + Observações */}
        <div className="grid grid-cols-2 border-b-2 border-amber-600">
          <div className="border-r border-amber-300 p-2">
            <div className="text-[7px] uppercase text-amber-800 font-bold mb-1">Impostos</div>
            <div className="grid grid-cols-3 gap-1 text-[8px]">
              <div className="p-1 bg-amber-50 rounded">
                <div className="text-gray-600">Alíq. ICMS</div>
                <div className="font-bold text-sm">{doc.icmsAliq || 0}%</div>
              </div>
              <div className="p-1 bg-amber-50 rounded">
                <div className="text-gray-600">Base ICMS</div>
                <div className="font-bold text-sm">{formatMoney(doc.totalAmount)}</div>
              </div>
              <div className="p-1 bg-amber-50 rounded">
                <div className="text-gray-600">Valor ICMS</div>
                <div className="font-bold text-sm">{formatMoney(doc.icms)}</div>
              </div>
            </div>
          </div>
          <div className="p-2">
            <div className="text-[7px] uppercase text-amber-800 font-bold mb-1">Observações</div>
            <div className="text-[8.5px] text-gray-700">
              Documento emitido em conformidade com o CT-e. Prestação de serviço de transporte
              conforme legislação vigente. Mercadoria entregue ao destinatário no prazo contratual.
            </div>
          </div>
        </div>

        {/* Chave de Acesso */}
        <div className="p-2">
          <div className="flex items-center gap-1 mb-1">
            <Hash className="w-3 h-3 text-amber-700" />
            <div className="text-[7px] uppercase text-amber-800 font-bold">Chave de Acesso para Consulta</div>
          </div>
          <div className="font-mono text-[10px] font-bold text-center tracking-wider bg-amber-50 py-1 border border-amber-300 rounded">
            {doc.accessKey ? doc.accessKey.match(/.{1,4}/g)?.join(' ') : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000'}
          </div>
          <div className="text-center text-[7px] text-gray-600 mt-1 italic">
            Consulta em www.cte.fazenda.gov.br/portal
          </div>
        </div>
      </div>
    </div>
  );
}
