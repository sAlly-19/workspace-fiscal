import { describe, it, expect } from 'vitest';
import {
  createInitialWorkspaceState,
  switchWorkspaceMode,
  getActiveEnvironment,
  setActiveCompany,
  updateEnvironment,
  type WorkspaceState,
} from './workspace-controller';

describe('workspace-controller', () => {
  it('inicia com modo SEFAZ por padrao e filtros SEFAZ habilitados', () => {
    const state = createInitialWorkspaceState();
    expect(state.mode).toBe('SEFAZ');
    expect(state.activeCompanyId).toBeNull();
    expect(state.filters.docTypes).toEqual({ nfe: true, cte: true });
    expect(getActiveEnvironment(state)).toBe('homologation');
  });

  it('preserva empresa selecionada e limpa filtros especificos de SEFAZ ao alternar para NFSE', () => {
    const initialState: WorkspaceState = {
      mode: 'SEFAZ',
      activeCompanyId: 42,
      sefazEnvironment: 'production',
      nfseEnvironment: 'homologation',
      filters: {
        docTypes: { nfe: true, cte: false },
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        searchTerm: 'Fornecedor XYZ',
      },
    };

    const nextState = switchWorkspaceMode(initialState, 'NFSE');

    expect(nextState.mode).toBe('NFSE');
    // Empresa preservada
    expect(nextState.activeCompanyId).toBe(42);
    // Filtros de NFE/CTE removidos
    expect(nextState.filters.docTypes).toBeUndefined();
    // Filtros compativeis preservados
    expect(nextState.filters.startDate).toBe('2026-01-01');
    expect(nextState.filters.endDate).toBe('2026-01-31');
    expect(nextState.filters.searchTerm).toBe('Fornecedor XYZ');
  });

  it('restaura filtros padrao de docTypes ao voltar para SEFAZ', () => {
    const nfseState: WorkspaceState = {
      mode: 'NFSE',
      activeCompanyId: 42,
      sefazEnvironment: 'production',
      nfseEnvironment: 'homologation',
      filters: {
        startDate: '2026-01-01',
      },
    };

    const sefazState = switchWorkspaceMode(nfseState, 'SEFAZ');

    expect(sefazState.mode).toBe('SEFAZ');
    expect(sefazState.activeCompanyId).toBe(42);
    expect(sefazState.filters.docTypes).toEqual({ nfe: true, cte: true });
    expect(sefazState.filters.startDate).toBe('2026-01-01');
  });

  it('isola os ambientes de SEFAZ e NFSE independentemente', () => {
    let state = createInitialWorkspaceState({
      sefazEnvironment: 'production',
      nfseEnvironment: 'homologation',
    });

    // Em modo SEFAZ, reflete sefazEnvironment
    expect(getActiveEnvironment(state)).toBe('production');

    // Ao alternar para NFSE, reflete nfseEnvironment
    state = switchWorkspaceMode(state, 'NFSE');
    expect(getActiveEnvironment(state)).toBe('homologation');

    // Atualiza ambiente do modo atual (NFSE)
    state = updateEnvironment(state, 'production');
    expect(state.nfseEnvironment).toBe('production');
    expect(state.sefazEnvironment).toBe('production');

    // Volta para SEFAZ e atualiza para homologation
    state = switchWorkspaceMode(state, 'SEFAZ');
    state = updateEnvironment(state, 'homologation');
    expect(state.sefazEnvironment).toBe('homologation');
    // NFS-e continua em production
    expect(state.nfseEnvironment).toBe('production');
  });

  it('permite atualizar a empresa ativa preservando modo e filtros', () => {
    const state = createInitialWorkspaceState();
    const updated = setActiveCompany(state, 10);
    expect(updated.activeCompanyId).toBe(10);
    expect(updated.mode).toBe('SEFAZ');
  });
});

