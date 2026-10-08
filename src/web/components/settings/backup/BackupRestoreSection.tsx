import React from 'react';
import {
  Upload,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import type { BackupInspectionResult, BackupModule } from '../../../../api/services/backup.service';

export interface BackupRestoreSectionProps {
  isLight: boolean;
  inspecting: boolean;
  restoring: boolean;
  restoreStatus: string;
  selectedRestorePath: string | null;
  inspection: BackupInspectionResult | null;
  modulesToRestore: BackupModule[];
  setModulesToRestore: React.Dispatch<React.SetStateAction<BackupModule[]>>;
  onSelectRestoreFile: () => void;
  onRequestRestoreConfirm: () => void;
}

export function BackupRestoreSection({
  isLight,
  inspecting,
  restoring,
  restoreStatus,
  selectedRestorePath,
  inspection,
  modulesToRestore,
  setModulesToRestore,
  onSelectRestoreFile,
  onRequestRestoreConfirm,
}: BackupRestoreSectionProps) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
        <Upload className="w-4 h-4 text-emerald-400" />
        <span>Restaurar Backup</span>
      </div>

      <div
        className={`space-y-4 rounded-xl p-4 border ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Restaurar a partir de arquivo (.wfb ou .db legado)
            </div>
            <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
              Selecione o arquivo de backup para inspecionar seu conteúdo antes de confirmar a restauração.
            </p>
          </div>

          <button
            type="button"
            onClick={onSelectRestoreFile}
            disabled={inspecting || restoring}
            className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              isLight
                ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#334155]'
                : 'bg-[#18181b] hover:bg-[#27272a] border-[#3f3f46] text-[#e4e4e7]'
            }`}
          >
            {inspecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
            )}
            <span>{inspecting ? 'Inspecionando...' : 'Selecionar Arquivo'}</span>
          </button>
        </div>

        {/* Dados do Backup Inspecionado */}
        {inspection && (
          <div className={`p-4 rounded-xl border space-y-3 ${isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-blue-500/5 border-blue-500/20'}`}>
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className={`font-bold text-xs ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  {inspection.isLegacy ? 'Backup Legado SQLite Reconhecido' : 'Backup Workspace Fiscal (.wfb) Válido'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                App v{inspection.appVersion}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Criado em:</span>{' '}
                <strong className="font-mono">{inspection.createdAt ? new Date(inspection.createdAt).toLocaleString('pt-BR') : '—'}</strong>
              </div>
              <div>
                <span className={isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}>Arquivo:</span>{' '}
                <span className="font-mono truncate" title={selectedRestorePath || ''}>{selectedRestorePath ? selectedRestorePath.split(/[\\/]/).pop() : '—'}</span>
              </div>
            </div>

            {/* Módulos para restaurar */}
            {!inspection.isLegacy ? (
              <div className="pt-2 border-t border-blue-500/20">
                <span className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
                  Escolha os módulos a restaurar deste backup:
                </span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {inspection.modules?.map((mod) => (
                    <label
                      key={mod}
                      onClick={() => {
                        if (modulesToRestore.includes(mod as any)) {
                          if (modulesToRestore.length > 1) {
                            setModulesToRestore(modulesToRestore.filter((m) => m !== mod));
                          }
                        } else {
                          setModulesToRestore([...modulesToRestore, mod as any]);
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer ${
                        modulesToRestore.includes(mod as any)
                          ? 'border-blue-500 bg-blue-500/15'
                          : 'border-white/10 opacity-50'
                      }`}
                    >
                      <span className="font-bold">
                        {mod === 'NF_VIEW' ? 'NF View' : mod === 'DEPRECIATION' ? 'Depreciação' : 'Configurações'}
                      </span>
                      <input
                        type="checkbox"
                        checked={modulesToRestore.includes(mod as any)}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className={`text-[11px] italic ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                Este arquivo é um banco SQLite completo de versão anterior. A restauração substituirá integralmente a base de dados.
              </p>
            )}

            {/* Aviso de segurança */}
            <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Proteção garantida:</strong> Um backup de segurança do estado atual do seu sistema será criado automaticamente antes de aplicar as alterações. Se qualquer inconsistência for detectada, as alterações serão canceladas imediatamente sem perda de dados.
              </div>
            </div>

            {/* Botão de restauração */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onRequestRestoreConfirm}
                disabled={restoring}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar Dados Selecionados</span>
              </button>
            </div>
          </div>
        )}

        {restoring && (
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'}`}>
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            <div className="text-xs font-semibold text-blue-500">
              {restoreStatus || 'Restaurando dados com segurança... Não feche o aplicativo.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

