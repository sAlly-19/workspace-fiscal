import { CombinedSefazQueryResult } from './types';
import { compareNSU } from './nsu';

export interface SyncResultPresentation {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

export async function presentAfterRefresh<T>(
  refresh: () => Promise<void>,
  value: T,
  present: (value: T) => void
): Promise<void> {
  await refresh();
  present(value);
}

export function simplifySyncErrorMessage(raw?: string): string {
  if (!raw) return '';

  // Corrige possíveis artefatos de codificação UTF-8 / ANSI (mojibake comum do Windows PowerShell)
  const normalized = raw
    .replace(/nÃ£o/g, 'não')
    .replace(/repositÃ³rio/g, 'repositório')
    .replace(/invÃ¡lido/g, 'inválido')
    .replace(/autenticaÃ§Ã£o/g, 'autenticação')
    .replace(/conexÃ£o/g, 'conexão')
    .replace(/usuÃ¡rio/g, 'usuário');

  // 1. Certificado não localizado no repositório do Windows (PowerShell / Windows store)
  if (
    /não foi localizado no repositório/i.test(normalized) ||
    (/thumbprint/i.test(normalized) && /reposit/i.test(normalized))
  ) {
    const thumbMatch = normalized.match(/thumbprint\s*['"]?([a-fA-F0-9]{40,64})['"]?/i);
    const thumbInfo = thumbMatch ? ` (Thumbprint '${thumbMatch[1]}')` : '';
    return `Certificado digital${thumbInfo} não foi localizado no repositório do Windows. Verifique se o certificado está ativado no seu gerenciador de certificados digitais ou instalado no sistema.`;
  }

  // 2. Thumbprint de certificado inválido
  if (/thumbprint.*inválido/i.test(normalized)) {
    return 'Thumbprint do certificado digital configurado é inválido. Selecione o certificado novamente.';
  }

  // 3. Certificado expirado ou revogado
  if (/expirad|validade vencida|revogad/i.test(normalized)) {
    return 'O certificado digital da empresa está expirado ou revogado. Selecione um certificado válido.';
  }

  // 4. Senha / PIN / Smartcard / Token
  if (/pin|senha|token|smartcard|cart[ãa]o/i.test(normalized)) {
    return 'Falha ao autenticar o certificado digital. Verifique a senha ou a conexão do token no gerenciador de certificados.';
  }

  // 5. Consumo Indevido / cStat 656 / Rate limit
  if (/consumo indevido|656/i.test(normalized)) {
    return 'Limite de requisições da SEFAZ atingido (Consumo Indevido). Aguarde antes de tentar novamente.';
  }

  // 6. NSU Rejeitado (cStat 589)
  if (/589/i.test(normalized) && /nsu/i.test(normalized)) {
    return 'O NSU informado foi rejeitado pela SEFAZ (cStat 589). Utilize o botão "Reset NF-e / Reset CT-e" se necessário.';
  }

  // 7. Conexão / Rede / Timeout
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|timeout|tempo limite esgotado|falha de conex[ãa]o|falha na rede/i.test(normalized)) {
    return 'Falha de comunicação com os servidores da SEFAZ. Verifique sua conexão com a internet.';
  }

  // 8. Erro no bridge do Windows PowerShell genérico
  if (/erro no bridge do windows powershell|windows-bridge\.ps1/i.test(normalized)) {
    return 'Falha na comunicação com o serviço de certificados do Windows.';
  }

  // 9. Se contiver caminhos de script ou termos de erro interno (C:\..., CategoryInfo, etc.)
  if (/([A-Za-z]:\\[^:]+|CategoryInfo|FullyQualifiedErrorId)/i.test(normalized)) {
    return 'Ocorreu uma falha na comunicação com a SEFAZ.';
  }

  // Se já for uma mensagem limpa e curta (ex: retorno oficial da SEFAZ)
  return normalized;
}

export function describeCombinedSyncResult(
  result: CombinedSefazQueryResult
): SyncResultPresentation {
  const hasTechnicalError = Boolean(result.nfe.error || result.cte.error);
  const isRateLimited = result.nfe.cStat === 656 || result.cte.cStat === 656
    || Boolean(result.nfe.rateLimitedUntil || result.cte.rateLimitedUntil);
  const isComplete = result.nfe.isComplete && result.cte.isComplete;
  const pending = [
    !result.nfe.isComplete && result.nfe.success && compareNSU(result.nfe.ultNSU, result.nfe.maxNSU) < 0
      ? `NF-e: NSU ${result.nfe.ultNSU} de ${result.nfe.maxNSU}`
      : null,
    !result.cte.isComplete && result.cte.success && compareNSU(result.cte.ultNSU, result.cte.maxNSU) < 0
      ? `CT-e: NSU ${result.cte.ultNSU} de ${result.cte.maxNSU}`
      : null,
  ].filter((item): item is string => Boolean(item));

  if (hasTechnicalError) {
    const nfeErrorMsg = result.nfe.error ? simplifySyncErrorMessage(result.nfe.error) : null;
    const cteErrorMsg = result.cte.error ? simplifySyncErrorMessage(result.cte.error) : null;

    // Se ambos falharam com o mesmo motivo (ex: certificado inativo no gerenciador de certificados)
    if (nfeErrorMsg && cteErrorMsg && nfeErrorMsg === cteErrorMsg) {
      return {
        type: 'error',
        message: nfeErrorMsg,
      };
    }

    // Se apenas NF-e teve erro técnico e CT-e teve sucesso
    if (nfeErrorMsg && !cteErrorMsg && result.cte.success) {
      return {
        type: 'error',
        message: `NF-e: ${nfeErrorMsg} CT-e: ${result.cte.documentsCount} documento(s) recebido(s).`,
      };
    }

    // Se apenas CT-e teve erro técnico e NF-e teve sucesso
    if (!nfeErrorMsg && result.nfe.success && cteErrorMsg) {
      return {
        type: 'error',
        message: `NF-e: ${result.nfe.documentsCount} documento(s) recebido(s). CT-e: ${cteErrorMsg}`,
      };
    }

    // Erros distintos
    const parts = [
      nfeErrorMsg ? `NF-e: ${nfeErrorMsg}` : (result.nfe.success ? `NF-e: ${result.nfe.documentsCount} documento(s)` : `NF-e: ${simplifySyncErrorMessage(result.nfe.xMotivo)}`),
      cteErrorMsg ? `CT-e: ${cteErrorMsg}` : (result.cte.success ? `CT-e: ${result.cte.documentsCount} documento(s)` : `CT-e: ${simplifySyncErrorMessage(result.cte.xMotivo)}`),
    ];

    return {
      type: 'error',
      message: `Falha na sincronização. ${parts.join(' ')}`,
    };
  }

  const headline = isComplete
    ? 'Sincronização concluída.'
    : pending.length > 0
      ? 'Sincronização parcial — ainda existem documentos pendentes.'
      : 'Sincronização não concluída.';
  const pendingMessage = pending.length > 0 ? ` Pendente: ${pending.join(' · ')}.` : '';

  const summarize = (label: string, item: typeof result.nfe): string => item.success
    ? `${label}: ${item.documentsCount} documento(s), NSU ${item.ultNSU}`
    : `${label}: ${simplifySyncErrorMessage(item.xMotivo)}`;

  return {
    type: isComplete ? 'success' : isRateLimited ? 'warning' : 'info',
    message: `${headline} ${summarize('NF-e', result.nfe)}. ${summarize('CT-e', result.cte)}.${pendingMessage}`,
  };
}
