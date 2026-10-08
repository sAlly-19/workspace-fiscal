import { HardDrive, RefreshCw } from 'lucide-react';
import type { DatabaseStats, BackupModule } from '../../../../api/services/backup.service';

export interface BackupCreateSectionProps {
  isLight: boolean;
  selectedModules: BackupModule[];
  toggleCreateModule: (mod: BackupModule) => void;
  stats: DatabaseStats | null;
  creatingBackup: boolean;
  onCreateBackup: () => void;
}

export function BackupCreateSection({
  isLight,
  selectedModules,
  toggleCreateModule,
  stats,
  creatingBackup,
  onCreateBackup,
}: BackupCreateSectionProps) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
        <HardDrive className="w-4 h-4 text-cyan-400" />
        <span>Criar Backup Estruturado (.wfb)</span>
      </div>

      <div
        className={`space-y-4 rounded-xl p-4 border ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
        }`}
      >
        <p className={`text-[11px] leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
          Selecione quais módulos do Workspace Fiscal você deseja incluir no arquivo de backup portátil:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* NF View Card */}
          <label
            onClick={() => toggleCreateModule('NF_VIEW')}
            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              selectedModules.includes('NF_VIEW')
                ? 'border-blue-500 bg-blue-500/10'
                : isLight
                  ? 'border-[#cbd5e1] bg-white opacity-60'
                  : 'border-[#27272a] bg-[#18181b] opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>NF View</span>
                <input
                  type="checkbox"
                  checked={selectedModules.includes('NF_VIEW')}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <p className={`text-[11px] mt-1.5 leading-relaxed ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Documentos fiscais, produtos, tributos, eventos/CC-e, pastas e os arquivos XML físicos.
              </p>
            </div>
            <div className={`text-[10px] font-mono mt-2 pt-2 border-t border-white/10 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              {stats ? `${stats.nfView.documents} docs · ${stats.nfView.storageXmlFiles} XMLs` : 'Calculando...'}
            </div>
          </label>

          {/* Depreciação Card */}
          <label
            onClick={() => toggleCreateModule('DEPRECIATION')}
            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              selectedModules.includes('DEPRECIATION')
                ? 'border-blue-500 bg-blue-500/10'
                : isLight
                  ? 'border-[#cbd5e1] bg-white opacity-60'
                  : 'border-[#27272a] bg-[#18181b] opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Depreciação</span>
                <input
                  type="checkbox"
                  checked={selectedModules.includes('DEPRECIATION')}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <p className={`text-[11px] mt-1.5 leading-relaxed ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Empresas, categorias de bens, patrimônio imobilizado, lançamentos mensais e exportações.
              </p>
            </div>
            <div className={`text-[10px] font-mono mt-2 pt-2 border-t border-white/10 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              {stats ? `${stats.depreciation.assets} bens · ${stats.depreciation.companies} empresas` : 'Calculando...'}
            </div>
          </label>

          {/* Configurações Card */}
          <label
            onClick={() => toggleCreateModule('SETTINGS')}
            className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              selectedModules.includes('SETTINGS')
                ? 'border-blue-500 bg-blue-500/10'
                : isLight
                  ? 'border-[#cbd5e1] bg-white opacity-60'
                  : 'border-[#27272a] bg-[#18181b] opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Configurações</span>
                <input
                  type="checkbox"
                  checked={selectedModules.includes('SETTINGS')}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <p className={`text-[11px] mt-1.5 leading-relaxed ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
                Preferências globais, parâmetros de deduplicação e rotinas de backup.
              </p>
            </div>
            <div className={`text-[10px] font-mono mt-2 pt-2 border-t border-white/10 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              {stats ? `${stats.settings.count} parâmetros globais` : 'Calculando...'}
            </div>
          </label>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            {selectedModules.length} módulo(s) selecionado(s) para exportação
          </div>

          <button
            type="button"
            onClick={onCreateBackup}
            disabled={creatingBackup || selectedModules.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {creatingBackup ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Compactando Backup...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5" />
                <span>Criar Backup Agora</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

