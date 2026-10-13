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

import { registerSefazHandlers } from './sefazHandlers';

describe('sefazHandlers IPC', () => {
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
            } as any;
          }
          return null as any;
        }),
      } as any,
      settingsRepo: {
        getSettings: vi.fn().mockReturnValue({ sefaz_environment: 'production' }),
      } as any,
      distStateRepo: {
        getOrCreate: vi.fn((companyId: number, docType: string) => {
          if (docType === 'NFE') {
            return {
              last_nsu: '000000000007781',
              max_nsu: '000000000007882',
              status: 'RATE_LIMITED',
              next_query_at: '2026-10-13T12:07:37.207Z',
            };
          }
          return {
            last_nsu: '000000000001525',
            max_nsu: '000000000001525',
            status: 'IDLE',
            next_query_at: null,
          };
        }),
      } as any,
      distributionEngine: {
        syncCompanyDocuments: vi.fn(),
        cancel: vi.fn(),
        resetNSU: vi.fn(),
      } as any,
    };

    registerSefazHandlers(mockServices as ApplicationContext, () => mockWin);
  });

  it('sefaz:getStatus returns enriched status with cooldowns and state', async () => {
    const handler = handlers.get('sefaz:getStatus')!;
    const status = await handler(fakeEvent, 1);

    expect(status).toEqual({
      nfeLastNSU: '000000000007781',
      cteLastNSU: '000000000001525',
      isRunning: false,
      environment: 'production',
      nfeStatus: 'RATE_LIMITED',
      nfeNextQueryAt: '2026-10-13T12:07:37.207Z',
      cteStatus: 'IDLE',
      cteNextQueryAt: null,
    });
  });
});

