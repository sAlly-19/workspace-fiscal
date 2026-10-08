import {
  Search,
  RefreshCw,
  ClipboardList,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActivityLogItem,
  formatLogDate,
  getLevelBadge,
  getModuleBadgeColor,
} from './activityLogFormatters';

export interface ActivityLogsListProps {
  isLight: boolean;
  loading: boolean;
  logs: ActivityLogItem[];
  totalCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  selectedModule: string;
  setSelectedModule: (module: string) => void;
  selectedLog: ActivityLogItem | null;
  onSelectLog: (log: ActivityLogItem | null) => void;
}

export function ActivityLogsList({
  isLight,
  loading,
  logs,
  totalCount,
  searchTerm,
  setSearchTerm,
  selectedLevel,
  setSelectedLevel,
  selectedModule,
  setSelectedModule,
  selectedLog,
  onSelectLog,
}: ActivityLogsListProps) {
  return (
    <>
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
                  onClick={() => onSelectLog(isSelected ? null : log)}
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
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getModuleBadgeColor(log.module, isLight)}`}>
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
    </>
  );
}

