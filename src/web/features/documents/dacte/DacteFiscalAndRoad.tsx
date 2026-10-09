export interface DacteFiscalAndRoadProps {
  icmsCst: string;
  icmsBase: number;
  icmsAliq: number;
  icmsValor: number;
  icmsRed: number;
  docsList: any[];
  rntrc: string;
  ciot: string;
  placa: string;
  ufVeic: string;
  motorista: string;
  motoristaCpf: string;
  additionalInfo?: string;
  fiscoInfo?: string;
}

export function DacteFiscalAndRoad({
  icmsCst,
  icmsBase,
  icmsAliq,
  icmsValor,
  icmsRed,
  docsList,
  rntrc,
  ciot,
  placa,
  ufVeic,
  motorista,
  motoristaCpf,
  additionalInfo,
  fiscoInfo,
}: DacteFiscalAndRoadProps) {
  return (
    <>
      {/* INFORMAÇÕES RELATIVAS AO IMPOSTO (ICMS) */}
      <div className="border-b border-black">
        <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
          INFORMAÇÕES RELATIVAS AO IMPOSTO (ICMS)
        </div>
        <div className="grid grid-cols-5 text-center p-1.5 text-[7.5px] border-b border-gray-200">
          <div className="border-r border-gray-200">
            <div className="text-gray-600 font-bold">SITUAÇÃO TRIBUTÁRIA (CST)</div>
            <div className="font-bold mt-0.5 font-mono">{icmsCst}</div>
          </div>
          <div className="border-r border-gray-200">
            <div className="text-gray-600 font-bold">BASE DE CÁLCULO (R$)</div>
            <div className="font-bold mt-0.5 font-mono">{icmsBase > 0 ? icmsBase.toFixed(2) : '0,00'}</div>
          </div>
          <div className="border-r border-gray-200">
            <div className="text-gray-600 font-bold">ALÍQUOTA (%)</div>
            <div className="font-bold mt-0.5 font-mono">{icmsAliq > 0 ? `${icmsAliq.toFixed(2)}%` : '0,00%'}</div>
          </div>
          <div className="border-r border-gray-200">
            <div className="text-gray-600 font-bold">VALOR DO ICMS (R$)</div>
            <div className="font-bold mt-0.5 font-mono">{icmsValor > 0 ? icmsValor.toFixed(2) : '0,00'}</div>
          </div>
          <div>
            <div className="text-gray-600 font-bold">% REDUÇÃO BC</div>
            <div className="font-bold mt-0.5 font-mono">{icmsRed > 0 ? `${icmsRed.toFixed(2)}%` : '0,00%'}</div>
          </div>
        </div>
      </div>

      {/* DOCUMENTOS ORIGINÁRIOS / NF-E TRANSPORTADAS */}
      <div className="border-b border-black">
        <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
          DOCUMENTOS ORIGINÁRIOS (NF-e / NOTAS FISCAIS TRANSPORTADAS)
        </div>
        <div className="p-1.5 text-[7.5px]">
          {docsList.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[7px]">
              {docsList.map((d: any, idx: number) => (
                <div key={idx} className="p-1 bg-gray-50 border border-gray-200 rounded">
                  {d.type === 'NFE' && (
                    <div>
                      <b>NF-e Chave:</b> {d.key ? d.key.match(/.{1,4}/g)?.join(' ') : '-'}
                    </div>
                  )}
                  {d.type === 'NF' && (
                    <div>
                      <b>NF Papel:</b> Nº {d.number} Série {d.series || '1'}{' '}
                      {d.amount ? `| R$ ${d.amount.toFixed(2)}` : ''}
                    </div>
                  )}
                  {d.type === 'OUTROS' && (
                    <div>
                      <b>Outro Doc:</b> Nº {d.number || '-'} {d.amount ? `| R$ ${d.amount.toFixed(2)}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic">Nenhum documento originário discriminado no XML</div>
          )}
        </div>
      </div>

      {/* INFORMAÇÕES ESPECÍFICAS DO MODAL RODOVIÁRIO */}
      <div className="border-b border-black">
        <div className="bg-gray-100 px-2 py-0.5 font-bold text-[7px] border-b border-black uppercase">
          DADOS ESPECÍFICOS DO MODAL RODOVIÁRIO
        </div>
        <div className="p-1.5 grid grid-cols-4 gap-2 text-[7.5px]">
          <div>
            <b>RNTRC da Empresa:</b> <span className="font-mono">{rntrc}</span>
          </div>
          <div>
            <b>CIOT:</b> <span className="font-mono">{ciot}</span>
          </div>
          <div>
            <b>Veículo / Placa:</b> <span className="font-mono uppercase">{placa} / {ufVeic}</span>
          </div>
          <div>
            <b>Motorista:</b> {motorista} {motoristaCpf !== '-' ? `(${motoristaCpf})` : ''}
          </div>
        </div>
      </div>

      {/* OBSERVAÇÕES E DADOS DO FISCO */}
      <div className="p-2 text-[7.5px] space-y-1">
        <div className="font-bold uppercase text-gray-700">OBSERVAÇÕES GERAIS</div>
        <div className="text-gray-700 leading-normal space-y-0.5">
          {additionalInfo && <div className="whitespace-pre-wrap">{additionalInfo}</div>}
          {fiscoInfo && (
            <div className="whitespace-pre-wrap border-t border-gray-200 pt-1 text-gray-800 font-semibold">
              [RESERVADO AO FISCO] {fiscoInfo}
            </div>
          )}
          {!additionalInfo && !fiscoInfo && (
            <div className="text-gray-500 italic">Sem observações adicionais.</div>
          )}
        </div>
      </div>
    </>
  );
}

