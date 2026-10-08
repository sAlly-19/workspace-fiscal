import React from 'react';
import { Clock } from 'lucide-react';

export interface BackupConfig {
  enabled: boolean;
  intervalDays: number;
  retentionCount: number;
  destination: string;
}

export interface BackupFile {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  isWfb?: boolean;
}

export interface BackupAutoScheduleSectionProps {
  isLight: boolean;
  backupConfig: BackupConfig | null;
  backupList: BackupFile[];
  setBackupConfig: React.Dispatch<React.SetStateAction<BackupConfig | null>>;
  saveConfig: (partial: Partial<BackupConfig>) => Promise<void>;
}

export function BackupAutoScheduleSection({
  isLight,
  backupConfig,
  backupList,
  setBackupConfig,
  saveConfig,
}: BackupAutoScheduleSectionProps) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
        <Clock className="w-4 h-4 text-purple-400" />
        <span>Rotina de Backup Automático</span>
      </div>

      <div
        className={`rounded-xl p-4 space-y-3 border ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
        }`}
      >
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className={`font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Backup automático habilitado</div>
            <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
              Gera uma cópia de segurança periódica na abertura do aplicativo
            </div>
          </div>
          <input
            type="checkbox"
            checked={!!backupConfig?.enabled}
            onChange={(e) => saveConfig({ enabled: e.target.checked })}
            disabled={!backupConfig}
            className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
          <div>
            <label className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              Intervalo (dias)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={backupConfig?.intervalDays ?? 7}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 1) setBackupConfig((c) => (c ? { ...c, intervalDays: v } : c));
              }}
              onBlur={() => backupConfig && saveConfig({ intervalDays: backupConfig.intervalDays })}
              className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-md border outline-none ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a] focus:border-blue-500' : 'bg-[#18181b] border-[#3f3f46] text-white focus:border-blue-500'
              }`}
            />
          </div>
          <div>
            <label className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
              Retenção (máximo de backups mantidos)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={backupConfig?.retentionCount ?? 30}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 1) setBackupConfig((c) => (c ? { ...c, retentionCount: v } : c));
              }}
              onBlur={() => backupConfig && saveConfig({ retentionCount: backupConfig.retentionCount })}
              className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-md border outline-none ${
                isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a] focus:border-blue-500' : 'bg-[#18181b] border-[#3f3f46] text-white focus:border-blue-500'
              }`}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <label className={`text-[11px] font-semibold ${isLight ? 'text-[#475569]' : 'text-[#a1a1aa]'}`}>
            Pasta de Destino
          </label>
          <input
            type="text"
            value={backupConfig?.destination ?? ''}
            onChange={(e) => setBackupConfig((c) => (c ? { ...c, destination: e.target.value } : c))}
            onBlur={() => backupConfig && saveConfig({ destination: backupConfig.destination })}
            placeholder="/caminho/absoluto/para/backups"
            className={`w-full mt-1 px-2.5 py-1.5 text-xs rounded-md border outline-none font-mono ${
              isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a] focus:border-blue-500' : 'bg-[#18181b] border-[#3f3f46] text-white focus:border-blue-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            {backupList.length === 0 ? (
              'Nenhum backup automático salvo ainda.'
            ) : (
              <>
                <strong className="text-blue-400">{backupList.length}</strong> backup{backupList.length > 1 ? 's' : ''} salvos ·
                último: <span className="font-mono">{new Date(backupList[0].createdAt).toLocaleString('pt-BR')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

