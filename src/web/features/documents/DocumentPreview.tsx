import { useState, useEffect } from 'react';
import { FileText, Download, Copy, Check, Printer, Code2, Table, CreditCard, Receipt, CalendarClock, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { apiFetch } from '../../lib/api';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { DanfeNFCe } from './DanfeNFCe';
import { DanfeDACTE } from './DanfeDACTE';
import { DanfeNFSe } from './DanfeNFSe';
import { 
  getPaymentLabel, 
  formatDate, 
  formatTime, 
  formatMoney, 
  formatModFrete, 
  formatCnpjCpf, 
  formatCep, 
  formatPhone 
} from '../../../core/danfe/helpers';

type PreviewMode = 'visualizar' | 'dados' | 'xml';

interface TabItem {
  id: PreviewMode;
  label: string;
  shortLabel?: string;
  icon: typeof FileText;
}

const TABS: TabItem[] = [
  { id: 'visualizar', label: 'DANFE (PDF)', shortLabel: 'DANFE', icon: FileText },
  { id: 'dados', label: 'Dados da Nota', shortLabel: 'Dados', icon: Table },
  { id: 'xml', label: 'XML Original', shortLabel: 'XML', icon: Code2 },
];

export function DocumentPreview({ 
  docDetails,
  onBackToList
}: { 
  docDetails: any;
  onBackToList?: () => void;
}) {
  const { settings } = useWorkspaceStore();
  const currentTheme = settings.theme || 'dark';

  const [mode, setMode] = useState<PreviewMode>('visualizar');
  const [xml, setXml] = useState<string>('');
  const [loadingXml, setLoadingXml] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    // Default to visualizar (DANFE / PDF) when document changes
    setMode('visualizar');
    setXml('');
  }, [docDetails.id]);

  useEffect(() => {
    if (mode === 'xml' && !xml && !loadingXml) {
      setLoadingXml(true);
      apiFetch(`/api/documents/${docDetails.id}/xml`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((data) => {
          setXml(data);
          setLoadingXml(false);
        })
        .catch((err) => {
          console.warn('[DocumentPreview] Erro ao carregar XML:', err);
          setXml('Não foi possível carregar o arquivo XML deste documento.');
          setLoadingXml(false);
        });
    }
  }, [mode, docDetails.id, xml, loadingXml]);

  const handleCopyXml = () => {
    if (!xml) {
      apiFetch(`/api/documents/${docDetails.id}/xml`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((data) => {
          navigator.clipboard.writeText(data);
          setCopiedXml(true);
          setTimeout(() => setCopiedXml(false), 2000);
        })
        .catch((err) => {
          console.warn('[DocumentPreview] Erro ao copiar XML:', err);
        });
    } else {
      navigator.clipboard.writeText(xml);
      setCopiedXml(true);
      setTimeout(() => setCopiedXml(false), 2000);
    }
  };

  const handleCopyKey = () => {
    if (docDetails.accessKey) {
      navigator.clipboard.writeText(docDetails.accessKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handlePrint = () => {
    setMode('visualizar');
    // Ensure document preview renders cleanly, then trigger print
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleDownloadXml = async () => {
    try {
      const res = await apiFetch(`/api/documents/${docDetails.id}/xml`);
      if (!res.ok) throw new Error('Falha no download');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${docDetails.accessKey || docDetails.number || 'documento'}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.warn('[DocumentPreview] download failed', e);
      // Fallback relativo
      const link = document.createElement('a');
      link.href = `/api/documents/${docDetails.id}/xml`;
      link.download = `${docDetails.accessKey || docDetails.number || 'documento'}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden print:bg-white print:overflow-visible ${
      currentTheme === 'light'
        ? 'bg-[#f8fafc] text-[#0f172a]'
        : 'bg-[#18181b] text-[#fafafa]'
    }`}>
      {/* Action Header */}
      <div className={`min-h-[48px] py-1.5 border-b flex flex-wrap items-center px-3 md:px-4 justify-between shrink-0 print:hidden gap-2 ${
        currentTheme === 'light'
          ? 'bg-white border-[#e2e8f0]'
          : 'bg-[#111114] border-[#27272a]'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile Back Button */}
          {onBackToList && (
            <button
              onClick={onBackToList}
              className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                currentTheme === 'light'
                  ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] border-[#cbd5e1]'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
              title="Voltar à lista de documentos"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Lista</span>
            </button>
          )}

          {/* Mode Switcher with Animated Tab Indicator */}
          <div className={`flex items-center gap-1 p-0.5 rounded-xl border relative ${
            currentTheme === 'light'
              ? 'bg-[#f1f5f9] border-[#e2e8f0]'
              : 'bg-[#09090b] border-[#27272a]'
          }`}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = mode === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 md:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer select-none z-10 ${
                    isActive
                      ? 'text-white'
                      : currentTheme === 'light'
                      ? 'text-[#475569] hover:text-[#0f172a] hover:bg-white/60'
                      : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="previewActiveTabPill"
                      className={`absolute inset-0 rounded-lg shadow-md ${
                        currentTheme === 'light'
                          ? 'bg-blue-600'
                          : 'bg-blue-600 shadow-blue-500/20'
                      }`}
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          {docDetails.accessKey && (
            <button 
              onClick={handleCopyKey}
              title="Copiar chave de acesso de 44 dígitos"
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border rounded-md text-xs transition-all cursor-pointer ${
                currentTheme === 'light'
                  ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                  : 'bg-[#18181b] border-[#27272a] text-[#fafafa] hover:bg-[#27272a]'
              }`}
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedKey ? 'Chave copiada!' : 'Copiar Chave'}</span>
            </button>
          )}

          {mode === 'xml' && (
            <button 
              onClick={handleCopyXml}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border rounded-md text-xs transition-all cursor-pointer ${
                currentTheme === 'light'
                  ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                  : 'bg-[#18181b] border-[#27272a] text-[#fafafa] hover:bg-[#27272a]'
              }`}
            >
              {copiedXml ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedXml ? 'XML copiado!' : 'Copiar XML'}</span>
            </button>
          )}

          <button 
            onClick={handleDownloadXml}
            className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 border rounded-md text-xs transition-all cursor-pointer ${
              currentTheme === 'light'
                ? 'bg-white hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'
            }`}
            title="Baixar arquivo XML"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Baixar XML</span>
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium rounded-md text-xs shadow-md transition-all cursor-pointer"
            title="Imprimir ou Salvar em PDF (A4)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Content Area with Fluid Transition */}
      <div className="flex-1 overflow-y-auto relative print:overflow-visible">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full h-full min-h-full"
          >
            {mode === 'visualizar' && <DanfeView doc={docDetails} theme={currentTheme} />}
            {mode === 'dados' && <DadosView doc={docDetails} theme={currentTheme} />}
            {mode === 'xml' && (
              <div className="absolute inset-0 p-4">
                {loadingXml ? (
                  <div className="flex items-center justify-center h-full text-[#a1a1aa] text-sm">
                    Carregando código XML...
                  </div>
                ) : (
                  <div className={`h-full rounded-xl border overflow-hidden ${
                    currentTheme === 'light' ? 'bg-[#1e1e1e] border-[#cbd5e1]' : 'bg-[#1e1e1e] border-[#27272a]'
                  }`}>
                    <SyntaxHighlighter 
                      language="xml" 
                      style={vscDarkPlus} 
                      customStyle={{ margin: 0, height: '100%', background: 'transparent', fontSize: '12px', padding: '16px' }}
                    >
                      {xml}
                    </SyntaxHighlighter>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DadosView({ doc, theme }: { doc: any; theme: string }) {
  const isLight = theme === 'light';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Tipo de Documento</div>
          <div className="text-sm font-bold text-blue-400">{doc.type || 'NF-e'}</div>
        </div>
        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Número / Série</div>
          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Nº {doc.number || 'S/N'} • Série {doc.series || '0'}</div>
        </div>
        <div className={`p-3.5 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Data de Emissão</div>
          <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
        <div className={`p-3.5 rounded-xl border ${
          isLight
            ? 'bg-green-50 border-green-200'
            : 'border-green-500/30 bg-green-500/5'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${isLight ? 'text-green-700' : 'text-emerald-300'}`}>Valor Total da Nota</div>
          <div className={`text-base font-black ${isLight ? 'text-green-700' : 'text-emerald-300'}`}>
            {doc.totalAmount ? `R$ ${doc.totalAmount.toFixed(2)}` : 'R$ 0,00'}
          </div>
        </div>
      </div>

      {/* Access Key */}
      {doc.accessKey && (
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Chave de Acesso (44 dígitos)</div>
          <div className={`font-mono text-xs font-semibold break-all ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
            {doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey}
          </div>
        </div>
      )}

      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Emitente</div>
          <div className={`text-sm font-bold mb-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{doc.issuerName || 'Não Informado'}</div>
          <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>CNPJ/CPF: <span className={`font-mono font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{doc.issuerDocument || 'Não Informado'}</span></div>
        </div>
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#09090b] border-[#27272a]'
        }`}>
          <div className={`text-[10px] uppercase font-bold mb-2 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Destinatário / Remetente</div>
          <div className={`text-sm font-bold mb-1 ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{doc.recipientName || 'Não Informado / Consumidor Final'}</div>
          <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>CNPJ/CPF: <span className={`font-mono font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{doc.recipientDocument || 'Não Informado'}</span></div>
        </div>
      </div>

      {/* Fatura / Duplicatas & Cobrança Section */}
      {doc.billing && (doc.billing.invoice || (doc.billing.duplicates && doc.billing.duplicates.length > 0) || (doc.billing.payments && doc.billing.payments.length > 0)) && (
        <div className={`rounded-xl overflow-hidden border ${
          isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
        }`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}>
            <div className="flex items-center gap-2">
              <Receipt className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Fatura / Duplicatas & Cobrança
              </span>
            </div>
            {doc.billing.duplicates && doc.billing.duplicates.length > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {doc.billing.duplicates.length} {doc.billing.duplicates.length === 1 ? 'parcela' : 'parcelas'}
              </span>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Invoice Summary */}
            {doc.billing.invoice && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}>
                  <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Nº da Fatura</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{doc.billing.invoice.number || doc.number || '-'}</div>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}>
                  <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Valor Original</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                    R$ {doc.billing.invoice.originalAmount?.toFixed(2) || '0,00'}
                  </div>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
                }`}>
                  <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Desconto</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                    R$ {doc.billing.invoice.discountAmount?.toFixed(2) || '0,00'}
                  </div>
                </div>
                <div className={`p-2.5 rounded-lg border ${
                  isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>Valor Líquido</div>
                  <div className={`text-xs font-bold ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                    R$ {doc.billing.invoice.netAmount?.toFixed(2) || doc.billing.invoice.originalAmount?.toFixed(2) || '0,00'}
                  </div>
                </div>
              </div>
            )}

            {/* Duplicates / Installments Grid */}
            {doc.billing.duplicates && doc.billing.duplicates.length > 0 && (
              <div>
                <div className={`text-[11px] font-bold uppercase mb-2 flex items-center gap-1.5 ${
                  isLight ? 'text-[#334155]' : 'text-slate-300'
                }`}>
                  <CalendarClock className="w-3.5 h-3.5" />
                  Duplicatas / Parcelas
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {doc.billing.duplicates.map((dup: any, idx: number) => {
                    const numFormatted = String(dup.number).padStart(3, '0');
                    const dateFormatted = dup.dueDate ? (
                      dup.dueDate.includes('-') 
                        ? dup.dueDate.split('T')[0].split('-').reverse().join('/') 
                        : dup.dueDate
                    ) : '-';

                    return (
                      <div key={idx} className={`p-3 rounded-lg border transition-all ${
                        isLight 
                          ? 'bg-[#f8fafc] border-[#e2e8f0] hover:border-blue-300 shadow-xs' 
                          : 'bg-[#141417] border-[#27272a] hover:border-blue-500/50'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            Duplicata #{numFormatted}
                          </span>
                          <span className={`text-[10px] font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                            {idx + 1} de {doc.billing.duplicates.length}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Vencimento:</span>
                            <span className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{dateFormatted}</span>
                          </div>
                          <div className={`flex justify-between items-center pt-1.5 border-t ${
                            isLight ? 'border-gray-200' : 'border-zinc-800'
                          }`}>
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
              <div className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
                isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
              }`}>
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
                    R$ {doc.billing.payments.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Impostos e Tributos */}
      {(doc.totals?.taxes || (doc.taxes && doc.taxes.length > 0)) && (
        <div className={`rounded-xl overflow-hidden border ${
          isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
        }`}>
          <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}>
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
            <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>ICMS</div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0)).toFixed(2)}
              </div>
              {(doc.totals?.icmsBase ?? doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base) ? (
                <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                  Base: R$ {(doc.totals?.icmsBase ?? doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base).toFixed(2)}
                </div>
              ) : null}
            </div>

            {/* ICMS ST */}
            {(doc.totals?.taxes?.icmsSt || doc.totals?.icmsStBase || doc.taxes?.some((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>ICMS ST</div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.icmsSt ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0)).toFixed(2)}
                </div>
                {doc.totals?.icmsStBase ? (
                  <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                    Base: R$ {doc.totals.icmsStBase.toFixed(2)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* IPI */}
            <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>IPI</div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.ipi ?? (doc.taxes?.find((t: any) => t.taxType === 'IPI')?.amount || 0)).toFixed(2)}
              </div>
            </div>

            {/* PIS */}
            <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>PIS</div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount || 0)).toFixed(2)}
              </div>
            </div>

            {/* COFINS */}
            <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
              <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>COFINS</div>
              <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                R$ {(doc.totals?.taxes?.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount || 0)).toFixed(2)}
              </div>
            </div>

            {/* ISS (se houver) */}
            {(doc.totals?.taxes?.iss || doc.taxes?.some((t: any) => t.taxType === 'ISS')) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>ISS</div>
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
            {(doc.totals?.taxes?.inss || doc.taxes?.some((t: any) => t.taxType === 'INSS')) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>INSS</div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.inss ?? (doc.taxes?.find((t: any) => t.taxType === 'INSS')?.amount || 0)).toFixed(2)}
                </div>
              </div>
            ) : null}

            {/* IR / IRRF (se houver) */}
            {(doc.totals?.taxes?.ir || doc.taxes?.some((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>IRRF</div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.ir ?? (doc.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount || 0)).toFixed(2)}
                </div>
              </div>
            ) : null}

            {/* CSLL (se houver) */}
            {(doc.totals?.taxes?.csll || doc.taxes?.some((t: any) => t.taxType === 'CSLL')) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>CSLL</div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  R$ {(doc.totals?.taxes?.csll ?? (doc.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount || 0)).toFixed(2)}
                </div>
              </div>
            ) : null}

            {/* ISS Retido (se houver) */}
            {(doc.totals?.taxes?.issRetained || doc.issRetained) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>ISS Retido</div>
                <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  {typeof doc.totals?.taxes?.issRetained === 'number' && doc.totals.taxes.issRetained > 0
                    ? `R$ ${doc.totals.taxes.issRetained.toFixed(2)}`
                    : 'Sim'}
                </div>
              </div>
            ) : null}

            {/* Outras Retenções (se houver) */}
            {(doc.totals?.taxes?.outrasRetencoes && doc.totals.taxes.outrasRetencoes > 0) ? (
              <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'}`}>
                <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Outras Retenções</div>
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
        <div className={`rounded-xl overflow-hidden border ${
          isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
        }`}>
          <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}>
            <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Itens da Nota ({doc.items.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[650px]">
              <thead className={`border-b ${
                isLight
                  ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]'
                  : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]'
              }`}>
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
              <tbody className={`divide-y ${
                isLight ? 'divide-[#e2e8f0] text-[#0f172a]' : 'divide-[#18181b] text-[#fafafa]'
              }`}>
                {doc.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className={isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/5'}>
                    <td className={`px-3 py-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>{item.code || '-'}</td>
                    <td className="px-3 py-2 font-medium">{item.description}</td>
                    <td className={`px-3 py-2 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>{item.ncm || '-'}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-500">{item.cfop || '-'}</td>
                    <td className="px-3 py-2 text-center uppercase font-mono text-[11px]">{item.unit || 'UN'}</td>
                    <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                    <td className={`px-3 py-2 text-right ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>R$ {item.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${isLight ? 'text-[#0f172a]' : 'text-emerald-400'}`}>R$ {item.totalPrice?.toFixed(2) || '0.00'}</td>
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

// Routes to the appropriate DANFE/DACTE/DANFSE layout based on the document type.
function DanfeView({ doc, theme }: { doc: any; theme: string }) {
  const docType = String(doc.type || 'NFE').toUpperCase();

  if (docType === 'NFCE') {
    return <DanfeNFCe doc={doc} />;
  }
  if (docType === 'CTE') {
    return <DanfeDACTE doc={doc} />;
  }
  if (docType === 'NFSE' || docType === 'NFS-E' || docType === 'NFS-E' || docType === 'NFS_E') {
    return <DanfeNFSe doc={doc} />;
  }

  // NF-e → Padrão SEFAZ DANFE Oficial
  const isLight = theme === 'light';

  const baseIcms = doc.totals?.icmsBase ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base || 0);
  const valorIcms = doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0);
  const baseIcmsSt = doc.totals?.icmsStBase ?? 0;
  const valorIcmsSt = doc.totals?.taxes?.icmsSt ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0);
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
  const recipientStreet = doc.recipient?.address?.street ? `${doc.recipient.address.street}, ${doc.recipient.address.number || 'S/N'}${doc.recipient.address.complement ? ' - ' + doc.recipient.address.complement : ''}` : '-';
  const recipientBairro = doc.recipient?.address?.neighborhood || '-';
  const recipientCep = formatCep(doc.recipient?.address?.zipCode);
  const recipientCity = doc.recipient?.address?.city || '-';
  const recipientState = doc.recipient?.address?.state || '-';
  const recipientPhone = formatPhone(doc.recipient?.phone);

  const issueDateStr = formatDate(doc.issueDate);
  const exitDateStr = formatDate(doc.exitDate || doc.issueDate);
  const exitTimeStr = doc.exitTime || formatTime(doc.issueDate);

  const formattedKey = doc.accessKey ? (doc.accessKey.match(/.{1,4}/g)?.join(' ') || doc.accessKey) : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000';

  const transport = doc.transport || {};
  const transpMod = formatModFrete(transport.modFrete);

  return (
    <div className={`p-2 sm:p-4 md:p-8 min-h-full flex justify-center overflow-x-auto print:bg-white print:p-0 ${
      isLight ? 'bg-[#e2e8f0]' : 'bg-[#27272a]'
    }`}>
      <div className="bg-white text-black w-full max-w-[850px] min-w-[700px] shadow-2xl p-4 sm:p-6 font-sans text-[9px] border border-black print:shadow-none print:border-none print:max-w-none print:w-full print:min-w-0 print:p-0">

        {/* Canhoto de Recebimento */}
        <div className="border border-black mb-1.5">
          <div className="flex border-b border-black text-[8px]">
            <div className="flex-1 p-1 border-r border-black uppercase leading-tight">
              RECEBEMOS DE <span className="font-bold">{issuerName}</span> OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: <span className="font-bold">{issueDateStr}</span> VALOR TOTAL: <span className="font-bold">{formatMoney(valorTotalNota)}</span> DESTINATÁRIO: <span className="font-bold">{recipientName}</span> - {recipientStreet} {recipientBairro} {recipientCity}-{recipientState}
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
                <div className="text-[7px] text-gray-600 font-bold uppercase text-center mb-1">IDENTIFICAÇÃO DO EMITENTE</div>
                <h1 className="font-black text-xs sm:text-sm leading-tight uppercase text-center">{issuerName}</h1>
                <div className="text-[8px] text-center mt-1 text-gray-800 leading-tight">
                  {issuerStreet ? `${issuerStreet}, ${issuerNumber}${issuerComp}` : ''}
                  {issuerBairro ? <><br />{issuerBairro} - {issuerCep}</> : ''}
                  {issuerCity ? <><br />{issuerCity} - {issuerState} {issuerPhone ? `Fone/Fax: ${issuerPhone}` : ''}</> : ''}
                </div>
              </div>
            </div>

            {/* DANFE center box */}
            <div className="w-[20%] p-1.5 border-r border-black flex flex-col justify-between items-center text-center">
              <div>
                <h2 className="font-black text-base tracking-wider leading-none">DANFE</h2>
                <p className="text-[7px] text-gray-700 font-semibold mt-0.5 leading-tight">Documento Auxiliar da Nota Fiscal Eletrônica</p>
              </div>
              <div className="my-1 border border-black px-1.5 py-0.5 text-[8px] font-bold">
                0 - ENTRADA<br/>1 - SAÍDA <span className="font-black text-[10px] ml-1">[ 1 ]</span>
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
                <div className="h-9 w-full flex items-center justify-between px-1 bg-white mb-1 overflow-hidden">
                  {Array.from({ length: 55 }).map((_, i) => (
                    <div key={i} className={`h-full bg-black ${i % 4 === 0 ? 'w-1' : i % 7 === 0 ? 'w-1.5' : 'w-0.5'}`} />
                  ))}
                </div>
                <div className="text-[7px] text-gray-600 font-bold uppercase">CHAVE DE ACESSO</div>
                <div className="font-mono text-[9px] font-black tracking-wide text-center">
                  {formattedKey}
                </div>
              </div>
              <div className="text-center text-[7px] text-gray-600 leading-tight mt-1 pt-1 border-t border-gray-300">
                Consulta de autenticidade no portal nacional da NF-e<br/>
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
                  <div><span className="font-bold text-gray-600">Nº FATURA:</span> <span className="font-black">{doc.billing.invoice.number || doc.number || '-'}</span></div>
                  <div><span className="font-bold text-gray-600">VALOR ORIG.:</span> <span className="font-black">{formatMoney(doc.billing.invoice.originalAmount)}</span></div>
                  <div><span className="font-bold text-gray-600">DESC.:</span> <span className="font-black">{formatMoney(doc.billing.invoice.discountAmount)}</span></div>
                  <div><span className="font-bold text-gray-600">VALOR LÍQ.:</span> <span className="font-black">{formatMoney(doc.billing.invoice.netAmount || doc.billing.invoice.originalAmount)}</span></div>
                </div>
              )}
              {doc.billing?.duplicates && doc.billing.duplicates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {doc.billing.duplicates.map((dup: any, idx: number) => (
                    <div key={idx} className="border border-black p-1 min-w-[120px] flex-1 max-w-[170px] text-[8px] bg-white">
                      <div className="flex justify-between"><span className="text-[7px] text-gray-600 font-bold">Num.</span> <span className="font-bold font-mono">{String(dup.number).padStart(3, '0')}</span></div>
                      <div className="flex justify-between"><span className="text-[7px] text-gray-600 font-bold">Venc.</span> <span className="font-bold">{dup.dueDate ? formatDate(dup.dueDate) : '-'}</span></div>
                      <div className="flex justify-between"><span className="text-[7px] text-gray-600 font-bold">Valor</span> <span className="font-black">{formatMoney(dup.amount)}</span></div>
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
            <div className="w-[12%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">BASE DE CÁLC. DO ICMS</div><div className="font-bold text-right">{baseIcms.toFixed(2)}</div></div>
            <div className="w-[10%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO ICMS</div><div className="font-bold text-right">{valorIcms.toFixed(2)}</div></div>
            <div className="w-[13%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">BASE DE CÁLC. ICMS S.T.</div><div className="font-bold text-right">{baseIcmsSt.toFixed(2)}</div></div>
            <div className="w-[12%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO ICMS SUBST.</div><div className="font-bold text-right">{valorIcmsSt.toFixed(2)}</div></div>
            <div className="w-[11%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">V. IMP. IMPORTAÇÃO</div><div className="font-bold text-right">{impImportacao.toFixed(2)}</div></div>
            <div className="w-[11%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">V. ICMS UF REMET.</div><div className="font-bold text-right">{icmsUfRemet.toFixed(2)}</div></div>
            <div className="w-[10%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">V. FCP UF DEST.</div><div className="font-bold text-right">{fcpUfDest.toFixed(2)}</div></div>
            <div className="w-[9%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO PIS</div><div className="font-bold text-right">{pis.toFixed(2)}</div></div>
            <div className="w-[12%] p-0.5 bg-gray-50"><div className="text-[6.5px] text-gray-600 font-bold uppercase">V. TOTAL PRODUTOS</div><div className="font-black text-right">{valorProdutos.toFixed(2)}</div></div>
          </div>
          <div className="flex">
            <div className="w-[12%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO FRETE</div><div className="font-bold text-right">{valorFrete.toFixed(2)}</div></div>
            <div className="w-[10%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DO SEGURO</div><div className="font-bold text-right">{valorSeguro.toFixed(2)}</div></div>
            <div className="w-[13%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">DESCONTO</div><div className="font-bold text-right">{valorDesconto.toFixed(2)}</div></div>
            <div className="w-[12%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">OUTRAS DESPESAS</div><div className="font-bold text-right">{outrasDespesas.toFixed(2)}</div></div>
            <div className="w-[11%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR TOTAL IPI</div><div className="font-bold text-right">{valorIpi.toFixed(2)}</div></div>
            <div className="w-[11%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">V. ICMS UF DEST.</div><div className="font-bold text-right">{icmsUfDest.toFixed(2)}</div></div>
            <div className="w-[10%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">V. TOT. TRIB.</div><div className="font-bold text-right">{totalTrib.toFixed(2)}</div></div>
            <div className="w-[9%] p-0.5 border-r border-black"><div className="text-[6.5px] text-gray-600 font-bold uppercase">VALOR DA COFINS</div><div className="font-bold text-right">{cofins.toFixed(2)}</div></div>
            <div className="w-[12%] p-0.5 bg-gray-100"><div className="text-[6.5px] text-black font-black uppercase">V. TOTAL DA NOTA</div><div className="font-black text-right text-[10px]">{valorTotalNota.toFixed(2)}</div></div>
          </div>
        </div>

        {/* Transportador / Volumes Transportados */}
        <div className="text-[8px] font-black uppercase text-black mb-0.5">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
        <div className="border border-black mb-1.5 text-[8px]">
          <div className="flex border-b border-black">
            <div className="w-[40%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">NOME / RAZÃO SOCIAL</div><div className="font-bold uppercase">{transport.name || '-'}</div></div>
            <div className="w-[18%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">FRETE</div><div className="font-bold">{transpMod}</div></div>
            <div className="w-[10%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">CÓDIGO ANTT</div><div className="font-bold font-mono">{transport.anttCode || '-'}</div></div>
            <div className="w-[10%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">PLACA DO VEÍCULO</div><div className="font-bold font-mono">{transport.vehiclePlate || '-'}</div></div>
            <div className="w-[4%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">UF</div><div className="font-bold uppercase">{transport.vehicleUf || '-'}</div></div>
            <div className="w-[18%] p-1"><div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div><div className="font-bold font-mono">{formatCnpjCpf(transport.document)}</div></div>
          </div>
          <div className="flex border-b border-black">
            <div className="w-[45%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">ENDEREÇO</div><div className="font-bold uppercase">{transport.address || '-'}</div></div>
            <div className="w-[30%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">MUNICÍPIO</div><div className="font-bold uppercase">{transport.city || '-'}</div></div>
            <div className="w-[5%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">UF</div><div className="font-bold uppercase">{transport.state || '-'}</div></div>
            <div className="w-[20%] p-1"><div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div><div className="font-bold font-mono">{transport.ie || '-'}</div></div>
          </div>
          <div className="flex">
            <div className="w-[12%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">QUANTIDADE</div><div className="font-bold text-center">{transport.volumeQuantity ?? '-'}</div></div>
            <div className="w-[15%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">ESPÉCIE</div><div className="font-bold uppercase">{transport.volumeSpecies || '-'}</div></div>
            <div className="w-[15%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">MARCA</div><div className="font-bold uppercase">{transport.volumeBrand || '-'}</div></div>
            <div className="w-[18%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">NUMERAÇÃO</div><div className="font-bold">{transport.volumeNumber || '-'}</div></div>
            <div className="w-[20%] p-1 border-r border-black"><div className="text-[7px] text-gray-600 font-bold uppercase">PESO BRUTO</div><div className="font-bold text-right">{transport.grossWeight !== undefined ? transport.grossWeight.toFixed(3) : '-'}</div></div>
            <div className="w-[20%] p-1"><div className="text-[7px] text-gray-600 font-bold uppercase">PESO LÍQUIDO</div><div className="font-bold text-right">{transport.netWeight !== undefined ? transport.netWeight.toFixed(3) : '-'}</div></div>
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
                    <td className="p-0.5 border-r border-black text-right font-bold">{(item.totalPrice || 0).toFixed(2)}</td>
                    <td className="p-0.5 border-r border-black text-right">{item.discount ? item.discount.toFixed(2) : '0,00'}</td>
                    <td className="p-0.5 border-r border-black text-right">{item.icmsBase ? item.icmsBase.toFixed(2) : '0,00'}</td>
                    <td className="p-0.5 border-r border-black text-right">{item.icmsValue ? item.icmsValue.toFixed(2) : '0,00'}</td>
                    <td className="p-0.5 border-r border-black text-right">{item.ipiValue ? item.ipiValue.toFixed(2) : '-'}</td>
                    <td className="p-0.5 border-r border-black text-right">{item.icmsAliq ? item.icmsAliq.toFixed(2) : '-'}</td>
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
            <div className="whitespace-pre-line text-gray-800 leading-tight">
              {doc.fiscoInfo || ''}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
