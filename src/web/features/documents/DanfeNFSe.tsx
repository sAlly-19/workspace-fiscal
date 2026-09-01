import { FileSpreadsheet, Building2, User, Calculator, Globe, Hash, Calendar } from 'lucide-react';
import { formatDate, formatMoney } from '../../../core/danfe/helpers';

interface FieldProps {
  label: string;
  value: string | number;
  className?: string;
  highlight?: boolean;
}

function Field({ label, value, className = '', highlight = false }: FieldProps) {
  return (
    <div className={`p-1.5 ${className} ${highlight ? 'bg-violet-50' : ''}`}>
      <div className="text-[7px] uppercase text-violet-700 leading-none mb-0.5 font-bold">{label}</div>
      <div className={`font-bold text-[10px] leading-tight break-words ${highlight ? 'text-violet-900' : 'text-black'}`}>
        {value || '-'}
      </div>
    </div>
  );
}

/**
 * DANFSE: Documento Auxiliar da Nota Fiscal de Serviços Eletrônica
 * - Layout vertical A4 (modelo padrão municipal)
 * - Identidade visual violeta/púrpura (cor associada a serviços)
 * - Seções: Prestador, Tomador, Serviço (código, descrição, local, valores)
 * - Destaque para ISS, aliquota, código de serviço
 * - Discriminação do serviço (campo obrigatório)
 * - RPS / Número da NFS-e
 * - Validação municipal com link
 */
export function DanfeNFSe({ doc }: { doc: any }) {
  const municipalCode = doc.municipalCode || '4314902';
  const serviceCode = doc.serviceCode || '1.05';
  const issAliquot = doc.issAliquot || 5;
  const issRetained = doc.issRetained ?? false;
  const rpsNumber = doc.rpsNumber || '-';
  const rpsSeries = doc.rpsSeries || 'NF';
  const verificationCode = doc.verificationCode || 'ABC123XYZ';

  return (
    <div className="p-4 md:p-8 min-h-full flex justify-center print:bg-white print:p-0 bg-violet-100/30">
      <div
        className="bg-white text-black w-full max-w-[780px] min-w-[620px] shadow-2xl border-2 border-violet-700 print:shadow-none print:border-none print:max-w-none print:w-full print:min-w-0"
        style={{ borderRadius: '4px' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-violet-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white text-violet-700 flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-wider leading-none">DANFSE</h1>
              <p className="text-[9px] leading-tight opacity-95 mt-0.5">
                Documento Auxiliar da Nota Fiscal de Serviços Eletrônica
              </p>
            </div>
          </div>
          <div className="text-right text-[9px] space-y-0.5">
            <div>
              <span className="opacity-75">NFS-e Nº:</span>{' '}
              <span className="font-bold text-base">{doc.number || '000.000'}</span>
            </div>
            <div>
              <span className="opacity-75">RPS:</span>{' '}
              <span className="font-bold">{rpsNumber} / Série {rpsSeries}</span>
            </div>
          </div>
        </div>

        {/* Identificação + Datas */}
        <div className="grid grid-cols-4 border-b-2 border-violet-700 text-[9px]">
          <Field label="Data de Emissão" value={formatDate(doc.issueDate)} className="border-r border-violet-200" />
          <Field label="Competência" value={formatDate(doc.issueDate)} className="border-r border-violet-200" />
          <Field label="Cód. Município" value={municipalCode} className="border-r border-violet-200" />
          <Field label="Natureza da Operação" value="Tributação no município" />
        </div>

        {/* PRESTADOR */}
        <div className="border-b border-violet-300">
          <div className="bg-violet-100 px-3 py-1.5 text-[8px] font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Prestador de Serviços
          </div>
          <div className="p-3 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[9px]">
            <div className="col-span-2">
              <div className="text-[7px] uppercase text-violet-700 font-bold">Razão Social</div>
              <div className="font-bold text-sm">{doc.issuerName || 'RAZÃO SOCIAL DO PRESTADOR'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">CNPJ/CPF</div>
              <div className="font-bold font-mono text-[11px]">{doc.issuerDocument || '00.000.000/0001-00'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">Inscrição Municipal</div>
              <div className="font-bold font-mono text-[10px]">{doc.issuerIM || '0000000'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">Endereço</div>
              <div className="font-bold text-[10px]">{doc.issuerAddress || 'Rua / Avenida, nº 0'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">Município / UF</div>
              <div className="font-bold text-[10px]">{doc.issuerCity || 'Cidade'} / {doc.issuerState || 'UF'}</div>
            </div>
          </div>
        </div>

        {/* TOMADOR */}
        <div className="border-b border-violet-300">
          <div className="bg-violet-100 px-3 py-1.5 text-[8px] font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> Tomador de Serviços
          </div>
          <div className="p-3 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[9px]">
            <div className="col-span-2">
              <div className="text-[7px] uppercase text-violet-700 font-bold">Razão Social / Nome</div>
              <div className="font-bold text-sm">{doc.recipientName || 'Consumidor Final'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">CNPJ/CPF</div>
              <div className="font-bold font-mono text-[11px]">{doc.recipientDocument || '000.000.000-00'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">Endereço</div>
              <div className="font-bold text-[10px]">{doc.recipientAddress || 'Não Informado'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">Município / UF</div>
              <div className="font-bold text-[10px]">{doc.recipientCity || 'Cidade'} / {doc.recipientState || 'UF'}</div>
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold">E-mail</div>
              <div className="font-bold text-[10px]">{doc.recipientEmail || 'Não Informado'}</div>
            </div>
          </div>
        </div>

        {/* SERVIÇO PRESTADO */}
        <div className="border-b border-violet-300">
          <div className="bg-violet-100 px-3 py-1.5 text-[8px] font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1">
            <Globe className="w-3 h-3" /> Descrição do Serviço
          </div>
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-[9px]">
              <Field label="Código do Serviço (LC 116)" value={serviceCode} />
              <Field label="Atividade Municipal" value={serviceCode} />
              <Field label="Local da Prestação" value="No Município" />
            </div>
            <div>
              <div className="text-[7px] uppercase text-violet-700 font-bold mb-0.5">Discriminação dos Serviços</div>
              <div
                className="p-2 border border-violet-300 rounded bg-violet-50/30 text-[10px] min-h-[60px] leading-snug"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {doc.serviceDescription || doc.items?.[0]?.description || 'Prestação de serviço conforme contratado. Detalhes da execução descritos em contrato anexo.'}
              </div>
            </div>
          </div>
        </div>

        {/* VALORES + TRIBUTOS */}
        <div className="border-b-2 border-violet-700">
          <div className="bg-violet-100 px-3 py-1.5 text-[8px] font-bold text-violet-800 uppercase tracking-wider flex items-center gap-1">
            <Calculator className="w-3 h-3" /> Valores e Tributos
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-0 text-[9px]">
            <Field label="Valor dos Serviços" value={formatMoney(doc.totalAmount)} highlight />
            <Field label="(-) Descontos" value={formatMoney(doc.discountAmount)} />
            <Field label="(-) Retenções Federais" value={formatMoney(doc.federalRetentions)} />
            <Field label="(=) Valor Líquido" value={formatMoney((doc.totalAmount || 0) - (doc.discountAmount || 0))} highlight />
            <Field label="Base de Cálculo ISS" value={formatMoney(doc.totalAmount)} />
            <Field label="Alíquota ISS" value={`${issAliquot}%`} />
            <Field label="Valor do ISS" value={formatMoney(((doc.totalAmount || 0) * issAliquot) / 100)} highlight />
            <Field label="ISS Retido" value={issRetained ? 'Sim' : 'Não'} />
          </div>
        </div>

        {/* INFORMAÇÕES ADICIONAIS */}
        <div className="p-3 text-[9px] space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-violet-700" />
            <div className="text-[7px] uppercase text-violet-700 font-bold">Código de Verificação de Autenticidade</div>
          </div>
          <div className="font-mono text-[11px] font-bold text-center tracking-widest bg-violet-50 py-1.5 border border-violet-300 rounded">
            {verificationCode}
          </div>
          <div className="text-center text-[7.5px] text-gray-700 italic">
            Consulte a autenticidade no portal da Prefeitura Municipal ou no site
            {' '}
            <span className="text-violet-700 font-bold">www.nfse.gov.br</span>
          </div>

          <div className="border-t border-violet-200 pt-1.5 mt-2 text-[7.5px] text-gray-700 italic space-y-0.5">
            <p>
              <strong className="text-violet-900">Documento emitido por ME/EPP optante pelo Simples Nacional.</strong>
              {' '}Não gera direito a crédito fiscal de IPI. ISS devido conforme legislação municipal vigente.
            </p>
            {doc.additionalInfo && <p className="whitespace-pre-wrap">{doc.additionalInfo}</p>}
            <p className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              Gerado em {formatDate(doc.issueDate)} via NFView
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
