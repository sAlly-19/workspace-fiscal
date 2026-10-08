import React from 'react';
import {
  CheckSquare,
  Square,
  FolderOpen,
  Printer,
  MoveRight,
  Trash2,
  X,
  UploadCloud,
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { DocumentCardSkeleton } from '../../../components/Skeleton';

export interface DocumentListPaneProps {
  listWidth: number;
  currentTheme: string;
  filteredDocuments: any[];
  selectedDocumentId: string | null;
  selectedDocIds: string[];
  selectedFolderName: string;
  allFilteredSelected: boolean;
  isDocsLoading: boolean;
  searchQuery: string;
  onSelectAllDocs: (checked: boolean) => void;
  onSelectDocument: (id: string, label?: string) => void;
  onToggleDocSelection: (id: string) => void;
  onBatchPrint: (docIdsToPrint?: string[]) => void;
  onOpenBulkMove: () => void;
  onTriggerBulkDelete: () => void;
  onClearDocSelection: () => void;
  onSetMovingDocId: (id: string) => void;
  onTriggerSingleDelete: (id: string, docLabel: string) => void;
  onTriggerUploadXml: () => void;
}

export function DocumentListPane({
  listWidth,
  currentTheme,
  filteredDocuments,
  selectedDocumentId,
  selectedDocIds,
  selectedFolderName,
  allFilteredSelected,
  isDocsLoading,
  searchQuery,
  onSelectAllDocs,
  onSelectDocument,
  onToggleDocSelection,
  onBatchPrint,
  onOpenBulkMove,
  onTriggerBulkDelete,
  onClearDocSelection,
  onSetMovingDocId,
  onTriggerSingleDelete,
  onTriggerUploadXml,
}: DocumentListPaneProps) {
  return (
    <div
      style={{ width: `${listWidth}px` }}
      className={`h-full flex flex-col shrink-0 print:hidden overflow-hidden relative border-r ${
        currentTheme === 'light'
          ? 'bg-[#f8fafc] border-[#e2e8f0]'
          : 'bg-[#111114] border-[#27272a]'
      }`}
    >
      {/* List Header with Multi-Select Controls */}
      <div
        className={`h-11 px-3 border-b flex items-center justify-between shrink-0 ${
          currentTheme === 'light'
            ? 'bg-white border-[#e2e8f0]'
            : 'bg-[#141418] border-[#27272a]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          {filteredDocuments.length > 0 && (
            <button
              onClick={() => onSelectAllDocs(!allFilteredSelected)}
              className={`transition-colors cursor-pointer ${
                currentTheme === 'light'
                  ? 'text-[#64748b] hover:text-[#0f172a]'
                  : 'text-[#71717a] hover:text-white'
              }`}
              title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos os documentos'}
            >
              {allFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          )}
          <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span
            className={`text-xs font-bold truncate ${
              currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
            }`}
            title={selectedFolderName}
          >
            {selectedFolderName}
          </span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold shrink-0 ${
              currentTheme === 'light'
                ? 'bg-[#e2e8f0] text-[#475569]'
                : 'bg-[#27272a] text-[#a1a1aa]'
            }`}
          >
            {filteredDocuments.length}
          </span>
        </div>

        {/* Quick batch export button & selection counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          {filteredDocuments.length > 0 && (
            <button
              onClick={() => onBatchPrint()}
              className={`p-1.5 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                currentTheme === 'light'
                  ? 'text-[#475569] hover:text-blue-600 hover:bg-blue-50'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/10'
              }`}
              title="Exportar todas as notas em PDF / Imprimir em Lote"
            >
              <Printer className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden xl:inline">Exportar Lote</span>
            </button>
          )}
          {selectedDocIds.length > 0 && (
            <span className="text-[11px] font-semibold text-blue-500 shrink-0">
              {selectedDocIds.length} sel.
            </span>
          )}
        </div>
      </div>

      {/* Floating Bulk Actions Toolbar when documents are selected */}
      {selectedDocIds.length > 0 && (
        <div className="p-2 bg-blue-950/90 border-b border-blue-500/30 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1">
          <span className="font-semibold text-white">
            {selectedDocIds.length} {selectedDocIds.length === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onBatchPrint(selectedDocIds)}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Exportar e imprimir notas fiscais selecionadas em PDF"
            >
              <Printer className="w-3 h-3" />
              Exportar PDF ({selectedDocIds.length})
            </button>
            <button
              onClick={onOpenBulkMove}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Mover selecionados para outra pasta"
            >
              <MoveRight className="w-3 h-3" />
              Mover
            </button>
            <button
              onClick={onTriggerBulkDelete}
              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Excluir documentos selecionados"
            >
              <Trash2 className="w-3 h-3" />
              Excluir
            </button>
            <button
              onClick={onClearDocSelection}
              className="p-1 text-blue-300 hover:text-white cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Document Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isDocsLoading && filteredDocuments.length === 0 ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </>
        ) : (
          filteredDocuments.map((doc) => {
            const isSelected = selectedDocumentId === doc.id;
            const isChecked = selectedDocIds.includes(doc.id);

            return (
              <div
                key={doc.id}
                data-doc-id={doc.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/fiscal-document-id', doc.id);
                }}
                onClick={() => onSelectDocument(doc.id, `${doc.type} ${doc.number || ''}`)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer relative group ${
                  isSelected
                    ? currentTheme === 'light'
                      ? 'bg-blue-50 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                      : 'bg-[#1e1e24] border-blue-500 shadow-xs'
                    : isChecked
                    ? currentTheme === 'light'
                      ? 'bg-blue-50/70 border-blue-300'
                      : 'bg-blue-950/20 border-blue-500/50'
                    : currentTheme === 'light'
                    ? 'bg-white border-[#e2e8f0] hover:bg-[#f1f5f9] hover:border-[#cbd5e1]'
                    : 'bg-[#141418] border-[#27272a] hover:bg-[#18181f] hover:border-[#3f3f46]'
                }`}
                title="Clique para visualizar o DANFE ou arraste para uma pasta do workspace"
              >
                {/* Top Row: Multi-select Checkbox + Type & Date */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDocSelection(doc.id);
                      }}
                      className={`transition-colors cursor-pointer ${
                        currentTheme === 'light'
                          ? 'text-[#94a3b8] hover:text-[#0f172a]'
                          : 'text-[#71717a] hover:text-white'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : currentTheme === 'light'
                          ? 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]'
                          : 'bg-[#27272a] text-[#a1a1aa]'
                      }`}
                    >
                      {doc.type || 'NF-e'}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] ${
                      currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'
                    }`}
                  >
                    {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>

                {/* Number & Series */}
                <div
                  className={`text-xs font-bold mb-0.5 flex items-center justify-between pl-5 ${
                    currentTheme === 'light' ? 'text-[#0f172a]' : 'text-white'
                  }`}
                >
                  <span>Nº {doc.number || 'S/N'}</span>
                  {doc.series && (
                    <span
                      className={`text-[10px] font-normal ${
                        currentTheme === 'light' ? 'text-[#64748b]' : 'text-[#71717a]'
                      }`}
                    >
                      Série {doc.series}
                    </span>
                  )}
                </div>

                {/* Issuer Name */}
                <div
                  className={`text-[11px] truncate mb-2 font-medium pl-5 ${
                    currentTheme === 'light' ? 'text-[#475569]' : 'text-[#a1a1aa]'
                  }`}
                  title={doc.issuerName || 'Não Informado'}
                >
                  {doc.issuerName || 'Não Informado'}
                </div>

                {/* Bottom Row: Total & Actions */}
                <div
                  className={`flex items-center justify-between pt-1.5 pl-5 border-t ${
                    currentTheme === 'light' ? 'border-[#e2e8f0]' : 'border-[#27272a]/70'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      currentTheme === 'light' ? 'text-green-600' : 'text-green-400'
                    }`}
                  >
                    {doc.totalAmount ? `R$ ${doc.totalAmount.toFixed(2)}` : 'R$ 0,00'}
                  </span>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetMovingDocId(doc.id);
                      }}
                      className={`p-1 rounded transition-all cursor-pointer ${
                        currentTheme === 'light'
                          ? 'hover:bg-blue-600 hover:text-white text-[#64748b]'
                          : 'hover:bg-blue-600 hover:text-white text-[#71717a]'
                      }`}
                      title="Mover para outra pasta"
                    >
                      <MoveRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDocument(doc.id);
                        setTimeout(() => window.print(), 150);
                      }}
                      className={`p-1 rounded transition-all cursor-pointer ${
                        currentTheme === 'light'
                          ? 'hover:bg-blue-600 hover:text-white text-[#64748b]'
                          : 'hover:bg-blue-600 hover:text-white text-[#71717a]'
                      }`}
                      title="Imprimir DANFE"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerSingleDelete(doc.id, `Nº ${doc.number || 'S/N'}`);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 hover:text-red-500 text-[#71717a] transition-all cursor-pointer"
                      title="Remover documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Empty state for documents list */}
        {filteredDocuments.length === 0 && !isDocsLoading && (
          <EmptyState
            icon="file"
            title="Nenhum XML nesta pasta"
            description={
              searchQuery
                ? 'Tente outra busca ou remova os filtros.'
                : 'Arraste arquivos aqui ou clique em Importar XML no topo.'
            }
            ctaLabel="Importar XML"
            ctaIcon={<UploadCloud className="w-3.5 h-3.5" />}
            onCta={onTriggerUploadXml}
          />
        )}
      </div>
    </div>
  );
}

