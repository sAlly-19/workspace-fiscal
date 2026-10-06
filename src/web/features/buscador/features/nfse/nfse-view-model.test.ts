import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NfseViewModel,
  type NfseViewModelApi,
} from './nfse-view-model';
import type { FiscalDocument } from '@/core/buscador/domain/types';
import type { NfseEvent } from '@/core/buscador/nfse/domain/types';

describe('NfseViewModel', () => {
  let mockApi: NfseViewModelApi;
  let vm: NfseViewModel;

  const valid50Key = '35260112345678000190550010000000011000000012345678';
  const sampleDoc: FiscalDocument = {
    id: 1,
    company_id: 1,
    document_type: 'NFSE',
    environment: 'homologation',
    origin: 'NFSE_ADN_DISTRIBUTION',
    access_key: valid50Key,
    document_number: '123',
    series: '1',
    issue_date: '2026-03-15T10:00:00',
    received_at: '2026-03-15T10:05:00',
    issuer_cnpj: '12345678000190',
    issuer_name: 'Prestador Alpha',
    recipient_cnpj: '98765432000198',
    recipient_name: 'Tomador Beta',
    total_value: 1500.5,
    xml_path: 'docs/1/NFSE/homologation/sample.xml',
    xml_status: 'XML_DISPONIVEL',
    pdf_status: 'PDF_INDISPONIVEL',
    situacao_fiscal: 'AUTORIZADA',
    content_hash: 'abcdef123456',
    nsu: '1',
    schema_type: 'DPS',
    created_at: '2026-03-15T10:05:00',
    updated_at: '2026-03-15T10:05:00',
  };

  const sampleEvent: NfseEvent = {
    id: 1,
    company_id: 1,
    environment: 'homologation',
    access_key: valid50Key,
    event_type: 'CANCELAMENTO',
    event_sequence: 1,
    event_date: '2026-03-16T11:00:00',
    schema_type: 'DPS',
    xml_path: 'docs/1/NFSE/homologation/event.xml',
    content_hash: 'ev123456',
    created_at: '2026-03-16T11:00:00',
    updated_at: '2026-03-16T11:00:00',
  };

  beforeEach(() => {
    mockApi = {
      searchDocuments: vi.fn().mockResolvedValue({
        items: [sampleDoc],
        total: 1,
        page: 1,
        page_size: 50,
        total_pages: 1,
      }),
      getStatus: vi.fn().mockResolvedValue({
        lastNsu: '10',
        maxNsu: '25',
        isRunning: false,
        lastError: null,
      }),
      sync: vi.fn().mockResolvedValue({
        success: true,
        documentsCount: 1,
        eventsCount: 0,
        lastNsu: '25',
        maxNsu: '25',
      }),
      cancelSync: vi.fn().mockResolvedValue(true),
      resetNsu: vi.fn().mockResolvedValue(true),
      consultByKey: vi.fn().mockResolvedValue({
        success: true,
        document: sampleDoc,
        eventsCount: 0,
      }),
      getEvents: vi.fn().mockResolvedValue([sampleEvent]),
    };

    vm = new NfseViewModel(mockApi, 1, 'homologation');
  });

  it('inicializa com estado padrao e sem acao de PDF', () => {
    const state = vm.getState();
    expect(state.companyId).toBe(1);
    expect(state.environment).toBe('homologation');
    expect(state.documents).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.isPdfAvailable).toBe(false);
    expect(vm.getPdfUnavailableMessage()).toBe('PDF indisponível nesta etapa');
  });

  it('carrega documentos aplicando filtros de periodo, situacao, prestador, tomador, numero e chave', async () => {
    vm.setFilters({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      situacao: 'AUTORIZADA',
      issuerSearch: 'Alpha',
      recipientSearch: 'Beta',
      documentNumber: '123',
      accessKey: valid50Key,
    });

    await vm.loadDocuments();

    expect(mockApi.searchDocuments).toHaveBeenCalledWith(expect.objectContaining({
      company_id: 1,
      document_types: ['NFSE'],
      environment: 'homologation',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      document_number: '123',
      access_key: valid50Key,
    }));

    const state = vm.getState();
    expect(state.documents).toHaveLength(1);
    expect(state.pagination.total).toBe(1);
  });

  it('gerencia estado de sincronizacao, cancelamento e reset do NSU', async () => {
    await vm.loadStatus();
    expect(vm.getState().status.lastNsu).toBe('10');
    expect(vm.getState().status.maxNsu).toBe('25');

    const syncPromise = vm.startSync();
    expect(vm.getState().syncing).toBe(true);

    const result = await syncPromise;
    expect(result.success).toBe(true);
    expect(vm.getState().syncing).toBe(false);

    await vm.cancelSync();
    expect(mockApi.cancelSync).toHaveBeenCalledWith(1, 'homologation');

    await vm.resetNsu();
    expect(mockApi.resetNsu).toHaveBeenCalledWith(1, 'homologation');
  });

  it('executa consulta direta por chave de 50 digitos e atualiza lista', async () => {
    const result = await vm.queryByKey(valid50Key);
    expect(result.success).toBe(true);
    expect(mockApi.consultByKey).toHaveBeenCalledWith(1, valid50Key, 'homologation');
    expect(mockApi.searchDocuments).toHaveBeenCalled();
  });

  it('carrega eventos ao selecionar documento para detalhes', async () => {
    await vm.selectDocumentForDetails(sampleDoc);

    const state = vm.getState();
    expect(state.selectedDocument).toEqual(sampleDoc);
    expect(state.selectedDocumentEvents).toHaveLength(1);
    expect(state.selectedDocumentEvents[0].event_type).toBe('CANCELAMENTO');
    expect(mockApi.getEvents).toHaveBeenCalledWith(1, valid50Key, 'homologation');
  });

  it('trata erro orientativo de contrato wire gate sem mascarar como certificado', async () => {
    mockApi.sync = vi.fn().mockRejectedValue(
      new Error('NfseContractError: O contrato wire oficial da NFS-e Nacional ainda não está homologado. Forneça a documentação OpenAPI/Swagger oficial.')
    );

    const result = await vm.startSync();
    expect(result.success).toBe(false);

    const state = vm.getState();
    expect(state.contractGateError).toContain('OpenAPI/Swagger oficial');
    expect(state.contractGateError).not.toContain('certificado');
  });

  it('suporta paginacao e reflete contagens e estado vazio', async () => {
    mockApi.searchDocuments = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      page_size: 20,
      total_pages: 0,
    });

    vm.setPage(2);
    vm.setPageSize(20);
    await vm.loadDocuments();

    const state = vm.getState();
    expect(state.documents).toEqual([]);
    expect(state.pagination.total).toBe(0);
    expect(state.pagination.page).toBe(2);
    expect(state.pagination.pageSize).toBe(20);
  });
});

