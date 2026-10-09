export interface DadosTaxesSectionProps {
  doc: any;
  isLight: boolean;
}

export function DadosTaxesSection({ doc, isLight }: DadosTaxesSectionProps) {
  if (!doc.totals?.taxes && (!doc.taxes || doc.taxes.length === 0)) {
    return null;
  }

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        isLight ? 'border-[#e2e8f0] bg-white' : 'border-[#27272a] bg-[#09090b]'
      }`}
    >
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
        }`}
      >
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
        <div
          className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}
        >
          <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            ICMS
          </div>
          <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            R$ {(doc.totals?.taxes?.icms ?? (doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.amount || 0)).toFixed(2)}
          </div>
          {doc.totals?.icmsBase ?? doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base ? (
            <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Base: R$ {(doc.totals?.icmsBase ?? doc.taxes?.find((t: any) => t.taxType === 'ICMS')?.base).toFixed(2)}
            </div>
          ) : null}
        </div>

        {/* ICMS ST */}
        {doc.totals?.taxes?.icmsSt ||
        doc.totals?.icmsStBase ||
        doc.taxes?.some((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST') ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              ICMS ST
            </div>
            <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              R${' '}
              {(
                doc.totals?.taxes?.icmsSt ??
                (doc.taxes?.find((t: any) => t.taxType === 'ICMS_ST' || t.taxType === 'ICMSST')?.amount || 0)
              ).toFixed(2)}
            </div>
            {doc.totals?.icmsStBase ? (
              <div className={`text-[9px] mt-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                Base: R$ {doc.totals.icmsStBase.toFixed(2)}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* IPI */}
        <div
          className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}
        >
          <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            IPI
          </div>
          <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            R$ {(doc.totals?.taxes?.ipi ?? (doc.taxes?.find((t: any) => t.taxType === 'IPI')?.amount || 0)).toFixed(2)}
          </div>
        </div>

        {/* PIS */}
        <div
          className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}
        >
          <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            PIS
          </div>
          <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            R$ {(doc.totals?.taxes?.pis ?? (doc.taxes?.find((t: any) => t.taxType === 'PIS')?.amount || 0)).toFixed(2)}
          </div>
        </div>

        {/* COFINS */}
        <div
          className={`p-2.5 rounded-lg border ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
          }`}
        >
          <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            COFINS
          </div>
          <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            R$ {(doc.totals?.taxes?.cofins ?? (doc.taxes?.find((t: any) => t.taxType === 'COFINS')?.amount || 0)).toFixed(2)}
          </div>
        </div>

        {/* ISS (se houver) */}
        {doc.totals?.taxes?.iss || doc.taxes?.some((t: any) => t.taxType === 'ISS') ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              ISS
            </div>
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
        {doc.totals?.taxes?.inss || doc.taxes?.some((t: any) => t.taxType === 'INSS') ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              INSS
            </div>
            <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              R$ {(doc.totals?.taxes?.inss ?? (doc.taxes?.find((t: any) => t.taxType === 'INSS')?.amount || 0)).toFixed(2)}
            </div>
          </div>
        ) : null}

        {/* IR / IRRF (se houver) */}
        {doc.totals?.taxes?.ir || doc.taxes?.some((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF') ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              IRRF
            </div>
            <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              R$ {(doc.totals?.taxes?.ir ?? (doc.taxes?.find((t: any) => t.taxType === 'IR' || t.taxType === 'IRRF')?.amount || 0)).toFixed(2)}
            </div>
          </div>
        ) : null}

        {/* CSLL (se houver) */}
        {doc.totals?.taxes?.csll || doc.taxes?.some((t: any) => t.taxType === 'CSLL') ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              CSLL
            </div>
            <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              R$ {(doc.totals?.taxes?.csll ?? (doc.taxes?.find((t: any) => t.taxType === 'CSLL')?.amount || 0)).toFixed(2)}
            </div>
          </div>
        ) : null}

        {/* ISS Retido (se houver) */}
        {doc.totals?.taxes?.issRetained || doc.issRetained ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              ISS Retido
            </div>
            <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              {typeof doc.totals?.taxes?.issRetained === 'number' && doc.totals.taxes.issRetained > 0
                ? `R$ ${doc.totals.taxes.issRetained.toFixed(2)}`
                : 'Sim'}
            </div>
          </div>
        ) : null}

        {/* Outras Retenções (se houver) */}
        {doc.totals?.taxes?.outrasRetencoes && doc.totals.taxes.outrasRetencoes > 0 ? (
          <div
            className={`p-2.5 rounded-lg border ${
              isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#18181b] border-[#27272a]'
            }`}
          >
            <div className={`text-[9px] uppercase font-bold mb-0.5 ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Outras Retenções
            </div>
            <div className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              R$ {doc.totals.taxes.outrasRetencoes.toFixed(2)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

