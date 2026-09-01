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
import { EventTimeline } from './EventTimeline';
import { getPaymentLabel } from '../../../core/danfe/helpers';

type PreviewMode = 'visualizar' | 'dados' | 'xml' | 'eventos';

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
  { id: 'eventos', label: 'Eventos (CC-e)', shortLabel: 'Eventos', icon: CalendarClock },
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
            {mode === 'eventos' && <EventTimeline documentId={docDetails.id} />}
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


      {/* Items Table */}
      {doc.items && doc.items.length > 0 && (
        <div className={`rounded-xl overflow-hidden border ${
          isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
        }`}>
          <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}>
            <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Itens da Nota ({doc.items.length})</span>
          </div>
          <table className="w-full text-xs text-left border-collapse">
            <thead className={`border-b ${
              isLight
                ? 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]'
                : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a]'
            }`}>
              <tr>
                <th className="px-4 py-2.5 font-semibold">Cód.</th>
                <th className="px-4 py-2.5 font-semibold">Descrição do Produto / Serviço</th>
                <th className="px-4 py-2.5 font-semibold text-right">Qtd</th>
                <th className="px-4 py-2.5 font-semibold text-right">V. Unitário</th>
                <th className="px-4 py-2.5 font-semibold text-right">V. Total</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isLight ? 'divide-[#e2e8f0] text-[#0f172a]' : 'divide-[#18181b] text-[#fafafa]'
            }`}>
              {doc.items.map((item: any, idx: number) => (
                <tr key={item.id || idx} className={isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-white/5'}>
                  <td className={`px-4 py-2.5 font-mono ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>{item.code || '-'}</td>
                  <td className="px-4 py-2.5 font-medium">{item.description}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{item.quantity}</td>
                  <td className={`px-4 py-2.5 text-right ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>R$ {item.unitPrice?.toFixed(2) || '0.00'}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${isLight ? 'text-[#0f172a]' : 'text-emerald-400'}`}>R$ {item.totalPrice?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Routes to the appropriate DANFE/DACTE/DANFSE layout based on the document type.
// NF-e keeps the standard SEFAZ layout; NFC-e, CT-e and NFS-e use their own visual templates.
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

  // NF-e (and others) → keep the original SEFAZ-style DANFE
  const isLight = theme === 'light';

  const docTitle = 'DANFE';
  const docSubtitle = 'Documento Auxiliar da Nota Fiscal Eletrônica';

  return (
    <div className={`p-4 md:p-8 min-h-full flex justify-center overflow-x-auto print:bg-white print:p-0 ${
      isLight
        ? 'bg-[#e2e8f0]'
        : 'bg-[#27272a]'
    }`}>
      <div className="bg-white text-black w-full max-w-[820px] min-w-[580px] sm:min-w-[620px] shadow-2xl p-4 sm:p-5 md:p-7 font-sans text-xs border border-gray-400 print:shadow-none print:border-none print:max-w-none print:w-full print:min-w-0 print:p-0 rounded-xs">

        {/* Canhoto de Recebimento */}
        <div className="border border-black mb-3">
          <div className="flex border-b border-black text-[9px]">
            <div className="flex-1 p-1 border-r border-black">
              RECEBEMOS DE <span className="font-bold">{doc.issuerName || 'EMITENTE'}</span> OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO
            </div>
            <div className="w-36 p-1 text-center font-bold">
              <div>{docType === 'NFSE' ? 'NFS-e' : 'NF-e'}</div>
              <div>Nº {doc.number || '000.000'}</div>
              <div>SÉRIE {doc.series || '1'}</div>
            </div>
          </div>
          <div className="flex text-[9px]">
            <div className="w-40 p-1 border-r border-black">
              <div className="text-[8px] text-gray-600">DATA DE RECEBIMENTO</div>
            </div>
            <div className="flex-1 p-1">
              <div className="text-[8px] text-gray-600">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
            </div>
          </div>
        </div>

        {/* Header: Emitente + DANFE info + Chave */}
        <div className="border border-black flex flex-wrap mb-2">
          {/* Emitente */}
          <div className="w-1/2 p-2 border-r border-black flex flex-col justify-center">
            <h1 className="font-bold text-sm leading-tight mb-1">{doc.issuerName || 'NOME / RAZÃO SOCIAL'}</h1>
            <p className="text-[10px] text-gray-700 font-mono">CNPJ/CPF: {doc.issuerDocument || 'NÃO INFORMADO'}</p>
            <p className="text-[9px] text-gray-600 mt-1">DOCUMENTO FISCAL ELETRÔNICO (NF-e)</p>
          </div>

          {/* DANFE center box */}
          <div className="w-1/2 p-2 flex flex-col justify-between items-center text-center">
            <div>
              <h2 className="font-black text-lg tracking-wider">{docTitle}</h2>
              <p className="text-[9px] font-medium text-gray-700">{docSubtitle}</p>
            </div>
            <div className="flex gap-4 text-[10px] my-1 font-semibold">
              <div className="border border-black px-2 py-0.5">0 - ENTRADA<br/>1 - SAÍDA <span className="font-bold text-xs">[ 1 ]</span></div>
              <div className="text-left">
                <div><span className="font-bold">Nº</span> {doc.number || '000.000'}</div>
                <div><span className="font-bold">SÉRIE</span> {doc.series || '1'}</div>
                <div><span className="font-bold">FOLHA</span> 1/1</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chave de Acesso + Código de Barras */}
        <div className="border border-black mb-2 p-2">
          <div className="flex items-center justify-between text-[8px] font-bold uppercase text-gray-700 mb-1">
            <span>CHAVE DE ACESSO / IDENTIFICADOR</span>
            <span>Consulta de autenticidade no portal Nacional da NF-e</span>
          </div>
          {/* Simulated Barcode Visual */}
          <div className="h-9 w-full bg-gradient-to-r from-black via-black to-black flex items-center justify-center mb-1 overflow-hidden opacity-90">
            <div className="w-full h-full flex justify-between px-2 bg-white/10">
              {Array.from({ length: 75 }).map((_, i) => (
                <div key={i} className={`h-full bg-black ${i % 3 === 0 ? 'w-1' : i % 5 === 0 ? 'w-1.5' : 'w-0.5'}`} />
              ))}
            </div>
          </div>
          <div className="font-mono text-xs font-bold text-center tracking-widest bg-gray-50 py-1 border border-gray-300">
            {doc.accessKey ? doc.accessKey.match(/.{1,4}/g)?.join(' ') : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000'}
          </div>
        </div>

        {/* Destinatário / Remetente */}
        <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-800 mt-2">
          DESTINATÁRIO / REMETENTE
        </div>
        <div className="border border-black mb-2 text-[9px]">
          <div className="flex border-b border-black">
            <div className="w-3/5 p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">NOME / RAZÃO SOCIAL</div>
              <div className="font-bold text-[10px]">{doc.recipientName || 'CONSUMIDOR FINAL / NÃO INFORMADO'}</div>
            </div>
            <div className="w-2/5 p-1">
              <div className="text-[7px] uppercase text-gray-600">CNPJ / CPF</div>
              <div className="font-bold font-mono text-[10px]">{doc.recipientDocument || 'NÃO INFORMADO'}</div>
            </div>
          </div>
          <div className="flex">
            <div className="w-1/2 p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">DATA DE EMISSÃO</div>
              <div className="font-bold">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}</div>
            </div>
            <div className="w-1/2 p-1">
              <div className="text-[7px] uppercase text-gray-600">DATA DE SAÍDA / ENTRADA</div>
              <div className="font-bold">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}</div>
            </div>
          </div>
        </div>

        {/* Fatura / Duplicata (DANFE SEFAZ format) */}
        {((doc.billing?.duplicates && doc.billing.duplicates.length > 0) || doc.billing?.invoice || (doc.billing?.payments && doc.billing.payments.length > 0)) && (
          <>
            <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-800 mt-2">
              FATURA / DUPLICATA
            </div>
            <div className="border border-black mb-2 p-1 text-[9px] bg-white">
              {/* If invoice details exist */}
              {doc.billing?.invoice && (doc.billing.invoice.number || doc.billing.invoice.originalAmount) && (
                <div className="flex items-center justify-between border-b border-dashed border-gray-400 pb-1 mb-1 text-[8px]">
                  <div><span className="font-semibold text-gray-600">Nº FATURA:</span> <span className="font-bold">{doc.billing.invoice.number || doc.number || '-'}</span></div>
                  <div><span className="font-semibold text-gray-600">VALOR ORIG.:</span> <span className="font-bold">R$ {doc.billing.invoice.originalAmount?.toFixed(2) || '0,00'}</span></div>
                  <div><span className="font-semibold text-gray-600">DESC.:</span> <span className="font-bold">R$ {doc.billing.invoice.discountAmount?.toFixed(2) || '0,00'}</span></div>
                  <div><span className="font-semibold text-gray-600">VALOR LÍQ.:</span> <span className="font-bold text-black">R$ {doc.billing.invoice.netAmount?.toFixed(2) || doc.billing.invoice.originalAmount?.toFixed(2) || '0,00'}</span></div>
                </div>
              )}

              {/* Duplicates grid */}
              {doc.billing?.duplicates && doc.billing.duplicates.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {doc.billing.duplicates.map((dup: any, idx: number) => {
                    const numFormatted = String(dup.number).padStart(3, '0');
                    const dateFormatted = dup.dueDate ? (
                      dup.dueDate.includes('-') 
                        ? dup.dueDate.split('T')[0].split('-').reverse().join('/') 
                        : dup.dueDate
                    ) : '-';
                    return (
                      <div key={idx} className="border border-black p-1 min-w-[125px] flex-1 max-w-[190px] text-[8.5px] bg-white">
                        <div className="flex justify-between">
                          <span className="text-[7.5px] text-gray-600 font-semibold">Num.</span>
                          <span className="font-bold font-mono">{numFormatted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[7.5px] text-gray-600 font-semibold">Venc.</span>
                          <span className="font-bold">{dateFormatted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[7.5px] text-gray-600 font-semibold">Valor</span>
                          <span className="font-bold">R$ {dup.amount?.toFixed(2) || '0,00'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : doc.billing?.payments && doc.billing.payments.length > 0 ? (
                <div className="flex flex-wrap gap-3 text-[8.5px]">
                  {doc.billing.payments.map((pag: any, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <span className="font-semibold text-gray-600">Forma de Pagamento:</span>
                      <span className="font-bold">{getPaymentLabel(pag.paymentType)}</span>
                      <span className="font-semibold text-gray-600">Valor:</span>
                      <span className="font-bold">R$ {pag.amount?.toFixed(2) || '0,00'}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Cálculo do Imposto */}
        <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-800 mt-2">
          CÁLCULO DO IMPOSTO
        </div>
        <div className="border border-black mb-2 text-[9px]">
          <div className="grid grid-cols-5 border-b border-black">
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">BASE DE CÁLC. DO ICMS</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">VALOR DO ICMS</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">BASE CÁLC. ICMS ST</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">VALOR DO ICMS ST</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 bg-gray-50">
              <div className="text-[7px] uppercase text-gray-600 font-bold">V. TOTAL PRODUTOS</div>
              <div className="font-bold text-right">R$ {doc.totalAmount?.toFixed(2) || '0,00'}</div>
            </div>
          </div>
          <div className="grid grid-cols-5">
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">VALOR DO FRETE</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">VALOR DO SEGURO</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">DESCONTO</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 border-r border-black">
              <div className="text-[7px] uppercase text-gray-600">OUTRAS DESP.</div>
              <div className="font-bold text-right">R$ 0,00</div>
            </div>
            <div className="p-1 bg-blue-50">
              <div className="text-[7px] uppercase text-blue-900 font-black">VALOR TOTAL NOTA</div>
              <div className="font-black text-right text-[11px] text-blue-950">R$ {doc.totalAmount?.toFixed(2) || '0,00'}</div>
            </div>
          </div>
        </div>

        {/* Dados dos Produtos / Serviços */}
        <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-800 mt-2">
          DADOS DOS PRODUTOS / SERVIÇOS
        </div>
        <div className="border border-black mb-3">
          <table className="w-full text-[8.5px] text-left border-collapse">
            <thead className="bg-gray-100 border-b border-black font-bold">
              <tr>
                <th className="p-1 border-r border-black w-14">CÓDIGO</th>
                <th className="p-1 border-r border-black">DESCRIÇÃO DOS PRODUTOS / SERVIÇOS</th>
                <th className="p-1 border-r border-black w-10 text-right">QTD</th>
                <th className="p-1 border-r border-black w-16 text-right">V. UNIT</th>
                <th className="p-1 w-16 text-right">V. TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {doc.items && doc.items.length > 0 ? (
                doc.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="p-1 border-r border-black font-mono">{item.code || '-'}</td>
                    <td className="p-1 border-r border-black font-medium">{item.description}</td>
                    <td className="p-1 border-r border-black text-right">{item.quantity}</td>
                    <td className="p-1 border-r border-black text-right">R$ {item.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td className="p-1 text-right font-semibold">R$ {item.totalPrice?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-gray-500 italic">
                    Nenhum item detalhado encontrado no XML.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dados Adicionais */}
        <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-800 mt-2">
          DADOS ADICIONAIS
        </div>
        <div className="border border-black p-2 min-h-[60px] text-[8.5px] text-gray-800">
          <div className="font-bold text-[7.5px] text-gray-600 uppercase mb-1">INFORMAÇÕES COMPLEMENTARES</div>
          <p>Documento emitido por ME ou EPP optante pelo Simples Nacional ou Regime Normal. Conversão direta de XML para DANFE PDF via NF View.</p>
        </div>

      </div>
    </div>
  );
}
