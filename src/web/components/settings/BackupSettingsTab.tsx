import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Clock,
  Layers,
  FileCheck,
  ShieldCheck,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { toast } from '../Toast';
import { ConfirmModal } from '../ConfirmModal';
import { DatabaseStats, BackupModule, BackupInspectionResult } from '../../../api/services/backup.service';

interface BackupConfig {
  enabled: boolean;
  intervalDays: number;
  retentionCount: number;
  destination: string;
}

interface BackupFile {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  isWfb?: boolean;
}

interface BackupSettingsTabProps {
  isLight: boolean;
}

export function BackupSettingsTab({ isLight }: BackupSettingsTabProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Backup configuration & list
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Create backup state
  const [selectedModules, setSelectedModules] = useState<BackupModule[]>([
    'NF_VIEW',
    'DEPRECIATION',
    'SETTINGS',
  ]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Restore state
  const [selectedRestorePath, setSelectedRestorePath] = useState<string | null>(null);
  const [inspection, setInspection] = useState<BackupInspectionResult | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [modulesToRestore, setModulesToRestore] = useState<BackupModule[]>([
    'NF_VIEW',
    'DEPRECIATION',
    'SETTINGS',
  ]);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await apiFetch('/api/backup/stats');
      if (res.ok) setStats(await res.json());
    } catch {}
    finally {
      setLoadingStats(false);
    }
  };

  const fetchConfigAndList = async () => {
    try {
      setLoadingConfig(true);
      const [cfgRes, listRes] = await Promise.all([
        apiFetch('/api/backup/settings'),
        apiFetch('/api/backup/list'),
      ]);
      if (cfgRes.ok) setBackupConfig(await cfgRes.json());
      if (listRes.ok) setBackupList(await listRes.json());
    } catch {}
    finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchConfigAndList();
  }, []);

  const saveConfig = async (partial: Partial<BackupConfig>) => {
    try {
      const res = await apiFetch('/api/backup/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (res.ok) {
        const updated = await res.json();
        setBackupConfig(updated);
        toast.success('Configurações salvas', 'Preferências de backup automático atualizadas.');
      }
    } catch (e: any) {
      toast.error('Erro ao salvar', e.message);
    }
  };

  const toggleCreateModule = (mod: BackupModule) => {
    if (selectedModules.includes(mod)) {
      if (selectedModules.length === 1) {
        toast.info('Seleção obrigatória', 'Você deve selecionar pelo menos um módulo para criar o backup.');
        return;
      }
      setSelectedModules(selectedModules.filter((m) => m !== mod));
    } else {
      setSelectedModules([...selectedModules, mod]);
    }
  };

  const handleCreateBackup = async () => {
    if (selectedModules.length === 0) {
      toast.info('Selecione os módulos', 'Escolha pelo menos um módulo.');
      return;
    }

    let chosenDestination: string | undefined = undefined;

    // Se estiver no Electron, permite escolher onde salvar o arquivo .wfb
    if (typeof window !== 'undefined' && window.api?.saveFileDialog) {
      const stamp = new Date().toISOString().slice(0, 10);
      const saveRes = await window.api.saveFileDialog({
        defaultPath: `workspace-fiscal-backup-${stamp}.wfb`,
        filters: [
          { name: 'Workspace Fiscal Backup (*.wfb)', extensions: ['wfb'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] },
        ],
      });
      if (saveRes.canceled || !saveRes.filePath) return;
      chosenDestination = saveRes.filePath;
    }

    setCreatingBackup(true);
    try {
      const res = await apiFetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: selectedModules,
          destination: chosenDestination,
        }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Falha ao criar arquivo de backup');
      }

      const data = await res.json();
      toast.success(
        'Backup criado com sucesso',
        `${data.filename} (${(data.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`
      );
      fetchConfigAndList();
    } catch (e: any) {
      toast.error('Erro ao criar backup', e.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleSelectRestoreFile = async () => {
    let filePath: string | null = null;
    if (typeof window !== 'undefined' && window.api?.openBackupDialog) {
      const openRes = await window.api.openBackupDialog();
      if (openRes.canceled || !openRes.filePath) return;
      filePath = openRes.filePath;
    }

    if (!filePath) return;

    setSelectedRestorePath(filePath);
    setInspecting(true);
    setInspection(null);

    try {
      const res = await apiFetch('/api/backup/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      const inspectData: BackupInspectionResult = await res.json();
      if (!res.ok || !inspectData.valid) {
        throw new Error(inspectData.error || 'Arquivo selecionado não é um backup válido.');
      }

      setInspection(inspectData);
      if (inspectData.modules && Array.isArray(inspectData.modules)) {
        if (inspectData.isLegacy) {
          setModulesToRestore(['NF_VIEW', 'DEPRECIATION', 'SETTINGS']);
        } else {
          setModulesToRestore(inspectData.modules.filter((m) => m !== 'FULL_DATABASE') as BackupModule[]);
        }
      }
      toast.success('Arquivo inspecionado', 'Backup analisado e pronto para restauração.');
    } catch (e: any) {
      setInspection(null);
      setSelectedRestorePath(null);
      toast.error('Backup inválido', e.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedRestorePath || !inspection) return;
    setShowRestoreConfirm(false);
    setRestoring(true);
    setRestoreStatus('Criando backup de emergência dos dados atuais...');

    try {
      setRestoreStatus('Restaurando dados com verificação de integridade...');
      const res = await apiFetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedRestorePath,
          modules: modulesToRestore,
        }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Erro durante a restauração.');
      }

      const result = await res.json();
      toast.success(
        'Restauração concluída!',
        `Dados restaurados. Backup de segurança salvo em: ${result.safetyBackupFile}`
      );

      // Limpa formulário e atualiza dados
      setInspection(null);
      setSelectedRestorePath(null);
      fetchStats();
      fetchConfigAndList();
    } catch (e: any) {
      toast.error('Falha na restauração', e.message);
    } finally {
      setRestoring(false);
      setRestoreStatus('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Criar Backup Estruturado */}
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
              onClick={handleCreateBackup}
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

      {/* 2. Restaurar Backup Seguro */}
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
              onClick={handleSelectRestoreFile}
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
                  onClick={() => setShowRestoreConfirm(true)}
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

      {/* 3. Rotina de Backup Automático */}
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

      <ConfirmModal
        isOpen={showRestoreConfirm}
        title="Confirmar Restauração Segura?"
        description="Os dados dos módulos selecionados serão substituídos pelo conteúdo deste backup. Um backup de segurança do estado atual será criado automaticamente antes de iniciar."
        confirmLabel="Sim, Restaurar Dados"
        confirmVariant="danger"
        isLoading={restoring}
        onConfirm={handleExecuteRestore}
        onCancel={() => setShowRestoreConfirm(false)}
      />
    </div>
  );
}

