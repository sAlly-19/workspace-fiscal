import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SefazRulesCardProps {
  isLight: boolean;
}

export function SefazRulesCard({ isLight }: SefazRulesCardProps) {
  return (
    <div
      className={`p-3.5 rounded-xl border text-[11px] space-y-1.5 ${
        isLight
          ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569]'
          : 'bg-[#141418] border-[#27272a] text-[#a1a1aa]'
      }`}
    >
      <div className="font-bold flex items-center gap-1.5 text-purple-500">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Regras de Consulta & Cooldown da SEFAZ</span>
      </div>
      <p>
        • <b>Controle de NSU:</b> A sincronização avança sequencialmente do último NSU até o NSU máximo retornado pelo Ambiente Nacional.
      </p>
      <p>
        • <b>Consumo Indevido (cStat 656):</b> A SEFAZ bloqueia consultas frequentes sem novos documentos por 1 hora. O módulo respeita automaticamente o tempo de espera.
      </p>
      <p>
        • <b>Certificados A1:</b> A autenticação mTLS é realizada utilizando a chave privada instalada no repositório nativo do Windows.
      </p>
    </div>
  );
}

