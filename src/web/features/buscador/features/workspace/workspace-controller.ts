export type BuscadorWorkspaceMode = 'SEFAZ' | 'NFSE';

export interface WorkspaceFilters {
  docTypes?: { nfe: boolean; cte: boolean };
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  situacao?: string;
}

export interface WorkspaceState {
  mode: BuscadorWorkspaceMode;
  activeCompanyId: number | null;
  sefazEnvironment: 'homologation' | 'production';
  nfseEnvironment: 'homologation' | 'production';
  filters: WorkspaceFilters;
}

export function createInitialWorkspaceState(initial?: Partial<WorkspaceState>): WorkspaceState {
  return {
    mode: initial?.mode ?? 'SEFAZ',
    activeCompanyId: initial?.activeCompanyId ?? null,
    sefazEnvironment: initial?.sefazEnvironment ?? 'homologation',
    nfseEnvironment: initial?.nfseEnvironment ?? 'homologation',
    filters: initial?.filters ?? {
      docTypes: { nfe: true, cte: true },
    },
  };
}

export function switchWorkspaceMode(
  state: WorkspaceState,
  newMode: BuscadorWorkspaceMode
): WorkspaceState {
  if (state.mode === newMode) return state;

  if (newMode === 'NFSE') {
    // Preserve company and common filters, remove SEFAZ docTypes
    const { docTypes, ...remainingFilters } = state.filters;
    return {
      ...state,
      mode: 'NFSE',
      filters: remainingFilters,
    };
  }

  // Switch back to SEFAZ: restore default docTypes
  return {
    ...state,
    mode: 'SEFAZ',
    filters: {
      ...state.filters,
      docTypes: { nfe: true, cte: true },
    },
  };
}

export function getActiveEnvironment(state: WorkspaceState): 'homologation' | 'production' {
  return state.mode === 'SEFAZ' ? state.sefazEnvironment : state.nfseEnvironment;
}

export function setActiveCompany(state: WorkspaceState, companyId: number | null): WorkspaceState {
  return {
    ...state,
    activeCompanyId: companyId,
  };
}

export function updateEnvironment(
  state: WorkspaceState,
  environment: 'homologation' | 'production'
): WorkspaceState {
  if (state.mode === 'SEFAZ') {
    return { ...state, sefazEnvironment: environment };
  }
  return { ...state, nfseEnvironment: environment };
}

