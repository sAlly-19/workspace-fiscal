import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  Building2,
  FileSpreadsheet,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import { useDepreciationStore } from '../../stores/depreciation.store';
import { toast } from '../Toast';
import { CsvLayoutModal } from '../../features/depreciation/CsvLayoutModal';

interface DepreciationSettingsTabProps {
  isLight: boolean;
}

export function DepreciationSettingsTab({ isLight }: DepreciationSettingsTabProps) {
  const {
    companies,
    selectedCompanyId,
    selectCompany,
    updateCompany,
    fetchCompanies,
  } = useDepreciationStore();

  const [activeCompanyRule, setActiveCompanyRule] = useState<'PROPORTIONAL' | 'MONTH_OF_ACQUISITION' | 'NEXT_MONTH'>('PROPORTIONAL');
  const [savingRule, setSavingRule] = useState(false);

  // CSV preferences
  const [csvSeparator, setCsvSeparator] = useState<';' | ','>(';');
  const [csvNumericFormat, setCsvNumericFormat] = useState<'RAW' | 'BRL'>('RAW');
  const [csvDateFormat, setCsvDateFormat] = useState<'DD/MM/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0] || null;

  useEffect(() => {
    if (selectedCompany) {
      setActiveCompanyRule((selectedCompany.depreciationRule as any) || 'PROPORTIONAL');
    }
  }, [selectedCompany]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('depreciation_csv_column_mapping_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.separator === ';' || parsed.separator === ',') setCsvSeparator(parsed.separator);
        if (parsed.numericFormat === 'RAW' || parsed.numericFormat === 'BRL') setCsvNumericFormat(parsed.numericFormat);
        if (parsed.dateFormat === 'DD/MM/YYYY' || parsed.dateFormat === 'YYYY-MM-DD') setCsvDateFormat(parsed.dateFormat);
      }
    } catch {}
  }, []);

  const handleSaveCompanyRule = async () => {
    if (!selectedCompany) return;
    setSavingRule(true);
    try {
      await updateCompany(selectedCompany.id, { depreciationRule: activeCompanyRule });
      toast.success('Regra atualizada', `Regra da empresa "${selectedCompany.name}" alterada para ${activeCompanyRule}.`);
    } catch (e: any) {
      toast.error('Erro ao atualizar regra', e.message);
    } finally {
      setSavingRule(false);
    }
  };

  const handleSaveCsvOptions = (sep: ';' | ',', num: 'RAW' | 'BRL', dt: 'DD/MM/YYYY' | 'YYYY-MM-DD') => {
    setCsvSeparator(sep);
    setCsvNumericFormat(num);
    setCsvDateFormat(dt);

    try {
      const saved = localStorage.getItem('depreciation_csv_column_mapping_v1');
      const existing = saved ? JSON.parse(saved) : {};
      const updated = {
        ...existing,
        separator: sep,
        numericFormat: num,
        dateFormat: dt,
      };
      localStorage.setItem('depreciation_csv_column_mapping_v1', JSON.stringify(updated));
      toast.success('Preferências de CSV salvas', 'Formato de separador, número e data atualizados.');
    } catch (e: any) {
      toast.error('Erro ao salvar preferências', e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Regra de Início da Depreciação */}
      <div>
        <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          <TrendingDown className="w-4 h-4 text-blue-500" />
          <span>Regra de Início da Depreciação</span>
        </div>

        <div
          className={`space-y-4 rounded-xl p-4 border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <div>
            <label className={`text-[11px] font-semibold flex items-center gap-1.5 ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Empresa Selecionada para Configuração:</span>
            </label>
            {companies.length > 0 ? (
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => selectCompany(e.target.value)}
                className={`w-full mt-1.5 px-3 py-2 rounded-lg border text-xs cursor-pointer font-medium ${
                  isLight
                    ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                    : 'bg-[#18181b] border-[#3f3f46] text-white'
                }`}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.document || c.cnpj || 'Sem doc'})
                  </option>
                ))}
              </select>
            ) : (
              <p className={`text-xs mt-1 italic ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                Nenhuma empresa cadastrada no módulo de depreciação.
              </p>
            )}
          </div>

          {selectedCompany && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                Critério de cálculo do primeiro mês de depreciação:
              </span>

              <div className="space-y-2">
                {[
                  {
                    value: 'PROPORTIONAL',
                    title: 'Proporcional (Pró-rata)',
                    desc: 'Calcula a depreciação proporcional aos dias restantes no mês de aquisição do bem (Padrão contábil).',
                  },
                  {
                    value: 'MONTH_OF_ACQUISITION',
                    title: 'Mês Integral da Aquisição',
                    desc: 'Deprecia o mês completo da compra independentemente do dia em que o bem foi adquirido.',
                  },
                  {
                    value: 'NEXT_MONTH',
                    title: 'Mês Subsequente',
                    desc: 'Inicia o cálculo apenas a partir do mês seguinte à data de aquisição do ativo.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setActiveCompanyRule(opt.value as any)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      activeCompanyRule === opt.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : isLight
                          ? 'border-[#cbd5e1] bg-white hover:border-blue-300'
                          : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="depreciationRule"
                      checked={activeCompanyRule === opt.value}
                      onChange={() => setActiveCompanyRule(opt.value as any)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className={`text-xs font-bold ${activeCompanyRule === opt.value ? 'text-blue-500' : (isLight ? 'text-[#0f172a]' : 'text-white')}`}>
                        {opt.title}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                        {opt.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCompanyRule}
                  disabled={savingRule || selectedCompany.depreciationRule === activeCompanyRule}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingRule ? 'Salvando...' : 'Salvar Regra da Empresa'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Padrões de Exportação CSV */}
      <div>
        <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>Preferências da Planilha CSV (Exportação)</span>
        </div>

        <div
          className={`space-y-4 rounded-xl p-4 border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
          }`}
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                Delimitador / Separador
              </label>
              <select
                value={csvSeparator}
                onChange={(e) => handleSaveCsvOptions(e.target.value as any, csvNumericFormat, csvDateFormat)}
                className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-md border cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'
                }`}
              >
                <option value=";">Ponto e vírgula (;)</option>
                <option value=",">Vírgula (,)</option>
              </select>
            </div>

            <div>
              <label className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                Formato Numérico
              </label>
              <select
                value={csvNumericFormat}
                onChange={(e) => handleSaveCsvOptions(csvSeparator, e.target.value as any, csvDateFormat)}
                className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-md border cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'
                }`}
              >
                <option value="RAW">Bruto / Internacional (1234.56)</option>
                <option value="BRL">Brasileiro (1.234,56)</option>
              </select>
            </div>

            <div>
              <label className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                Formato de Data
              </label>
              <select
                value={csvDateFormat}
                onChange={(e) => handleSaveCsvOptions(csvSeparator, csvNumericFormat, e.target.value as any)}
                className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-md border cursor-pointer ${
                  isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-white'
                }`}
              >
                <option value="DD/MM/YYYY">DD/MM/AAAA (Brasil)</option>
                <option value="YYYY-MM-DD">AAAA-MM-DD (ISO)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Personalize a ordem das colunas no Excel/ERP contábil:
            </span>
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#334155]'
                  : 'bg-[#18181b] hover:bg-[#27272a] border-[#3f3f46] text-[#e4e4e7]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
              <span>Configurar Colunas do CSV</span>
            </button>
          </div>
        </div>
      </div>

      {showLayoutModal && (
        <CsvLayoutModal
          isOpen={showLayoutModal}
          onClose={() => setShowLayoutModal(false)}
          onExport={async () => {
            setShowLayoutModal(false);
          }}
          isGenerating={false}
          competence=""
          totalRows={0}
          theme={isLight ? 'light' : 'dark'}
        />
      )}
    </div>
  );
}
