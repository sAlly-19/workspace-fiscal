import { useState, useEffect, useCallback } from 'react';
import { toast } from '../Toast';
import { ConfirmModal } from '../ConfirmModal';
import {
  ActivityLogsHeader,
  ActivityLogsList,
  ActivityLogDetailPane,
  type ActivityLogItem,
  type ActivityLogStats,
} from './activity-logs';

export type { ActivityLogItem, ActivityLogStats };

interface ActivityLogsTabProps {
  isLight: boolean;
}

export function ActivityLogsTab({ isLight }: ActivityLogsTabProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [stats, setStats] = useState<ActivityLogStats>({
    total: 0,
    successCount: 0,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');

  // Painel de Detalhes
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Modal e configuração de Limpeza
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearingDays, setClearingDays] = useState<number>(60);
  const [isClearing, setIsClearing] = useState(false);

  // Carrega dados da API do Electron
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (window.fiscalApi?.logs) {
        const [listRes, statsRes] = await Promise.all([
          window.fiscalApi.logs.list({
            search: searchTerm.trim() || undefined,
            level: selectedLevel !== 'ALL' ? (selectedLevel as any) : undefined,
            module: selectedModule !== 'ALL' ? (selectedModule as any) : undefined,
            limit: 200,
          }),
          window.fiscalApi.logs.getStats(),
        ]);

        setLogs(listRes.logs || []);
        setTotalCount(listRes.total || 0);
        setStats(
          statsRes || {
            total: 0,
            successCount: 0,
            errorCount: 0,
            warnCount: 0,
            infoCount: 0,
          }
        );
      } else {
        // Fallback para preview ou mock web
        setLogs([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Erro ao carregar registros de atividade:', err);
      toast.error('Erro ao carregar logs', err.message || 'Falha ao consultar banco SQLite.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedLevel, selectedModule]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exportar CSV
  const handleExportCsv = async () => {
    try {
      if (!window.fiscalApi?.logs) {
        toast.error('Indisponível', 'Exportação de logs disponível apenas no aplicativo Electron.');
        return;
      }
      const csv = await window.fiscalApi.logs.exportCsv({
        search: searchTerm.trim() || undefined,
        level: selectedLevel !== 'ALL' ? (selectedLevel as any) : undefined,
        module: selectedModule !== 'ALL' ? (selectedModule as any) : undefined,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `registros_atividade_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Logs exportados', 'Relatório CSV de registros gerado com sucesso.');
    } catch (err: any) {
      toast.error('Falha ao exportar', err.message);
    }
  };

  // Limpeza de logs antigos
  const handleClearConfirm = async () => {
    try {
      setIsClearing(true);
      if (!window.fiscalApi?.logs) return;
      const count = await window.fiscalApi.logs.clearOld(clearingDays);
      setIsClearModalOpen(false);
      toast.success('Limpeza concluída', `${count} registros de atividade com mais de ${clearingDays} dias foram removidos.`);
      loadData();
    } catch (err: any) {
      toast.error('Falha na limpeza', err.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Copiar JSON
  const handleCopyJson = (details: any) => {
    try {
      const text = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado', 'Detalhes JSON copiados para a área de transferência.');
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      toast.error('Erro ao copiar', e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Ações Globais & Cards de Métricas */}
      <ActivityLogsHeader
        isLight={isLight}
        loading={loading}
        stats={stats}
        clearingDays={clearingDays}
        setClearingDays={setClearingDays}
        onReload={loadData}
        onExportCsv={handleExportCsv}
        onOpenClearModal={() => setIsClearModalOpen(true)}
      />

      {/* Barra de Filtros, Busca e Lista de Registros */}
      <ActivityLogsList
        isLight={isLight}
        loading={loading}
        logs={logs}
        totalCount={totalCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        selectedModule={selectedModule}
        setSelectedModule={setSelectedModule}
        selectedLog={selectedLog}
        onSelectLog={setSelectedLog}
      />

      {/* Painel Expansível de Detalhes Técnicos JSON */}
      {selectedLog && (
        <ActivityLogDetailPane
          isLight={isLight}
          selectedLog={selectedLog}
          copied={copied}
          onCopyJson={handleCopyJson}
          onClose={() => setSelectedLog(null)}
        />
      )}

      {/* Modal de Limpeza de Logs */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Limpar Registros Antigos de Atividade"
        description={`Deseja expurgar permanentemente do banco SQLite todos os registros de auditoria com mais de ${clearingDays} dias? Eventos recentes continuarão preservados para consulta.`}
        confirmLabel={isClearing ? 'Limpando...' : `Limpar (> ${clearingDays} dias)`}
        confirmVariant="danger"
        isLoading={isClearing}
        onConfirm={handleClearConfirm}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
}

export default ActivityLogsTab;
