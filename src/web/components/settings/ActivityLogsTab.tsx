import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { toast } from '../Toast';
import { ConfirmModal } from '../ConfirmModal';

export interface ActivityLogItem {
  id: string;
  timestamp: string | Date;
  level: 'SUCCESS' | 'ERROR' | 'WARN' | 'INFO';
  module: 'BUSCADOR' | 'NFVIEW' | 'DEPRECIATION' | 'BACKUP' | 'CERTIFICATES' | 'COMPANIES' | 'SYSTEM';
  action: string;
  message: string;
  details?: any;
  durationMs?: number | null;
  createdAt?: string | Date;
}

export interface ActivityLogStats {
  total: number;
  successCount: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
}

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

  // Formatação de data/hora
  const formatLogDate = (val: string | Date | undefined) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(val);
    }
  };

  // Badges e Estilos
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          label: 'Sucesso',
        };
      case 'ERROR':
        return {
          icon: AlertCircle,
          color: 'text-red-400 bg-red-500/10 border-red-500/30',
          label: 'Erro',
        };
      case 'WARN':
        return {
          icon: AlertTriangle,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          label: 'Aviso',
        };
      default:
        return {
          icon: Info,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          label: 'Info',
        };
    }
  };

  const getModuleBadgeColor = (module: string) => {
    switch (module) {
      case 'BUSCADOR':
        return isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'NFVIEW':
        return isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'DEPRECIATION':
        return isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'BACKUP':
        return isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'CERTIFICATES':
        return isLight ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'COMPANIES':
        return isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Ações Globais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Auditoria de Eventos e Registros
            </h4>
          </div>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Histórico completo de sincronizações, consultas SEFAZ/NFS-e, backups, exclusões e rotinas do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            title="Atualizar lista de registros"
            className={`p-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span className="hidden sm:inline">Recarregar</span>
          </button>

          <button
            onClick={handleExportCsv}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 shadow-xs'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar CSV</span>
          </button>

          <div className="flex items-center gap-1">
            <select
              value={clearingDays}
              onChange={(e) => setClearingDays(Number(e.target.value))}
              title="Período de retenção para limpeza"
              className={`px-2 py-1.5 rounded-lg border text-xs font-medium focus:outline-none cursor-pointer ${
                isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
            >
              <option value={15}>&gt; 15 dias</option>
              <option value={30}>&gt; 30 dias</option>
              <option value={60}>&gt; 60 dias</option>
              <option value={90}>&gt; 90 dias</option>
            </select>

            <button
              onClick={() => setIsClearModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Antigos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Total Registros
            </span>
            <div className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {stats.total.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ClipboardList className="w-4 h-4" />
          </div>
        </div>

        {/* Sucessos */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Sucessos
            </span>
            <div className="text-base font-black text-emerald-400">
              {stats.successCount.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Falhas / Erros */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-red-50/50 border-red-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
              Falhas / Erros
            </span>
            <div className="text-base font-black text-red-400">
              {stats.errorCount.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Avisos */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-zinc-900/80 border-zinc-800'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Avisos
            </span>
            <div className="text-base font-black text-amber-400">
              {stats.warnCount.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        className={`p-3 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
        }`}
      >
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por mensagem, ação, CNPJ ou módulo..."
            className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                : 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nível */}
          <div className="flex items-center gap-1 text-xs">
            {(['ALL', 'SUCCESS', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => {
              const isSelected = selectedLevel === lvl;
              const labelMap: Record<string, string> = {
                ALL: 'Todos',
                SUCCESS: 'Sucesso',
                ERROR: 'Erro',
                WARN: 'Aviso',
                INFO: 'Info',
              };
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-200/60 bg-white border border-slate-200'
                      : 'text-zinc-400 hover:text-white bg-zinc-800/80 border border-zinc-700/60'
                  }`}
                >
                  {labelMap[lvl]}
                </button>
              );
            })}
          </div>

          {/* Módulo */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border focus:outline-none cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-zinc-800 border-zinc-700 text-zinc-200'
            }`}
          >
            <option value="ALL">Todos os Módulos</option>
            <option value="BUSCADOR">Buscador NF</option>
            <option value="NFVIEW">NF View</option>
            <option value="DEPRECIATION">Depreciação</option>
            <option value="BACKUP">Backup & Restauração</option>
            <option value="CERTIFICATES">Certificados Digitais</option>
            <option value="COMPANIES">Cadastro Empresas</option>
            <option value="SYSTEM">Sistema</option>
          </select>
        </div>
      </div>

      {/* Lista de Registros */}
      <div
        className={`rounded-xl border overflow-hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Carregando registros de atividade...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
              <ClipboardList className="w-6 h-6 opacity-40 text-muted-foreground" />
              <span className="font-semibold">Nenhum registro encontrado</span>
              <span className="text-[11px] opacity-75">
                {searchTerm || selectedLevel !== 'ALL' || selectedModule !== 'ALL'
                  ? 'Tente ajustar os filtros acima para expandir os resultados.'
                  : 'Eventos de sincronização, backup e ações do sistema aparecerão aqui automaticamente.'}
              </span>
            </div>
          ) : (
            logs.map((log) => {
              const badge = getLevelBadge(log.level);
              const LevelIcon = badge.icon;
              const isSelected = selectedLog?.id === log.id;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(isSelected ? null : log)}
                  className={`p-3 flex items-start justify-between gap-3 transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                        : 'bg-blue-950/30 border-l-4 border-l-blue-500'
                      : isLight
                      ? 'hover:bg-slate-50'
                      : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badge.color}`}>
                      <LevelIcon className="w-3 h-3" />
                      {badge.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getModuleBadgeColor(log.module)}`}>
                          {log.module}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-blue-500">
                          {log.action}
                        </span>
                        {log.durationMs != null && (
                          <span className={`text-[10px] font-mono flex items-center gap-0.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {log.durationMs}ms
                          </span>
                        )}
                      </div>

                      <p className={`text-xs font-medium leading-relaxed truncate ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                        {log.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono whitespace-nowrap ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                      {formatLogDate(log.timestamp)}
                    </span>
                    <button
                      type="button"
                      className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground ${isSelected ? 'text-blue-500' : ''}`}
                    >
                      {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé da tabela com contador */}
        <div
          className={`px-3 py-2 border-t flex items-center justify-between text-[11px] ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
          }`}
        >
          <span>
            Exibindo <strong>{logs.length}</strong> de <strong>{totalCount}</strong> eventos
          </span>
          <span className="text-[10px] font-mono opacity-75">
            SQLite Database · Retenção automática configurada
          </span>
        </div>
      </div>

      {/* Painel Expansível de Detalhes Técnicos JSON */}
      {selectedLog && (
        <div
          className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-150 ${
            isLight
              ? 'bg-slate-50 border-blue-200 text-slate-900 shadow-sm'
              : 'bg-zinc-950 border-blue-500/30 text-white shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2 border-border/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400">
                DETALHES DO EVENTO · {selectedLog.action}
              </span>
              <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                {formatLogDate(selectedLog.timestamp)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedLog.details && (
                <button
                  onClick={() => handleCopyJson(selectedLog.details)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold border flex items-center gap-1 transition cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5"
              >
                ✕ Fechar
              </button>
            </div>
          </div>

          <div className="text-xs space-y-1">
            <div className="font-medium text-slate-700 dark:text-zinc-300">
              {selectedLog.message}
            </div>

            {selectedLog.details ? (
              <pre className="p-3 rounded-lg bg-black/85 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed border border-zinc-800 select-text">
                {typeof selectedLog.details === 'string'
                  ? selectedLog.details
                  : JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            ) : (
              <div className="text-[11px] italic text-muted-foreground pt-1">
                Nenhum detalhe adicional registrado para este evento.
              </div>
            )}
          </div>
        </div>
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
