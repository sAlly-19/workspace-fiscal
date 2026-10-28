import React, { useState, useEffect } from 'react';
import { X, Send, FolderOpen, FolderPlus, FileText, AlertTriangle, Plus, Check, Loader2 } from 'lucide-react';
import { FiscalDocument } from '@/core/buscador/domain/types';
import { DialogShell } from './ui/DialogShell';
import { useWorkspaceStore } from '@/web/stores/workspace.store';
import { FolderNode } from '@/web/stores/workspace/workspace.types';

export interface SendToNfViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: FiscalDocument[];
  onConfirmSend: (targetFolderId: string | null, targetFolderName: string, validDocs: FiscalDocument[]) => Promise<void>;
  isSending?: boolean;
}

export const SendToNfViewModal: React.FC<SendToNfViewModalProps> = ({
  isOpen,
  onClose,
  documents,
  onConfirmSend,
  isSending = false,
}) => {
  const { folders, fetchWorkspace, createFolder } = useWorkspaceStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string>('Sem Pasta (Raiz / Geral)');

  // Estado para criação inline de pasta
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Notas com XML válido disponível localmente
  const validDocs = documents.filter((d) => d.xml_status === 'XML_DISPONIVEL' && Boolean(d.xml_path));
  const skippedCount = documents.length - validDocs.length;

  useEffect(() => {
    if (isOpen) {
      fetchWorkspace().catch(() => {});
      setIsCreatingFolder(false);
      setNewFolderName('');
      setFolderError(null);
    }
  }, [isOpen, fetchWorkspace]);

  const getFlatFolders = (nodes: FolderNode[], depth = 0): { id: string; name: string; depth: number }[] => {
    let result: { id: string; name: string; depth: number }[] = [];
    for (const n of nodes) {
      result.push({ id: n.id, name: n.name, depth });
      if (n.children && n.children.length > 0) {
        result = result.concat(getFlatFolders(n.children, depth + 1));
      }
    }
    return result;
  };

  const handleCreateFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setFolderError('Digite um nome para a pasta.');
      return;
    }
    setIsSubmittingFolder(true);
    setFolderError(null);
    try {
      const created = await createFolder(trimmed, null);
      if (created) {
        setSelectedFolderId(created.id);
        setSelectedFolderName(created.name);
        setNewFolderName('');
        setIsCreatingFolder(false);
      } else {
        setFolderError('Não foi possível criar a pasta.');
      }
    } catch (err: any) {
      setFolderError(err?.message || 'Erro ao criar a pasta.');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  const handleConfirm = async () => {
    if (validDocs.length === 0 || isSending) return;
    await onConfirmSend(selectedFolderId, selectedFolderName, validDocs);
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onClose={isSending ? () => {} : onClose}
      titleId="send-to-nfview-title"
      size="md"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-header)] p-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500 border border-blue-500/30">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h2 id="send-to-nfview-title" className="text-sm font-bold text-[var(--text-primary)]">
              Enviar para o NF View
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              {validDocs.length === 1
                ? '1 documento pronto para ser importado'
                : `${validDocs.length} documentos prontos para importação`}
            </p>
          </div>
        </div>

        {!isSending && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Aviso de notas ignoradas por falta de XML */}
        {skippedCount > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-500">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-semibold">
                {skippedCount === 1
                  ? '1 documento não possui XML local'
                  : `${skippedCount} documentos não possuem XML local`}
              </span>
              : apenas notas cujo arquivo XML completo já foi baixado podem ser enviadas ao NF View.
            </div>
          </div>
        )}

        {/* Nenhuma nota com XML */}
        {validDocs.length === 0 ? (
          <div className="py-6 text-center text-[var(--text-muted)]">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-[var(--text-primary)]">Nenhum XML disponível para envio</p>
            <p className="text-[11px] mt-1">
              Baixe os XMLs das notas selecionadas antes de enviá-las ao NF View.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">
                Selecione a Pasta de Destino:
              </span>

              {/* Botão para abrir criação inline de pasta */}
              {!isCreatingFolder && (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-400 font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nova Pasta</span>
                </button>
              )}
            </div>

            {/* Formulário inline para Nova Pasta */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                className="p-2.5 rounded-xl border border-blue-500/40 bg-blue-500/5 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-[11px]">
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>Criar Nova Pasta no NF View</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nome da pasta (ex: Notas de Outubro)"
                    disabled={isSubmittingFolder}
                    autoFocus
                    className="flex-1 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingFolder || !newFolderName.trim()}
                    className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {isSubmittingFolder ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Criar</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                      setFolderError(null);
                    }}
                    disabled={isSubmittingFolder}
                    className="h-8 px-2.5 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
                {folderError && (
                  <p className="text-[10px] text-rose-500 font-medium">{folderError}</p>
                )}
              </form>
            )}

            {/* Lista de Pastas Disponíveis */}
            <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-2">
              {/* Opção Sem Pasta / Raiz */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderId(null);
                  setSelectedFolderName('Sem Pasta (Raiz / Geral)');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  selectedFolderId === null
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${selectedFolderId === null ? 'text-white' : 'text-blue-500'}`} />
                  <span>Sem Pasta (Raiz / Geral)</span>
                </div>
                {selectedFolderId === null && <Check className="h-3.5 w-3.5 text-white" />}
              </button>

              <div className="border-t border-[var(--border-subtle)] my-1" />

              {/* Pastas da Hierarquia */}
              {getFlatFolders(folders).map((f) => {
                const isSelected = selectedFolderId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFolderId(f.id);
                      setSelectedFolderName(f.name);
                    }}
                    style={{ paddingLeft: `${f.depth * 14 + 12}px` }}
                    className={`w-full text-left py-1.5 pr-3 rounded-lg text-xs flex items-center justify-between truncate transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                      <span className="truncate">{f.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-white shrink-0 ml-2" />}
                  </button>
                );
              })}

              {folders.length === 0 && (
                <p className="text-[11px] text-[var(--text-muted)] p-2 text-center">
                  Nenhuma pasta criada ainda. O documento será enviado para a raiz geral ou você pode criar uma pasta acima.
                </p>
              )}
            </div>

            {/* Resumo do Destino Selecionado */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-inset)] px-3 py-2 text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>Destino selecionado:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {selectedFolderName}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-header)] p-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={validDocs.length === 0 || isSending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isSending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Iniciando envio...</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>
                {validDocs.length === 1 ? 'Enviar 1 Nota' : `Enviar ${validDocs.length} Notas`}
              </span>
            </>
          )}
        </button>
      </div>
    </DialogShell>
  );
};
