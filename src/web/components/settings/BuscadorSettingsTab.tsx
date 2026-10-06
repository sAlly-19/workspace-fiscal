import React, { useState, useEffect } from 'react';
import {
  Building2,
  Folder,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Award,
  RefreshCw,
  Check,
} from 'lucide-react';
import { toast } from '../Toast';
import type { AppSettings, Company, CertificateInfo, SefazEnvironment } from '@/core/buscador/domain/types';

interface BuscadorSettingsTabProps {
  isLight: boolean;
}

export function BuscadorSettingsTab({ isLight }: BuscadorSettingsTabProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeCert, setActiveCert] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.fiscalApi) {
        const [curSettings, allCompanies, active] = await Promise.all([
          window.fiscalApi.settings.get(),
          window.fiscalApi.companies.list(),
          window.fiscalApi.companies.getActive(),
        ]);
        setSettings(curSettings);
        setCompanies(allCompanies);
        setActiveCompany(active);
        if (active) {
          const cert = await window.fiscalApi.certificates.getForCompany(active.id);
          setActiveCert(cert);
        }
      }
    } catch (err: any) {
      console.warn('Falha ao carregar configurações do Buscador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateEnv = async (newEnv: SefazEnvironment) => {
    if (!settings || settings.sefaz_environment === newEnv) return;
    setSaving(true);
    try {
      const updated = await window.fiscalApi?.settings.update({
        sefaz_environment: newEnv,
      });
      if (updated) {
        setSettings(updated);
        toast.success(
          'Ambiente SEFAZ atualizado',
          `Alterado para ${newEnv === 'production' ? 'Produção' : 'Homologação'}.`
        );
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar ambiente', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await window.fiscalApi?.settings.selectFolder(
        'Pasta Padrão de Armazenamento de XMLs'
      );
      if (selected) {
        const updated = await window.fiscalApi?.settings.update({
          default_storage_path: selected,
        });
        if (updated) {
          setSettings(updated);
          toast.success('Pasta padrão atualizada', selected);
        }
      }
    } catch (err: any) {
      toast.error('Erro ao selecionar pasta', err.message);
    }
  };

  const env = settings?.sefaz_environment || 'homologation';
  const defaultFolder = settings?.default_storage_path || '';

  return (
    <div className="space-y-6 select-none">
      {/* 1. Ambiente SEFAZ */}
      <div>
        <div
          className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${
            isLight ? 'text-[#0f172a]' : 'text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-purple-500" />
          <span>Ambiente de Consulta SEFAZ</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Homologação */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdateEnv('homologation')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-left ${
              env === 'homologation'
                ? isLight
                  ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-md ring-2 ring-amber-500/20'
                  : 'border-amber-500/60 bg-amber-500/10 text-white shadow-md ring-2 ring-amber-500/30'
                : isLight
                  ? 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]'
                  : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xs">Homologação (Testes)</div>
              <div className={`text-[10px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Ambiente de testes (sem validade fiscal)
              </div>
            </div>
            {env === 'homologation' && (
              <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Ativo
              </span>
            )}
          </button>

          {/* Produção */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleUpdateEnv('production')}
            className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-left ${
              env === 'production'
                ? isLight
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-emerald-500/60 bg-emerald-500/10 text-white shadow-md ring-2 ring-emerald-500/30'
                : isLight
                  ? 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]'
                  : 'border-[#27272a] bg-[#111114] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-white'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xs">Produção (Oficial)</div>
              <div className={`text-[10px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Documentos reais com validade jurídica
              </div>
            </div>
            {env === 'production' && (
              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Ativo
              </span>
            )}
          </button>
        </div>

        <div
          className={`mt-2 p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2 ${
            isLight
              ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
              : 'bg-[#141418] border-[#27272a] text-[#a1a1aa]'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Ao alternar entre Homologação e Produção, o NSU de cada empresa é preservado
            individualmente por ambiente, garantindo que o histórico nunca seja perdido.
          </span>
        </div>
      </div>

      {/* 2. Pasta Padrão de Armazenamento */}
      <div>
        <div
          className={`flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider ${
            isLight ? 'text-[#0f172a]' : 'text-white'
          }`}
        >
          <Folder className="w-4 h-4 text-purple-500" />
          <span>Pasta de Armazenamento dos Documentos</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={defaultFolder || 'Pasta padrão do sistema (userData/documents)'}
            className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
              isLight
                ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#0f172a]'
                : 'bg-[#111114] border-[#27272a] text-slate-300'
            }`}
          />
          <button
            type="button"
            onClick={handleSelectFolder}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Alterar</span>
          </button>
        </div>
        <p className={`text-[11px] mt-1.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
          Local onde os arquivos XML e PDFs baixados pela SEFAZ serão arquivados, organizados
          por CNPJ e ano/mês.
        </p>
      </div>

      {/* 3. Empresas e Certificados Digitais */}
      <div>
        <div
          className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${
            isLight ? 'text-[#0f172a]' : 'text-white'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>Empresas & Certificados Digitais ({companies.length})</span>
        </div>

        <div
          className={`rounded-xl border divide-y overflow-hidden ${
            isLight
              ? 'bg-white border-[#e2e8f0] divide-[#f1f5f9]'
              : 'bg-[#111114] border-[#27272a] divide-[#1c1c22]'
          }`}
        >
          {companies.length === 0 ? (
            <div className={`p-4 text-center text-xs ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Nenhuma empresa cadastrada no Buscador Fiscal ainda. Acesse o módulo para adicionar sua primeira empresa.
            </div>
          ) : (
            companies.map((comp) => {
              const isActive = comp.id === activeCompany?.id;
              const cert = isActive ? activeCert : null;
              return (
                <div key={comp.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                        {comp.name}
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          Ativa
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                      CNPJ: {comp.cnpj} • UF: {comp.uf || 'SP'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {cert ? (
                      <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-semibold">
                        <Award className="w-3.5 h-3.5" />
                        <span>Certificado Vinculado</span>
                      </div>
                    ) : (
                      <span className={`text-[11px] ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                        Sem Certificado
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Resumo de Diretrizes da SEFAZ */}
      <div
        className={`p-3.5 rounded-xl border text-[11px] space-y-1.5 ${
          isLight
            ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569]'
            : 'bg-[#141418] border-[#27272a] text-[#a1a1aa]'
        }`}
      >
        <div className="font-bold flex items-center gap-1.5 text-purple-500">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Regras de Consulta & Cooldown da SEFAZ</span>
        </div>
        <p>
          • <b>Controle de NSU:</b> A sincronização avança sequencialmente do último NSU até o NSU máximo retornado pelo Ambiente Nacional.
        </p>
        <p>
          • <b>Consumo Indevido (cStat 656):</b> A SEFAZ bloqueia consultas frequentes sem novos documentos por 1 hora. O módulo respeita automaticamente o tempo de espera.
        </p>
        <p>
          • <b>Certificados A1:</b> A autenticação mTLS é realizada utilizando a chave privada instalada no repositório nativo do Windows.
        </p>
      </div>
    </div>
  );
}

