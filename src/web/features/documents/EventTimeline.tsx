import { useEffect, useState } from 'react';
import { CalendarClock, Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace.store';
import { apiFetch } from '../../lib/api';
import { toast } from '../../components/Toast';

interface DocEvent {
  id: string;
  documentId: string;
  eventType: string; // 'CCE' | 'CANCEL' | etc
  sequence: number;
  eventDate: string | null;
  protocol: string | null;
  correctionText: string | null;
  createdAt: string;
}

const KIND_META: Record<string, { label: string; color: string; icon: typeof CalendarClock }> = {
  CCE: {
    label: 'Carta de Correção',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    icon: CalendarClock,
  },
  CANCEL: {
    label: 'Cancelamento',
    color: 'border-red-500/40 bg-red-500/10 text-red-400',
    icon: AlertCircle,
  },
  OTHER: {
    label: 'Outro evento',
    color: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-400',
    icon: FileText,
  },
};

export function EventTimeline({ documentId }: { documentId: string }) {
  const { settings } = useWorkspaceStore();
  const isLight = settings.theme === 'light';
  const [events, setEvents] = useState<DocEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/documents/${documentId}/events`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setEvents(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleUploadCce = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch(`/api/documents/${documentId}/events/cce`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          'CC-e registrada',
          `${data.count} carta${data.count > 1 ? 's' : ''} de correção importada${data.count > 1 ? 's' : ''}.`
        );
        await loadEvents();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error('Falha ao importar CC-e', err?.error || 'Verifique o arquivo.');
      }
    } catch (e) {
      toast.error('Erro ao enviar', (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
            Eventos da Nota
          </h2>
          <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
            Histórico cronológico de CC-e, cancelamentos e outros eventos.
          </p>
        </div>
        <label
          className={`px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm cursor-pointer flex items-center gap-1.5 transition-all ${
            uploading
              ? 'bg-blue-600/40 text-white cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Enviando…' : 'Importar CC-e'}
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadCce(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {loading ? (
        <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando eventos…
        </div>
      ) : sorted.length === 0 ? (
        <div
          className={`text-center p-10 border border-dashed rounded-xl ${
            isLight ? 'border-[#cbd5e1] text-[#64748b]' : 'border-[#27272a] text-[#71717a]'
          }`}
        >
          <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold">Nenhum evento registrado</p>
          <p className="text-[11px] mt-1">
            Importe o XML de CC-e acima para registrar uma carta de correção.
          </p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-dashed border-blue-500/30 ml-3 space-y-4">
          {sorted.map((evt) => {
            const meta = KIND_META[evt.eventType] || KIND_META.OTHER;
            const Icon = meta.icon;
            return (
              <li key={evt.id} className="ml-6 relative">
                <span
                  className={`absolute -left-[33px] flex items-center justify-center w-6 h-6 rounded-full border ${meta.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div
                  className={`rounded-lg border p-3 ${
                    isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${meta.color}`}>
                      {meta.label} · Seq. {evt.sequence}
                    </span>
                    {evt.eventDate && (
                      <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                        {new Date(evt.eventDate).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  {evt.correctionText && (
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-[#334155]' : 'text-[#d4d4d8]'}`}>
                      {evt.correctionText}
                    </p>
                  )}
                  {evt.protocol && (
                    <p className={`text-[10px] font-mono mt-2 ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>
                      Protocolo: {evt.protocol}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}