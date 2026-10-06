import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApplicationContext } from '../services';

const handlers = new Map<string, (event: any, ...args: any[]) => Promise<any> | any>();

vi.mock('electron', () => {
  return {
    ipcMain: {
      handle: vi.fn((channel: string, handler: any) => {
        handlers.set(channel, handler);
      }),
      removeHandler: vi.fn((channel: string) => {
        handlers.delete(channel);
      }),
    },
    BrowserWindow: vi.fn(),
  };
});

// Import after electron mock is configured
import { registerNfseHandlers } from './nfseHandlers';

describe('nfseHandlers IPC', () => {
  let mockServices: Partial<ApplicationContext>;
  let mockWin: any;
  let fakeEvent: any;

  beforeEach(() => {
    handlers.clear();

    const mockWebContents = {
      mainFrame: {},
      send: vi.fn(),
    };

    mockWin = {
      webContents: mockWebContents,
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    fakeEvent = {
      sender: mockWebContents,
      senderFrame: mockWebContents.mainFrame,
    };

    mockServices = {
      companyService: {
        getById: vi.fn((id: number) => {
          if (id === 1) {
            return {
              id: 1,
              name: 'Empresa Ativa',
              cnpj: '12345678000190',
              is_active: true,
              created_at: '',
              updated_at: '',
            };
          }
          if (id === 2) {
            return {
              id: 2,
              name: 'Empresa Inativa',
              cnpj: '98765432000198',
              is_active: false,
              created_at: '',
              updated_at: '',
            };
          }
          return null;
        }),
      } as any,
      settingsRepo: {
        getSettings: vi.fn().mockReturnValue({
          nfse_environment: 'homologation',
        }),
      } as any,
      nfseSynchronizer: {
        sync: vi.fn().mockResolvedValue({ success: true, documentsCount: 5, eventsCount: 1 }),
        getStatus: vi.fn().mockReturnValue({ lastNsu: '10', maxNsu: '20', isRunning: false, lastError: null }),
        cancel: vi.fn().mockReturnValue(true),
        resetNsu: vi.fn().mockReturnValue(true),
      } as any,
      nfseDirectQuery: {
        queryByKey: vi.fn().mockResolvedValue({ success: true, eventsCount: 0, document: { id: 10 } }),
      } as any,
      nfseEventRepo: {
        findByAccessKey: vi.fn().mockReturnValue([
          { id: 1, access_key: '35260112345678000190550010000000011000000012345678', event_type: 'CANCELAMENTO' },
        ]),
      } as any,
    };

    registerNfseHandlers(mockServices as ApplicationContext, () => mockWin);
  });

  it('registra todos os canais de NFS-e obrigatorios', () => {
    expect(handlers.has('nfse:sync')).toBe(true);
    expect(handlers.has('nfse:getStatus')).toBe(true);
    expect(handlers.has('nfse:cancelSync')).toBe(true);
    expect(handlers.has('nfse:resetNSU')).toBe(true);
    expect(handlers.has('nfse:consultByKey')).toBe(true);
    expect(handlers.has('nfse:getEvents')).toBe(true);
  });

  it('rejeita chamadas com sender nao autorizado', async () => {
    const handler = handlers.get('nfse:getStatus')!;
    const unauthorizedEvent = {
      sender: {},
      senderFrame: {},
    };

    await expect(handler(unauthorizedEvent, 1)).rejects.toThrow('Origem IPC não autorizada.');
  });

  it('rejeita ID de empresa invalido ou inexistente', async () => {
    const syncHandler = handlers.get('nfse:sync')!;

    await expect(syncHandler(fakeEvent, -1)).rejects.toThrow('ID da empresa inválido.');
    await expect(syncHandler(fakeEvent, 'abc')).rejects.toThrow('ID da empresa inválido.');
    await expect(syncHandler(fakeEvent, 999)).rejects.toThrow('Empresa não encontrada.');
  });

  it('rejeita empresa inativa para sincronizacao', async () => {
    const syncHandler = handlers.get('nfse:sync')!;
    await expect(syncHandler(fakeEvent, 2)).rejects.toThrow('Empresa está inativa.');
  });

  it('rejeita ambiente invalido', async () => {
    const syncHandler = handlers.get('nfse:sync')!;
    await expect(syncHandler(fakeEvent, 1, 'invalid_env')).rejects.toThrow('Ambiente inválido');
  });

  it('encaminha progresso de sincronizacao para a janela principal', async () => {
    const syncHandler = handlers.get('nfse:sync')!;
    (mockServices.nfseSynchronizer!.sync as any).mockImplementationOnce(async (options: any) => {
      options.onProgress?.({ message: 'Lendo NSU 1...', currentNsu: '1', maxNsu: '10' });
      return { success: true, documentsCount: 1, eventsCount: 0 };
    });

    const result = await syncHandler(fakeEvent, 1, 'homologation');

    expect(result.success).toBe(true);
    expect(mockWin.webContents.send).toHaveBeenCalledWith('nfse:progress', expect.objectContaining({
      companyId: 1,
      message: 'Lendo NSU 1...',
      currentNsu: '1',
      maxNsu: '10',
    }));
  });

  it('consulta direta valida obrigatoriedade de chave de 50 digitos', async () => {
    const directQueryHandler = handlers.get('nfse:consultByKey')!;

    // 44 digitos (padrao NFE) deve falhar
    await expect(
      directQueryHandler(fakeEvent, 1, '35260112345678000190550010000000011000000012')
    ).rejects.toThrow('50 dígitos');

    // Chave com letras ou simbolos invalidos
    await expect(
      directQueryHandler(fakeEvent, 1, '3526011234567800019055001000000001100000001234567X')
    ).rejects.toThrow('50 dígitos');

    const valid50Key = '35260112345678000190550010000000011000000012345678';
    const result = await directQueryHandler(fakeEvent, 1, valid50Key, 'homologation');
    expect(result.success).toBe(true);
    expect(mockServices.nfseDirectQuery!.queryByKey).toHaveBeenCalledWith({
      companyId: 1,
      accessKey: valid50Key,
      environment: 'homologation',
    });
  });

  it('retorna eventos sanitizados por chave de 50 digitos', async () => {
    const getEventsHandler = handlers.get('nfse:getEvents')!;
    const valid50Key = '35260112345678000190550010000000011000000012345678';

    const events = await getEventsHandler(fakeEvent, 1, valid50Key, 'homologation');
    expect(Array.isArray(events)).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe('CANCELAMENTO');
    expect(mockServices.nfseEventRepo!.findByAccessKey).toHaveBeenCalledWith(1, valid50Key, 'homologation');
  });

  it('cancela e reseta NSU com seguranca', async () => {
    const cancelHandler = handlers.get('nfse:cancelSync')!;
    const resetHandler = handlers.get('nfse:resetNSU')!;

    expect(await cancelHandler(fakeEvent, 1, 'homologation')).toBe(true);
    expect(mockServices.nfseSynchronizer!.cancel).toHaveBeenCalledWith(1, 'homologation');

    expect(await resetHandler(fakeEvent, 1, 'homologation')).toBe(true);
    expect(mockServices.nfseSynchronizer!.resetNsu).toHaveBeenCalledWith(1, 'homologation');
  });
});

