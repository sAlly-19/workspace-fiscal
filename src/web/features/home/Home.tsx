import { useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Sparkles, ArrowRight, Wand2, Zap, Shield, Layers, Clock, TrendingDown, Building2, Package } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { useDepreciationStore } from '../../stores/depreciation.store';
import { TitleBar } from '../../components/TitleBar';

interface HomeProps {
  onOpenNFView: () => void;
  onOpenDepreciation: () => void;
}

export function Home({ onOpenNFView, onOpenDepreciation }: HomeProps) {
  const { settings, documents, folders } = useWorkspaceStore();
  const dep = useDepreciationStore();
  const currentTheme = settings.theme || 'dark';
  const isLight = currentTheme === 'light';

  const docCount = documents.length;
  const folderCount = folders.length;
  const assetCount = dep.assets.length || 0;
  const companyCount = dep.companies.length || 0;

  useEffect(() => {
    dep.fetchCompanies().then(() => {
      if (dep.selectedCompanyId) {
        dep.fetchAssets();
      }
    });
    // also fetch global categories/assets counts via companies
  }, []);

  const isElectron = typeof window !== 'undefined' && (window as any).api;

  return (
    <>
      <TitleBar />
      <div
        className={`min-h-screen w-full flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden select-none ${
          isLight ? 'bg-[#f8fafc] text-[#0f172a]' : 'bg-[#09090b] text-white'
        }`}
        style={{ paddingTop: isElectron ? 56 : undefined }}
      >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-[90px] ${isLight ? 'bg-blue-200/60' : 'bg-blue-600/20'}`} />
        <div className={`absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full blur-[100px] ${isLight ? 'bg-violet-200/50' : 'bg-violet-600/15'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[130px] ${isLight ? 'bg-cyan-100/40' : 'bg-cyan-600/10'}`} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${isLight ? '#0f172a' : '#fff'} 1px, transparent 1px), linear-gradient(90deg, ${isLight ? '#0f172a' : '#fff'} 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Header brand */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center mb-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/icon.png"
            alt="App"
            className={`w-12 h-12 rounded-2xl object-cover shadow-xl border ${isLight ? 'border-blue-200 shadow-blue-500/20' : 'border-blue-500/30 shadow-blue-500/30'}`}
          />
          <div className="text-left">
            <div className={`text-lg font-black tracking-tight leading-none ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Workspace Fiscal
            </div>
            <div className={`text-[11px] font-medium tracking-widest uppercase ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Hub • Ferramentas inteligentes
            </div>
          </div>
        </div>

        <h1 className={`text-3xl md:text-5xl font-black tracking-tight leading-none ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
          Bem-vindo ao seu
          <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600 bg-clip-text text-transparent"> Hub Fiscal</span>
        </h1>
        <p className={`mt-3 max-w-2xl text-sm md:text-[15px] leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
          Duas ferramentas fiscais em um só hub: <b className={isLight ? 'text-[#0f172a]' : 'text-white'}>NF View</b> para DANFE e <b className={isLight ? 'text-[#0f172a]' : 'text-white'}>Depreciação</b> para controle patrimonial com CSV contábil.
        </p>

        {/* Stats pill */}
        {(docCount > 0 || folderCount > 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm ${
              isLight ? 'bg-white border-[#e2e8f0] text-[#475569]' : 'bg-white/5 border-white/10 text-[#d4d4d8] backdrop-blur'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{docCount} documentos</span>
            <span className={isLight ? 'text-[#cbd5e1]' : 'text-white/20'}>•</span>
            <span>{folderCount} pastas</span>
          </motion.div>
        )}
      </motion.div>

      {/* Cards Grid */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7">
        {/* Card NF View - Ativo */}
        <motion.button
          onClick={onOpenNFView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="group text-left relative overflow-hidden rounded-[24px] p-[1px] cursor-pointer"
          style={{
            background: isLight
              ? 'linear-gradient(135deg, #2563eb, #06b6d4, #7c3aed)'
              : 'linear-gradient(135deg, #2563eb, #06b6d4, #7c3aed)',
          }}
        >
          <div
            className={`relative h-full rounded-[23px] p-6 md:p-7 flex flex-col overflow-hidden transition-colors ${
              isLight ? 'bg-white' : 'bg-[#0f0f12]'
            }`}
          >
            {/* Glow on hover */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-violet-500/15 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Badge */}
            <div className="relative flex items-center justify-between mb-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-widest uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Disponível
              </span>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${isLight ? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]' : 'bg-white/5 border-white/10 text-[#a1a1aa]'}`}>
                NF-e • NFC-e • CT-e • NFS-e
              </span>
            </div>

            {/* Icon */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-5 group-hover:shadow-xl group-hover:shadow-blue-500/30 group-hover:scale-105 transition-all duration-300">
              <FileText className="w-7 h-7" strokeWidth={2.2} />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
              </div>
            </div>

            <h3 className={`relative text-xl font-black tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              NF View
              <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white align-middle">DANFE A4</span>
            </h3>
            <p className={`relative mt-2 text-sm leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              Visualize, converta e organize seus XMLs fiscais em <b className={isLight ? 'text-[#0f172a]' : 'text-white'}>DANFE padrão SEFAZ</b>. Workspace com pastas, busca e impressão em lote.
            </p>

            {/* Features mini */}
            <div className="relative mt-4 flex flex-wrap gap-1.5">
              {[
                { icon: Layers, label: 'Workspaces' },
                { icon: Shield, label: 'Offline-first' },
                { icon: Clock, label: 'Impressão A4' },
              ].map((f) => (
                <span
                  key={f.label}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569]' : 'bg-white/[0.04] border-white/10 text-[#d4d4d8]'}`}
                >
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="relative mt-6 flex items-center gap-2 text-sm font-bold text-blue-600 group-hover:text-blue-500 transition-colors">
              <span>Abrir NF View</span>
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:translate-x-1 group-hover:bg-blue-500 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className={`ml-auto text-xs font-medium ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>
                {docCount > 0 ? `${docCount} docs prontos` : 'Começar agora →'}
              </span>
            </div>
          </div>
        </motion.button>

        {/* Card Depreciação - Novo */}
        <motion.button
          onClick={onOpenDepreciation}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: 'easeOut' }}
          whileHover={{ y: -6, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="group text-left relative overflow-hidden rounded-[24px] p-[1px] cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)',
          }}
        >
          <div className={`relative h-full rounded-[23px] p-6 md:p-7 flex flex-col overflow-hidden transition-colors ${isLight ? 'bg-white' : 'bg-[#0f1412]'}`}>
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-center justify-between mb-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-widest uppercase shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Disponível
              </span>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${isLight ? 'bg-[#f0fdf4] border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                Ativo • CSV • Auditoria
              </span>
            </div>

            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 mb-5 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
              <TrendingDown className="w-7 h-7" strokeWidth={2.2} />
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            <h3 className={`relative text-xl font-black tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Depreciação
              <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white align-middle">NOVO</span>
            </h3>
            <p className={`relative mt-2 text-sm leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              Controle patrimonial completo: <b className={isLight ? 'text-[#0f172a]' : 'text-white'}>cálculo em centavos</b>, proporcional por dias, histórico e <b className={isLight ? 'text-[#0f172a]' : 'text-white'}>CSV contábil</b> sem duplicidade.
            </p>

            <div className="relative mt-4 flex flex-wrap gap-1.5">
              {[
                { icon: Building2, label: `${companyCount || 0} empresas` },
                { icon: Package, label: `${assetCount || 0} bens` },
                { icon: Layers, label: 'Proporcional' },
              ].map((f) => (
                <span key={f.label} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${isLight ? 'bg-[#f0fdf4] border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </span>
              ))}
            </div>

            <div className="relative mt-6 flex items-center gap-2 text-sm font-bold text-emerald-600 group-hover:text-emerald-500 transition-colors">
              <span>Abrir Depreciação</span>
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:translate-x-1 group-hover:bg-emerald-500 transition-all">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className={`ml-auto text-xs font-medium ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}>Controle mensal →</span>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className={`relative z-10 mt-10 flex flex-col items-center gap-2 text-xs ${isLight ? 'text-[#94a3b8]' : 'text-[#71717a]'}`}
      >
        <div className="flex items-center gap-2">
          <span>Desenvolvido por</span>
          <span className={`font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Café — Sistemas & Softwares</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${isLight ? 'bg-white border-[#e2e8f0] text-[#475569]' : 'bg-white/5 border-white/10 text-[#a1a1aa]'}`}>v2.5</span>
        </div>
        <div className={`text-[11px] ${isLight ? 'text-[#cbd5e1]' : 'text-[#52525b]'}`}>
          Dica: use <b>Ctrl+K</b> para busca rápida • Arraste XMLs para importar
        </div>
      </motion.div>
    </div>
    </>
  );
}
