import { Calendar } from 'lucide-react';

export interface RetroactivePromptModalProps {
  isLight: boolean;
  prompt: {
    asset: any;
    startComp: string;
    endComp: string;
    count: number;
  } | null;
  isGenerating: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function RetroactivePromptModal({
  isLight,
  prompt,
  isGenerating,
  onClose,
  onConfirm,
}: RetroactivePromptModalProps) {
  if (!prompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl ${isLight ? 'bg-white border border-[#e2e8f0]' : 'bg-[#18181b] border border-[#3f3f46]'}`}>
        <div className={`p-4 border-b flex items-center gap-3 ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <Calendar className="w-5 h-5 text-blue-500" />
          <div>
            <div className={`text-sm font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Gerar depreciação retroativa?</div>
            <div className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#a1a1aa]'}`}>Bem adquirido antes do último mês fechado</div>
          </div>
        </div>
        <div className="p-4 text-xs space-y-3">
          <p className={`${isLight ? 'text-[#475569]' : 'text-[#d4d4d8]'}`}>
            A nota <b>NF {prompt.asset.documentNumber || prompt.asset.description}</b> foi emitida em <b>{prompt.startComp.split('-').reverse().join('/')}</b>.
          </p>
          <p className={`${isLight ? 'text-[#475569]' : 'text-[#d4d4d8]'}`}>
            Estamos em <b>{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>, fechando <b>{prompt.endComp.split('-').reverse().join('/')}</b>.
          </p>
          <div className={`p-3 rounded-xl border text-center ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
            <div className={`text-[11px] font-bold uppercase ${isLight ? 'text-[#64748b]' : 'text-[#71717a]'}`}>Período retroativo</div>
            <div className={`text-sm font-black ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{prompt.startComp.split('-').reverse().join('/')} até {prompt.endComp.split('-').reverse().join('/')} • {prompt.count} meses</div>
            <div className={`text-[11px] mt-1 ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>Será gerado um CSV com a depreciação mensal de cada competência.</div>
          </div>
          <p className={`text-[11px] ${isLight ? 'text-[#94a3b8]' : 'text-[#52525b]'}`}>
            Deseja gerar o arquivo agora? Você também poderá gerar depois pela tela de depreciação.
          </p>
        </div>
        <div className={`p-3 border-t flex justify-end gap-2 ${isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#111114] border-[#27272a]'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${isLight ? 'bg-white border-[#e2e8f0] text-[#475569]' : 'bg-[#27272a] border-[#3f3f46] text-white'}`}>Agora não</button>
          <button
            disabled={isGenerating}
            onClick={onConfirm}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? 'Gerando...' : `Gerar ${prompt.count} lançamentos`}
          </button>
        </div>
      </div>
    </div>
  );
}
