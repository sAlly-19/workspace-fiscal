import React from 'react';
import { Building2, Award } from 'lucide-react';
import type { Company, CertificateInfo } from '@/core/buscador/domain/types';

interface CompaniesListCardProps {
  companies: Company[];
  activeCompany: Company | null;
  activeCert: CertificateInfo | null;
  isLight: boolean;
}

export function CompaniesListCard({
  companies,
  activeCompany,
  activeCert,
  isLight,
}: CompaniesListCardProps) {
  return (
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
  );
}

