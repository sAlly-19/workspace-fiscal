import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Building2,
  Package,
  Layers,
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { toast } from '../../../components/Toast';
import {
  matchCompanyByPriority,
  getSuggestedPlaque,
  formatBrlValue,
  parseBrlInputToCents,
  extractItemPreFill,
  ExtractedItem,
  CompanyParticipant,
} from './depreciate-modal.utils';

export interface DepreciateDocumentModalProps {
  isOpen: boolean;
  documentId: string;
  isLight: boolean;
  onClose: () => void;
  onAssetCreated?: () => void;
}

interface ParsedDocumentPayload {
  companySuggestion: {
    primary: 'DESTINATARIO' | 'EMITENTE';
    destinatario: CompanyParticipant;
    emitente: CompanyParticipant;
  };
  items: ExtractedItem[];
  invoice: {
    number: string | null;
    series: string | null;
    issueDate: string | null;
    accessKey: string | null;
    totalAmount: number;
    supplier: string;
  };
}

export function DepreciateDocumentModal({
  isOpen,
  documentId,
  isLight,
  onClose,
  onAssetCreated,
}: DepreciateDocumentModalProps) {
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  // Parsed XML data
  const [parsedData, setParsedData] = useState<ParsedDocumentPayload | null>(null);

  // Entities
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Selection states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companySuggestionBadge, setCompanySuggestionBadge] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // Form states
  const [form, setForm] = useState({
    code: '',
    description: '',
    categoryId: '',
    annualRate: '',
    acquisitionDate: '',
    depreciationStartDate: '',
    acquisitionValue: '',
    residualValue: '0,00',
    supplier: '',
    documentNumber: '',
    series: '',
    accessKey: '',
    ncm: '',
  });

  // Load Companies
  const loadCompanies = useCallback(async () => {
    try {
      const res = await apiFetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
        return data;
      }
    } catch (e) {
      console.warn('[DepreciateModal] Failed to fetch companies', e);
    }
    return [];
  }, []);

  // Load Categories for the selected company
  const loadCategories = useCallback(async (companyId: string) => {
    if (!companyId) {
      setCategories([]);
      return;
    }
    try {
      const res = await apiFetch(`/api/categories?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.warn('[DepreciateModal] Failed to fetch categories', e);
    }
  }, []);

  // Fetch document parse & companies on open
  useEffect(() => {
    if (!isOpen || !documentId) return;

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const init = async () => {
      try {
        const [companiesList, parseRes] = await Promise.all([
          loadCompanies(),
          apiFetch(`/api/assets/parse-from-document/${documentId}`, { method: 'POST' }),
        ]);

        if (!parseRes.ok) {
          const errData = await parseRes.json().catch(() => ({}));
          throw new Error(errData?.error || 'Falha ao extrair dados fiscais do documento');
        }

        const data: ParsedDocumentPayload = await parseRes.json();
        if (!isMounted) return;

        setParsedData(data);

        // Matching de empresa (Destinatário P1 > Emitente P2)
        const match = matchCompanyByPriority(
          companiesList,
          data.companySuggestion.destinatario,
          data.companySuggestion.emitente
        );

        let initialCompanyId = '';
        if (match) {
          initialCompanyId = match.company.id;
          setSelectedCompanyId(match.company.id);
          setCompanySuggestionBadge(match.badgeText);
          loadCategories(match.company.id);
        } else if (companiesList.length > 0) {
          initialCompanyId = companiesList[0].id;
          setSelectedCompanyId(companiesList[0].id);
          setCompanySuggestionBadge(null);
          loadCategories(companiesList[0].id);
        }

        // Pre-fill inicial com o primeiro item
        const firstItem = data.items && data.items.length > 0 ? data.items[0] : null;
        const itemPrefill = firstItem
          ? extractItemPreFill(firstItem, data.invoice.number)
          : {
              description: 'Aquisição conforme Nota Fiscal',
              acquisitionValueFormatted: formatBrlValue(data.invoice.totalAmount / 100),
              ncm: '',
              code: getSuggestedPlaque(data.invoice.number, 1),
            };

        const issueDateIso = data.invoice.issueDate
          ? (data.invoice.issueDate.match(/^(\d{4}-\d{2}-\d{2})/)
              ? data.invoice.issueDate.match(/^(\d{4}-\d{2}-\d{2})/)![1]
              : new Date(data.invoice.issueDate).toISOString().slice(0, 10))
          : (() => {
              const now = new Date();
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            })();

        setForm({
          code: itemPrefill.code,
          description: itemPrefill.description,
          categoryId: '',
          annualRate: '',
          acquisitionDate: issueDateIso,
          depreciationStartDate: issueDateIso,
          acquisitionValue: itemPrefill.acquisitionValueFormatted,
          residualValue: '0,00',
          supplier: data.invoice.supplier || '',
          documentNumber: data.invoice.number || '',
          series: data.invoice.series || '',
          accessKey: data.invoice.accessKey || '',
          ncm: itemPrefill.ncm || '',
        });

        setSelectedItemIndex(0);
      } catch (err: any) {
        if (!isMounted) return;
        setLoadError(err?.message || 'Erro ao carregar dados do documento');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId, loadCompanies, loadCategories]);

  // Handle switching company
  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    setCompanySuggestionBadge(null);
    loadCategories(id);
    // Reset category selection
    setForm((prev) => ({ ...prev, categoryId: '', annualRate: '' }));
  };

  // Handle category selection
  const handleSelectCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    setForm((prev) => ({
      ...prev,
      categoryId: catId,
      annualRate: cat?.defaultRate ? String(cat.defaultRate) : prev.annualRate,
    }));
  };

  // Handle switching item
  const handleSelectItem = (itemIdx: number) => {
    if (!parsedData || !parsedData.items || !parsedData.items[itemIdx]) return;
    const item = parsedData.items[itemIdx];
    const prefill = extractItemPreFill(item, parsedData.invoice.number);

    setSelectedItemIndex(itemIdx);
    setForm((prev) => ({
      ...prev,
      code: prefill.code,
      description: prefill.description,
      acquisitionValue: prefill.acquisitionValueFormatted,
      ncm: prefill.ncm,
    }));
  };

  // Quick 1-click company creation from XML suggestion
  const handle1ClickCreateCompany = async () => {
    if (!parsedData) return;
    const candidate =
      parsedData.companySuggestion.destinatario?.name &&
      parsedData.companySuggestion.destinatario?.cleanDocument
        ? parsedData.companySuggestion.destinatario
        : parsedData.companySuggestion.emitente;

    if (!candidate?.name) {
      toast.error('Erro', 'Nome da empresa não identificado no XML');
      return;
    }

    try {
      setIsCreatingCompany(true);
      const res = await apiFetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.name,
          cnpj: candidate.cleanDocument,
          document: candidate.cleanDocument,
          state: candidate.state || undefined,
          city: candidate.city || undefined,
          depreciationRule: 'PROPORTIONAL',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Falha ao cadastrar empresa');
      }

      const created = await res.json();
      const updatedList = await loadCompanies();
      setSelectedCompanyId(created.id);
      setCompanySuggestionBadge('✨ Cadastrada e vinculada automaticamente');
      loadCategories(created.id);
      toast.success('Empresa Cadastrada!', `"${created.name}" pronta para receber o ativo.`);
    } catch (e: any) {
      toast.error('Erro no cadastro', e?.message || 'Verifique os dados da empresa');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  // Submit asset
  const handleSaveAsset = async () => {
    if (!selectedCompanyId) {
      toast.warning('Empresa obrigatória', 'Selecione ou cadastre uma empresa no topo do modal.');
      return;
    }

    if (!form.description.trim()) {
      toast.warning('Descrição obrigatória', 'Informe a descrição do bem.');
      return;
    }

    const cents = parseBrlInputToCents(form.acquisitionValue);
    if (cents <= 0) {
      toast.warning('Valor inválido', 'Informe um valor de aquisição válido maior que zero.');
      return;
    }

    const rate = parseFloat(form.annualRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      toast.warning('Taxa inválida', 'Informe uma taxa de depreciação anual válida (0% a 100%).');
      return;
    }

    try {
      setIsSaving(true);

      // Prepara descrição incorporando plaqueta se fornecida
      const finalDescription = form.code.trim() && !form.description.includes(form.code.trim())
        ? `[${form.code.trim()}] ${form.description.trim()}`
        : form.description.trim();

      const payload = {
        companyId: selectedCompanyId,
        supplier: form.supplier.trim() || 'Fornecedor da Nota',
        acquisitionDate: form.acquisitionDate,
        documentNumber: form.documentNumber.trim() || 'S/N',
        description: finalDescription,
        acquisitionValue: cents,
        annualRate: rate,
        ncm: form.ncm.trim() || null,
        categoryId: form.categoryId || null,
      };

      const res = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Erro ao salvar bem no imobilizado');
      }

      toast.success('Ativo Imobilizado com Sucesso!', `"${finalDescription}" vinculado à empresa.`);
      onAssetCreated?.();
      onClose();
    } catch (e: any) {
      toast.error('Erro ao salvar', e?.message || 'Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving && !isCreatingCompany) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSaving, isCreatingCompany, onClose]);

  // Candidate for 1-click creation if current company is not matched
  const suggestedCandidate = useMemo(() => {
    if (!parsedData) return null;
    const dest = parsedData.companySuggestion.destinatario;
    const emit = parsedData.companySuggestion.emitente;
    if (dest?.cleanDocument && dest?.cleanDocument.length === 14) return dest;
    if (emit?.cleanDocument && emit?.cleanDocument.length === 14) return emit;
    return dest || emit || null;
  }, [parsedData]);

  const hasMatchingRegisteredCompany = useMemo(() => {
    if (!parsedData || companies.length === 0) return false;
    const match = matchCompanyByPriority(
      companies,
      parsedData.companySuggestion.destinatario,
      parsedData.companySuggestion.emitente
    );
    return Boolean(match);
  }, [parsedData, companies]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col border ${
            isLight
              ? 'bg-white border-[#e2e8f0] text-[#0f172a]'
              : 'bg-[#141418] border-[#27272a] text-[#fafafa]'
          }`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>Depreciar Nota Fiscal</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-normal ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    NF-e {form.documentNumber ? `Nº ${form.documentNumber}` : ''}
                  </span>
                </h3>
                <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Vincule o item adquirido ao controle de Imobilizado e Depreciação.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving || isCreatingCompany}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-white/10 text-[#a1a1aa]'
              }`}
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                <p className={`text-xs font-medium ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                  Lendo XML do documento e analisando participantes...
                </p>
              </div>
            ) : loadError ? (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">Falha ao ler nota fiscal</h4>
                  <p className="text-xs mt-0.5 opacity-90">{loadError}</p>
                </div>
              </div>
            ) : (
              <>
                {/* ========================================================
                    SEÇÃO 1: Empresa Pertencente ao Bem (Topo)
                   ======================================================== */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0e0e12] border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Empresa Pertencente ao Bem *</span>
                    </label>
                    <span className="text-[10px] text-blue-500 font-medium">Seção 1 de 3</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => handleSelectCompany(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/30 ${
                        isLight
                          ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                          : 'bg-[#18181b] border-[#3f3f46] text-white'
                      }`}
                    >
                      <option value="">Selecione uma empresa cadastrada...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.cnpj ? `(${c.cnpj})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Badge de sugestão automática */}
                  {companySuggestionBadge && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{companySuggestionBadge}</span>
                    </div>
                  )}

                  {/* Banner 1-Clique se empresa do XML não está no banco */}
                  {!hasMatchingRegisteredCompany && suggestedCandidate && (
                    <div
                      className={`p-3 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isLight
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Empresa do XML não cadastrada na Depreciação:</span>
                        </div>
                        <p className="text-xs truncate font-mono mt-0.5">
                          {suggestedCandidate.name}{' '}
                          {suggestedCandidate.cleanDocument ? `• CNPJ: ${suggestedCandidate.cleanDocument}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handle1ClickCreateCompany}
                        disabled={isCreatingCompany}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {isCreatingCompany ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5" />
                        )}
                        <span>Cadastrar em 1 Clique</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ========================================================
                    SEÇÃO 2: Seletor de Item da Nota Fiscal
                   ======================================================== */}
                {parsedData?.items && parsedData.items.length > 0 && (
                  <div
                    className={`p-4 rounded-xl border space-y-2.5 ${
                      isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0e0e12] border-[#27272a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                        <span>Item da Nota Fiscal *</span>
                      </label>
                      <span className="text-[10px] text-purple-500 font-medium">
                        {parsedData.items.length === 1 ? 'Item Único' : `${parsedData.items.length} Itens Extraídos`}
                      </span>
                    </div>

                    {parsedData.items.length > 1 ? (
                      <select
                        value={selectedItemIndex}
                        onChange={(e) => handleSelectItem(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-lg border text-xs cursor-pointer outline-none focus:ring-2 focus:ring-purple-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                      >
                        {parsedData.items.map((it, idx) => (
                          <option key={idx} value={idx}>
                            [Item {it.itemIndex}/{parsedData.items.length}] {it.description} — R${' '}
                            {formatBrlValue(it.totalPrice)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between ${
                          isLight ? 'bg-white border-[#cbd5e1]' : 'bg-[#18181b] border-[#3f3f46]'
                        }`}
                      >
                        <span className="truncate pr-2 font-mono">
                          {parsedData.items[0].description}
                        </span>
                        <span className="font-bold shrink-0 text-emerald-500 font-mono">
                          R$ {formatBrlValue(parsedData.items[0].totalPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================
                    SEÇÃO 3: Dados do Ativo Imobilizado (Pré-preenchidos)
                   ======================================================== */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                      Cadastro do Bem no Imobilizado
                    </span>
                    <span className="text-[10px] text-emerald-500 font-medium">Seção 3 de 3</span>
                  </div>

                  {/* Descrição e Código/Plaqueta */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Descrição do Bem *
                      </label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                        placeholder="Ex: Notebook Corporativo Core i7"
                      />
                    </div>
                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Código / Plaqueta
                      </label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                        placeholder="IMOB-12345-1"
                      />
                    </div>
                  </div>

                  {/* Categoria e Taxa Anual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Categoria Contábil
                      </label>
                      <select
                        value={form.categoryId}
                        onChange={(e) => handleSelectCategory(e.target.value)}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                      >
                        <option value="">Selecione uma categoria...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.defaultRate}% a.a.)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Taxa de Depreciação Anual % *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.annualRate}
                        onChange={(e) => setForm({ ...form, annualRate: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                        placeholder="Ex: 20"
                      />
                    </div>
                  </div>

                  {/* Datas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Data de Aquisição *
                      </label>
                      <input
                        type="date"
                        value={form.acquisitionDate}
                        onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Início da Depreciação
                      </label>
                      <input
                        type="date"
                        value={form.depreciationStartDate}
                        onChange={(e) => setForm({ ...form, depreciationStartDate: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Valores (Aquisição, Residual, NCM) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Valor de Aquisição (R$) *
                      </label>
                      <input
                        type="text"
                        value={form.acquisitionValue}
                        onChange={(e) => setForm({ ...form, acquisitionValue: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Valor Residual (R$)
                      </label>
                      <input
                        type="text"
                        value={form.residualValue}
                        onChange={(e) => setForm({ ...form, residualValue: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        NCM
                      </label>
                      <input
                        type="text"
                        value={form.ncm}
                        onChange={(e) => setForm({ ...form, ncm: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                        placeholder="8471.30.12"
                      />
                    </div>
                  </div>

                  {/* Fornecedor, Número e Série */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Fornecedor (Emitente da NF)
                      </label>
                      <input
                        type="text"
                        value={form.supplier}
                        onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          isLight
                            ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#18181b] border-[#3f3f46] text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                        Nº da Nota / Série
                      </label>
                      <input
                        type="text"
                        value={form.series ? `${form.documentNumber} / ${form.series}` : form.documentNumber}
                        readOnly
                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono opacity-80 ${
                          isLight
                            ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0f172a]'
                            : 'bg-[#09090b] border-[#3f3f46] text-zinc-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Chave de Acesso */}
                  {form.accessKey && (
                    <div>
                      <label className={`text-[11px] font-semibold ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                        Chave de Acesso (44 dígitos)
                      </label>
                      <input
                        type="text"
                        value={form.accessKey}
                        readOnly
                        className={`w-full mt-0.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono opacity-70 ${
                          isLight
                            ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]'
                            : 'bg-[#09090b] border-[#27272a] text-[#a1a1aa]'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className={`px-5 py-3 border-t flex items-center justify-end gap-2.5 shrink-0 ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-white border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9]'
                  : 'bg-[#18181b] border-[#3f3f46] text-[#fafafa] hover:bg-[#27272a]'
              }`}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAsset}
              disabled={isLoading || isSaving || !!loadError}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Salvar Ativo no Imobilizado</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
