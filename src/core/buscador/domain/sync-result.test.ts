import { describe, it, expect } from 'vitest';
import { describeCombinedSyncResult, simplifySyncErrorMessage } from './sync-result';
import type { CombinedSefazQueryResult } from './types';

describe('simplifySyncErrorMessage', () => {
  it('simplifies Windows PowerShell certificate not found error with thumbprint and mojibake', () => {
    const rawError = "Erro no bridge do Windows PowerShell (code 2): C:\\Users\\alisson.santos\\Documents\\antigravity\\workspace-fiscal\\src\\core\\buscador\\certificates\\windows-bridge.ps1 : Certificado com Thumbprint '964AA08BEFA9DF59F012CC9153AC82A210F2195E' nÃ£o foi localizado no repositÃ³rio do Windows. + CategoryInfo : NotSpecified: (:) [Write-Error], WriteErrorException + FullyQualifiedErrorId : Microsoft.PowerShell.Commands.WriteErrorException,windows-bridge.ps1";
    
    const result = simplifySyncErrorMessage(rawError);
    expect(result).toContain('Certificado digital');
    expect(result).toContain('964AA08BEFA9DF59F012CC9153AC82A210F2195E');
    expect(result).toContain('não foi localizado no repositório do Windows');
    expect(result).toContain('gerenciador de certificados');
    expect(result).not.toContain('windows-bridge.ps1');
    expect(result).not.toContain('CategoryInfo');
    expect(result).not.toContain('nÃ£o');
  });

  it('simplifies rate limit / consumo indevido error', () => {
    const rawError = 'SEFAZ retornou Consumo Indevido: cStat 656';
    const result = simplifySyncErrorMessage(rawError);
    expect(result).toContain('Consumo Indevido');
  });

  it('simplifies network timeout error', () => {
    const rawError = 'connect ETIMEDOUT 200.198.239.20:443';
    const result = simplifySyncErrorMessage(rawError);
    expect(result).toContain('conexão');
  });
});

describe('describeCombinedSyncResult', () => {
  it('combines identical certificate not found errors into a clean, single top message', () => {
    const psError = "Erro no bridge do Windows PowerShell (code 2): C:\\path\\windows-bridge.ps1 : Certificado com Thumbprint '964AA08BEFA9DF59F012CC9153AC82A210F2195E' não foi localizado no repositório do Windows. + CategoryInfo : NotSpecified: (:)";

    const result: CombinedSefazQueryResult = {
      success: false,
      documentsCount: 0,
      nfe: {
        success: false,
        cStat: 0,
        xMotivo: psError,
        ultNSU: '0',
        maxNSU: '0',
        documentsCount: 0,
        isComplete: false,
        error: psError,
      },
      cte: {
        success: false,
        cStat: 0,
        xMotivo: psError,
        ultNSU: '0',
        maxNSU: '0',
        documentsCount: 0,
        isComplete: false,
        error: psError,
      },
    };

    const presentation = describeCombinedSyncResult(result);
    expect(presentation.type).toBe('error');
    // Top message must NOT duplicate the error or contain raw script traces
    expect(presentation.message).toContain('Certificado digital');
    expect(presentation.message).toContain('gerenciador de certificados');
    expect(presentation.message).not.toContain('windows-bridge.ps1');
    expect(presentation.message).not.toContain('CategoryInfo');
    expect(presentation.message).not.toContain('CT-e: Erro no bridge');
  });

  it('handles partial technical error when one document type succeeds and other fails', () => {
    const psError = "Certificado com Thumbprint 'ABC' não foi localizado no repositório do Windows.";

    const result: CombinedSefazQueryResult = {
      success: false,
      documentsCount: 3,
      nfe: {
        success: true,
        cStat: 138,
        xMotivo: 'Documento localizado',
        ultNSU: '10',
        maxNSU: '10',
        documentsCount: 3,
        isComplete: true,
      },
      cte: {
        success: false,
        cStat: 0,
        xMotivo: psError,
        ultNSU: '0',
        maxNSU: '0',
        documentsCount: 0,
        isComplete: false,
        error: psError,
      },
    };

    const presentation = describeCombinedSyncResult(result);
    expect(presentation.type).toBe('error');
    expect(presentation.message).toContain('NF-e: 3 documento(s)');
    expect(presentation.message).toContain('CT-e:');
    expect(presentation.message).toContain('não foi localizado no repositório do Windows');
  });

  it('handles full success correctly', () => {
    const result: CombinedSefazQueryResult = {
      success: true,
      documentsCount: 5,
      nfe: {
        success: true,
        cStat: 138,
        xMotivo: 'Documento localizado',
        ultNSU: '100',
        maxNSU: '100',
        documentsCount: 3,
        isComplete: true,
      },
      cte: {
        success: true,
        cStat: 138,
        xMotivo: 'Documento localizado',
        ultNSU: '50',
        maxNSU: '50',
        documentsCount: 2,
        isComplete: true,
      },
    };

    const presentation = describeCombinedSyncResult(result);
    expect(presentation.type).toBe('success');
    expect(presentation.message).toBe('Sincronização concluída. NF-e: 3 documento(s), NSU 100. CT-e: 2 documento(s), NSU 50.');
  });
});

