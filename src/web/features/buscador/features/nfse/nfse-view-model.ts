import type { FiscalDocument, DocumentSearchFilters, PaginatedResult } from '@/core/buscador/domain/types';
import type { NfseEnvironment, NfseEvent } from '@/core/buscador/nfse/domain/types';
import type { NfseSyncResult, NfseSyncStatus } from '@/core/buscador/nfse/services/NfseSynchronizer';
import type { NfseDirectQueryResult } from '@/core/buscador/nfse/services/NfseDirectQueryService';

export interface NfseFilters {
  startDate?: string;
  endDate?: string;
  situacao?: string;
  issuerSearch?: string;
  recipientSearch?: string;
  documentNumber?: string;
  accessKey?: string;
  searchQuery?: string;
}

export interface NfsePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface NfseState {
  companyId: number | null;
  environment: NfseEnvironment;
  status: {
    lastNsu: string;
    maxNsu: string;
    isRunning: boolean;
    lastError?: string | null;
  };
  filters: NfseFilters;
  pagination: NfsePagination;
  documents: FiscalDocument[];
  loading: boolean;
  syncing: boolean;
  syncProgress?: {
    message: string;
    currentNsu?: string;
    maxNsu?: string;
    documentsCount?: number;
    eventsCount?: number;
  };
  selectedDocument?: FiscalDocument | null;
  selectedDocumentEvents: NfseEvent[];
  eventsLoading: boolean;
  contractGateError?: string | null;
  isPdfAvailable: boolean;
}

export interface NfseViewModelApi {
  searchDocuments: (filters: DocumentSearchFilters) => Promise<PaginatedResult<FiscalDocument>>;
  getStatus: (companyId: number, environment?: NfseEnvironment) => Promise<NfseSyncStatus>;
  sync: (companyId: number, environment?: NfseEnvironment) => Promise<NfseSyncResult>;
  cancelSync: (companyId: number, environment?: NfseEnvironment) => Promise<boolean>;
  resetNsu: (companyId: number, environment?: NfseEnvironment) => Promise<boolean>;
  consultByKey: (companyId: number, accessKey: string, environment?: NfseEnvironment) => Promise<NfseDirectQueryResult>;
  getEvents: (companyId: number, accessKey: string, environment?: NfseEnvironment) => Promise<NfseEvent[]>;
}

export class NfseViewModel {
  private state: NfseState;
  private readonly listeners = new Set<(state: NfseState) => void>();

  constructor(
    private readonly api: NfseViewModelApi,
    initialCompanyId: number | null = null,
    initialEnvironment: NfseEnvironment = 'homologation'
  ) {
    this.state = {
      companyId: initialCompanyId,
      environment: initialEnvironment,
      status: {
        lastNsu: '0',
        maxNsu: '0',
        isRunning: false,
        lastError: null,
      },
      filters: {},
      pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
      documents: [],
      loading: false,
      syncing: false,
      selectedDocument: null,
      selectedDocumentEvents: [],
      eventsLoading: false,
      contractGateError: null,
      isPdfAvailable: false,
    };
  }

  public getState(): NfseState {
    return this.state;
  }

  public subscribe(listener: (state: NfseState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(updater: Partial<NfseState>): void {
    this.state = { ...this.state, ...updater };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public setCompany(companyId: number | null): void {
    this.updateState({
      companyId,
      selectedDocument: null,
      selectedDocumentEvents: [],
      contractGateError: null,
    });
  }

  public setEnvironment(environment: NfseEnvironment): void {
    this.updateState({
      environment,
      contractGateError: null,
    });
  }

  public setFilters(filters: Partial<NfseFilters>): void {
    this.updateState({
      filters: { ...this.state.filters, ...filters },
      pagination: { ...this.state.pagination, page: 1 },
    });
  }

  public setPage(page: number): void {
    this.updateState({
      pagination: { ...this.state.pagination, page },
    });
  }

  public setPageSize(pageSize: number): void {
    this.updateState({
      pagination: { ...this.state.pagination, pageSize, page: 1 },
    });
  }

  public getPdfUnavailableMessage(): string {
    return 'PDF indisponível nesta etapa';
  }

  public async loadStatus(): Promise<void> {
    if (!this.state.companyId) return;
    try {
      const status: any = await this.api.getStatus(this.state.companyId, this.state.environment);
      const lastNsu = status?.last_nsu ?? status?.lastNsu ?? '0';
      const maxNsu = status?.max_nsu ?? status?.maxNsu ?? '0';
      const isRunning = status?.status === 'RUNNING' || Boolean(status?.isRunning);
      const lastError = status?.last_error ?? status?.lastError ?? null;
      this.updateState({
        status: {
          lastNsu,
          maxNsu,
          isRunning,
          lastError,
        },
      });
    } catch {
      // Ignora erro silencioso de status
    }
  }

  public async loadDocuments(): Promise<void> {
    if (!this.state.companyId) {
      this.updateState({ documents: [], pagination: { ...this.state.pagination, total: 0, totalPages: 0 } });
      return;
    }

    this.updateState({ loading: true });

    try {
      const filters: DocumentSearchFilters = {
        company_id: this.state.companyId,
        document_types: ['NFSE'],
        environment: this.state.environment,
        start_date: this.state.filters.startDate,
        end_date: this.state.filters.endDate,
        document_number: this.state.filters.documentNumber,
        access_key: this.state.filters.accessKey,
        issuer_cnpj_or_name: this.state.filters.issuerSearch,
        search_query: this.state.filters.searchQuery,
        page: this.state.pagination.page,
        page_size: this.state.pagination.pageSize,
      };

      const result = await this.api.searchDocuments(filters);

      this.updateState({
        documents: result.items,
        pagination: {
          page: result.page,
          pageSize: result.page_size,
          total: result.total,
          totalPages: result.total_pages,
        },
        loading: false,
      });
    } catch (err: any) {
      this.updateState({ loading: false });
      throw err;
    }
  }

  public async startSync(): Promise<NfseSyncResult> {
    if (!this.state.companyId) {
      return {
        success: false,
        documentsCount: 0,
        eventsCount: 0,
        lastNsu: this.state.status.lastNsu,
        maxNsu: this.state.status.maxNsu,
        error: 'Nenhuma empresa selecionada.',
      };
    }

    this.updateState({ syncing: true, contractGateError: null });

    try {
      const result = await this.api.sync(this.state.companyId, this.state.environment);
      this.updateState({ syncing: false });
      if (result.success) {
        await this.loadStatus();
        await this.loadDocuments();
      } else if (result.error && (result.error.includes('OpenAPI') || result.error.includes('wire contract'))) {
        this.updateState({ contractGateError: result.error });
      }
      return result;
    } catch (err: any) {
      const message = err?.message || 'Falha na sincronização';
      this.updateState({
        syncing: false,
        contractGateError: message.includes('OpenAPI') || message.includes('wire contract') || message.includes('NfseContractError')
          ? message
          : null,
      });
      return {
        success: false,
        documentsCount: 0,
        eventsCount: 0,
        lastNsu: this.state.status.lastNsu,
        maxNsu: this.state.status.maxNsu,
        error: message,
      };
    }
  }

  public async cancelSync(): Promise<boolean> {
    if (!this.state.companyId) return false;
    const ok = await this.api.cancelSync(this.state.companyId, this.state.environment);
    this.updateState({ syncing: false });
    return ok;
  }

  public async resetNsu(): Promise<boolean> {
    if (!this.state.companyId) return false;
    const ok = await this.api.resetNsu(this.state.companyId, this.state.environment);
    await this.loadStatus();
    return ok;
  }

  public async queryByKey(accessKey: string): Promise<NfseDirectQueryResult> {
    if (!this.state.companyId) {
      return { success: false, eventsCount: 0, error: 'Nenhuma empresa selecionada.' };
    }

    try {
      const result = await this.api.consultByKey(this.state.companyId, accessKey, this.state.environment);
      if (result.success) {
        await this.loadDocuments();
      } else if (result.error && (result.error.includes('OpenAPI') || result.error.includes('wire contract'))) {
        this.updateState({ contractGateError: result.error });
      }
      return result;
    } catch (err: any) {
      const message = err?.message || 'Falha na consulta direta';
      if (message.includes('OpenAPI') || message.includes('wire contract') || message.includes('NfseContractError')) {
        this.updateState({ contractGateError: message });
      }
      return { success: false, eventsCount: 0, error: message };
    }
  }

  public async selectDocumentForDetails(doc: FiscalDocument | null): Promise<void> {
    if (!doc) {
      this.updateState({ selectedDocument: null, selectedDocumentEvents: [] });
      return;
    }

    this.updateState({ selectedDocument: doc, eventsLoading: true });

    try {
      const events = await this.api.getEvents(doc.company_id, doc.access_key, doc.environment as NfseEnvironment);
      this.updateState({
        selectedDocumentEvents: events || [],
        eventsLoading: false,
      });
    } catch {
      this.updateState({
        selectedDocumentEvents: [],
        eventsLoading: false,
      });
    }
  }
}

