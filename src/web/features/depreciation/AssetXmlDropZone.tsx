import { useState, useRef } from 'react';
import { UploadCloud, Loader2, FileCheck, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { apiFetch } from '../../lib/api';
import { toast } from '../../components/Toast';

interface AssetSuggestion {
  source: 'NFE';
  supplier: string;
  supplierDocument: string | null;
  documentNumber: string | null;
  series: string | null;
  issueDate: string | null;
  total: number; // centavos
  items: Array<{
    code: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    ncm: string | null;
  }>;
}

interface PreFilledData {
  supplier: string;
  documentNumber: string;
  series: string | null;
  acquisitionDate: string; // ISO date ou yyyy-mm-dd
  acquisitionValue: number; // centavos
  description: string;
  ncm: string | null;
}

interface Props {
  /** Chamado com os dados extraídos do XML para preencher o form de cadastro. */
  onPrefill: (data: PreFilledData) => void;
}

function pickBestItem(items: AssetSuggestion['items']): PreFilledData['description'] {
  if (!items || items.length === 0) return '';
  // Heurística: item de maior valor (provável é o bem principal)
  const sorted = [...items].sort((a, b) => b.totalPrice - a.totalPrice);
  return sorted[0]?.description ?? '';
}

export function AssetXmlDropZone({ onPrefill }: Props) {
  const { settings } = useWorkspaceStore();
  const isLight = settings.theme === 'light';
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendFile = async (file: File) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/api/assets/import/from-xml', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error('Falha ao ler XML', err?.error || 'Verifique o arquivo.');
        return;
      }
      const data: AssetSuggestion = await res.json();
      const bestDescription = pickBestItem(data.items);
      onPrefill({
        supplier: data.supplier,
        documentNumber: data.documentNumber ?? '',
        series: data.series,
        acquisitionDate: data.issueDate ? data.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        acquisitionValue: data.total,
        description: bestDescription,
        ncm: data.items?.[0]?.ncm ?? null,
      });
      toast.success(
        'Dados extraídos do XML',
        `${data.items.length} ${data.items.length === 1 ? 'item encontrado' : 'itens encontrados'} — revise e salve.`
      );
    } catch (e) {
      toast.error('Erro ao enviar XML', (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!isLoading) setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.toLowerCase().endsWith('.xml')) sendFile(file);
        else toast.warning('Apenas XML', 'Arraste um arquivo .xml de NF-e de produto.');
      }}
      className={`relative rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
          : isLight
            ? 'border-[#cbd5e1] bg-[#f8fafc] hover:border-blue-400 hover:bg-blue-50/30'
            : 'border-[#27272a] bg-[#111114] hover:border-blue-500/60 hover:bg-blue-500/5'
      }`}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) sendFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/15 text-blue-400'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isDragging ? (
            <Sparkles className="w-5 h-5" />
          ) : (
            <UploadCloud className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            {isLoading
              ? 'Lendo XML…'
              : isDragging
                ? 'Solte o XML aqui'
                : 'Auto-preencher de XML de NF-e'}
          </p>
          <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Arraste um XML de NF-e de produto aqui — fornecedor, data, valor e descrição serão preenchidos.
          </p>
        </div>
        <FileCheck className={`w-4 h-4 shrink-0 ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`} />
      </div>
    </div>
  );
}