export interface DanfeHeaderProps {
  issuerName: string;
  issuerStreet: string;
  issuerNumber: string;
  issuerComp: string;
  issuerBairro: string;
  issuerCep: string;
  issuerCity: string;
  issuerState: string;
  issuerPhone: string;
  issuerDoc: string;
  issuerIE: string;
  issuerIM: string;
  docNumber?: string;
  docSeries?: string;
  formattedKey: string;
  operationNature?: string;
  protocol?: string;
}

export function DanfeHeader({
  issuerName,
  issuerStreet,
  issuerNumber,
  issuerComp,
  issuerBairro,
  issuerCep,
  issuerCity,
  issuerState,
  issuerPhone,
  issuerDoc,
  issuerIE,
  issuerIM,
  docNumber,
  docSeries,
  formattedKey,
  operationNature,
  protocol,
}: DanfeHeaderProps) {
  return (
    <div className="border border-black mb-1.5">
      <div className="flex border-b border-black">
        {/* Emitente */}
        <div className="w-[45%] p-2 border-r border-black flex flex-col justify-between">
          <div>
            <div className="text-[7px] text-gray-600 font-bold uppercase text-center mb-1">
              IDENTIFICAÇÃO DO EMITENTE
            </div>
            <h1 className="font-black text-xs sm:text-sm leading-tight uppercase text-center">{issuerName}</h1>
            <div className="text-[8px] text-center mt-1 text-gray-800 leading-tight">
              {issuerStreet ? `${issuerStreet}, ${issuerNumber}${issuerComp}` : ''}
              {issuerBairro ? (
                <>
                  <br />
                  {issuerBairro} - {issuerCep}
                </>
              ) : (
                ''
              )}
              {issuerCity ? (
                <>
                  <br />
                  {issuerCity} - {issuerState} {issuerPhone ? `Fone/Fax: ${issuerPhone}` : ''}
                </>
              ) : (
                ''
              )}
            </div>
          </div>
        </div>

        {/* DANFE center box */}
        <div className="w-[20%] p-1.5 border-r border-black flex flex-col justify-between items-center text-center">
          <div>
            <h2 className="font-black text-base tracking-wider leading-none">DANFE</h2>
            <p className="text-[7px] text-gray-700 font-semibold mt-0.5 leading-tight">
              Documento Auxiliar da Nota Fiscal Eletrônica
            </p>
          </div>
          <div className="my-1 border border-black px-1.5 py-0.5 text-[8px] font-bold">
            0 - ENTRADA
            <br />1 - SAÍDA <span className="font-black text-[10px] ml-1">[ 1 ]</span>
          </div>
          <div className="text-[8.5px] font-bold leading-tight">
            <div>Nº. {docNumber || '000.000'}</div>
            <div>Série {docSeries || '001'}</div>
            <div>Folha 1/1</div>
          </div>
        </div>

        {/* Chave de Acesso + Código de Barras */}
        <div className="w-[35%] p-1.5 flex flex-col justify-between">
          <div>
            {/* Barcode representation */}
            <div className="h-9 w-full flex items-center justify-between px-1 bg-white mb-1 overflow-hidden select-none danfe-no-select">
              {Array.from({ length: 55 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full bg-black ${i % 4 === 0 ? 'w-1' : i % 7 === 0 ? 'w-1.5' : 'w-0.5'}`}
                />
              ))}
            </div>
            <div className="text-[7px] text-gray-600 font-bold uppercase">CHAVE DE ACESSO</div>
            <div className="font-mono text-[9px] font-black tracking-wide text-center select-text cursor-text">
              {formattedKey}
            </div>
          </div>
          <div className="text-center text-[7px] text-gray-600 leading-tight mt-1 pt-1 border-t border-gray-300">
            Consulta de autenticidade no portal nacional da NF-e
            <br />
            <span className="font-bold">www.nfe.fazenda.gov.br/portal</span> ou no site da Sefaz Autorizadora
          </div>
        </div>
      </div>

      {/* Natureza da Operação e Protocolo */}
      <div className="flex border-b border-black text-[8px]">
        <div className="w-[60%] p-1 border-r border-black">
          <div className="text-[7px] text-gray-600 font-bold uppercase">NATUREZA DA OPERAÇÃO</div>
          <div className="font-black uppercase">{operationNature || 'VENDA DE MERCADORIA'}</div>
        </div>
        <div className="w-[40%] p-1">
          <div className="text-[7px] text-gray-600 font-bold uppercase">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
          <div className="font-black font-mono">{protocol || '-'}</div>
        </div>
      </div>

      {/* Inscrições e CNPJ Emitente */}
      <div className="flex text-[8px]">
        <div className="w-[28%] p-1 border-r border-black">
          <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO ESTADUAL</div>
          <div className="font-bold font-mono">{issuerIE}</div>
        </div>
        <div className="w-[28%] p-1 border-r border-black">
          <div className="text-[7px] text-gray-600 font-bold uppercase">INSCRIÇÃO MUNICIPAL</div>
          <div className="font-bold font-mono">{issuerIM}</div>
        </div>
        <div className="w-[20%] p-1 border-r border-black">
          <div className="text-[7px] text-gray-600 font-bold uppercase">INSC. ESTADUAL SUBST. TRIB.</div>
          <div className="font-bold font-mono">-</div>
        </div>
        <div className="w-[24%] p-1">
          <div className="text-[7px] text-gray-600 font-bold uppercase">CNPJ / CPF</div>
          <div className="font-black font-mono">{issuerDoc}</div>
        </div>
      </div>
    </div>
  );
}

