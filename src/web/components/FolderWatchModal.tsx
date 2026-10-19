import React, { useState, useEffect, useRef } from 'react';
import { FolderSync, Folder, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';
import type { FolderNode } from '../stores/workspace.store';
import { toast } from './Toast';

export interface FolderWatchModalProps {
  isOpen: boolean;
  folder: FolderNode | null;
  currentTheme: string;
  onClose: () => void;
  onSave: (
    folderId: string,
    config: {
      watchPath: string | null;
      watchRecursive: boolean;
      watchMode: 'off' | 'auto' | 'prompt';
    }
  ) => Promise<void>;
}

export function FolderWatchModal({
  isOpen,
  folder,
  currentTheme,
  onClose,
  onSave,
}: FolderWatchModalProps) {
  const isLight = currentTheme === 'light';

  const [watchMode, setWatchMode] = useState<'off' | 'auto' | 'prompt'>('off');
  const [watchPath, setWatchPath] = useState('');
  const [watchRecursive, setWatchRecursive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pathInputRef = useRef<HTMLInputElement>(null);
  const hiddenDirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folder) {
      setWatchMode(folder.watchMode || 'off');
      setWatchPath(folder.watchPath || '');
      setWatchRecursive(Boolean(folder.watchRecursive));
      setErrorMessage(null);
    }
  }, [folder, isOpen]);

  if (!isOpen || !folder) return null;

  const handleSelectDirectory = async () => {
    const dialogTitle = `Selecionar pasta para monitorar em "${folder?.name || 'Workspace'}"`;

    try {
      // 1. Tenta fiscalApi.selectDirectory (novo handler nativo)
      if (typeof window !== 'undefined' && typeof window.fiscalApi?.selectDirectory === 'function') {
        try {
          const selected = await window.fiscalApi.selectDirectory({ title: dialogTitle });
          if (selected) {
            setWatchPath(selected);
            setErrorMessage(null);
          }
          return;
        } catch (err) {
          console.warn('[FolderWatchModal] fiscalApi.selectDirectory not available yet, trying fallback...', err);
        }
      }

      // 2. Fallback já ativo e garantido no processo Electron em execução: fiscalApi.settings.selectFolder
      if (typeof window !== 'undefined' && typeof window.fiscalApi?.settings?.selectFolder === 'function') {
        try {
          const selected = await window.fiscalApi.settings.selectFolder(dialogTitle);
          if (selected) {
            setWatchPath(selected);
            setErrorMessage(null);
          }
          return;
        } catch (err) {
          console.warn('[FolderWatchModal] fiscalApi.settings.selectFolder fallback failed', err);
        }
      }

      // 3. Fallback alternativo via window.api (openDirectory ou selectDirectory)
      if (typeof window !== 'undefined' && (window as any).api) {
        const api = (window as any).api;
        if (typeof api.selectDirectory === 'function') {
          try {
            const selected = await api.selectDirectory({ title: dialogTitle });
            if (selected) {
              setWatchPath(selected);
              setErrorMessage(null);
            }
            return;
          } catch {}
        }
        if (typeof api.openDirectory === 'function') {
          try {
            const res = await api.openDirectory({ recursive: false, maxFiles: 1 });
            if (res && !res.canceled && res.directory) {
              setWatchPath(res.directory);
              setErrorMessage(null);
            }
            return;
          } catch {}
        }
      }

      // 4. Se estiver em navegador Web (fora do Electron): aciona o seletor webkitdirectory nativo do SO
      if (hiddenDirInputRef.current) {
        hiddenDirInputRef.current.click();
        return;
      }

      // 5. Fallback final: foca o input com orientação amigável
      pathInputRef.current?.focus();
      toast.info(
        'Informe o caminho da pasta',
        'Digite ou cole o caminho absoluto da pasta no seu PC (ex: C:\\NotasFiscais\\XMLs).'
      );
    } catch (err: any) {
      console.error('Falha ao abrir seletor de diretório:', err);
      pathInputRef.current?.focus();
      toast.error('Erro ao abrir pasta', 'Digite o caminho da pasta diretamente no campo.');
    }
  };

  const handleSave = async () => {
    if (watchMode !== 'off' && !watchPath.trim()) {
      setErrorMessage('Informe o caminho da pasta no computador para ativar o monitoramento.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onSave(folder.id, {
        watchPath: watchMode === 'off' ? null : watchPath.trim(),
        watchRecursive,
        watchMode,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar configuração de monitoramento.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-[#18181b] border-zinc-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141418] border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Monitoramento de Pasta Local (Watch Folder)</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Pasta: <span className="font-semibold">{folder.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode Selection */}
          <div>
            <label className="block font-semibold mb-1.5 text-xs">Modo de Operação:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWatchMode('off')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  watchMode === 'off'
                    ? 'border-blue-500 bg-blue-500/10 font-semibold'
                    : isLight
                    ? 'border-slate-200 hover:bg-slate-50'
                    : 'border-zinc-800 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Desativado</span>
                  {watchMode === 'off' && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Nenhum diretório será observado nesta pasta.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWatchMode('auto')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  watchMode === 'auto'
                    ? 'border-emerald-500 bg-emerald-500/10 font-semibold'
                    : isLight
                    ? 'border-slate-200 hover:bg-slate-50'
                    : 'border-zinc-800 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-emerald-400">Automático</span>
                  {watchMode === 'auto' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Importa novos XMLs silenciosamente em segundo plano.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWatchMode('prompt')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  watchMode === 'prompt'
                    ? 'border-amber-500 bg-amber-500/10 font-semibold'
                    : isLight
                    ? 'border-slate-200 hover:bg-slate-50'
                    : 'border-zinc-800 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-400">Perguntar</span>
                  {watchMode === 'prompt' && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Avisa quando detectar novos XMLs e aguarda autorização.
                </p>
              </button>
            </div>
          </div>

          {/* Directory path */}
          {watchMode !== 'off' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block font-semibold mb-1 text-xs">Caminho da Pasta no PC:</label>
                {/* Hidden HTML5 folder picker fallback for web browsers */}
                <input
                  ref={hiddenDirInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is standard for folder inputs in HTML5
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const first = files[0] as any;
                      if (first.path && typeof first.path === 'string') {
                        const dir = first.path.replace(/[\\/][^\\/]+$/, '');
                        setWatchPath(dir);
                        setErrorMessage(null);
                        return;
                      }
                      if (first.webkitRelativePath) {
                        const rootDir = first.webkitRelativePath.split('/')[0];
                        setWatchPath(rootDir);
                        setErrorMessage(null);
                        toast.info(
                          'Pasta selecionada',
                          `Confirme ou ajuste o caminho completo do PC se necessário (ex: C:\\Notas\\${rootDir}).`
                        );
                        pathInputRef.current?.focus();
                      }
                    }
                  }}
                />
                <div className="flex gap-2">
                  <input
                    ref={pathInputRef}
                    type="text"
                    value={watchPath}
                    onChange={(e) => setWatchPath(e.target.value)}
                    placeholder="Ex: C:\NotasFiscais\Entradas ou /Users/.../XMLs"
                    className={`flex-1 px-3 py-2 rounded-xl text-xs outline-none border transition-colors ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-800'
                        : 'bg-[#111114] border-zinc-800 focus:border-blue-500 text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSelectDirectory}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    Procurar...
                  </button>
                </div>
              </div>

              {/* Recursive Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={watchRecursive}
                  onChange={(e) => setWatchRecursive(e.target.checked)}
                  className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className={`text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Monitorar subpastas recursivamente
                </span>
              </label>

              {/* Stability Note */}
              <div
                className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                  isLight
                    ? 'bg-blue-50/50 border-blue-200 text-blue-900'
                    : 'bg-blue-950/20 border-blue-900/40 text-blue-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <span>
                  O monitoramento é contínuo e funciona durante todo o tempo em que o aplicativo
                  estiver aberto, com proteção contra duplicatas e leitura segura de arquivos.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-end gap-2 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141418] border-zinc-800'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}

