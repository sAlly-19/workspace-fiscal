import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { toast } from '../Toast';
import { ConfirmModal } from '../ConfirmModal';
import type { DatabaseStats, BackupModule, BackupInspectionResult } from '../../../api/services/backup.service';
import {
  BackupCreateSection,
  BackupRestoreSection,
  BackupAutoScheduleSection,
  type BackupConfig,
  type BackupFile,
} from './backup';

interface BackupSettingsTabProps {
  isLight: boolean;
}

export function BackupSettingsTab({ isLight }: BackupSettingsTabProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [, setLoadingStats] = useState(false);

  // Backup configuration & list
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [backupList, setBackupList] = useState<BackupFile[]>([]);
  const [, setLoadingConfig] = useState(false);

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
      <BackupCreateSection
        isLight={isLight}
        selectedModules={selectedModules}
        toggleCreateModule={toggleCreateModule}
        stats={stats}
        creatingBackup={creatingBackup}
        onCreateBackup={handleCreateBackup}
      />

      {/* 2. Restaurar Backup Seguro */}
      <BackupRestoreSection
        isLight={isLight}
        inspecting={inspecting}
        restoring={restoring}
        restoreStatus={restoreStatus}
        selectedRestorePath={selectedRestorePath}
        inspection={inspection}
        modulesToRestore={modulesToRestore}
        setModulesToRestore={setModulesToRestore}
        onSelectRestoreFile={handleSelectRestoreFile}
        onRequestRestoreConfirm={() => setShowRestoreConfirm(true)}
      />

      {/* 3. Rotina de Backup Automático */}
      <BackupAutoScheduleSection
        isLight={isLight}
        backupConfig={backupConfig}
        backupList={backupList}
        setBackupConfig={setBackupConfig}
        saveConfig={saveConfig}
      />

      {/* Modal de Confirmação de Restauração */}
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
