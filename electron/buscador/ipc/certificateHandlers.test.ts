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

import { registerCertificateHandlers } from './certificateHandlers';

describe('certificateHandlers IPC', () => {
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
            } as any;
          }
          return null as any;
        }),
      } as any,
      certRepo: {
        getByCompanyId: vi.fn((id: number) => {
          if (id === 1) {
            return {
              id: 1,
              company_id: 1,
              subject: 'CN=Empresa Ativa, OU=Certificado A1',
              issuer: 'AC Raiz',
              serial_number: '12345',
              thumbprint: '964AA08BEFA9DF59F012CC9153AC82A210F2195E',
              valid_from: '2026-01-01T00:00:00Z',
              valid_to: '2027-01-01T00:00:00Z',
              provider: 'windows_store',
              has_private_key: true,
              is_expired: false,
            };
          }
          return null;
        }),
        associate: vi.fn(),
      } as any,
      certProvider: {
        listCertificates: vi.fn().mockResolvedValue([]),
        getCertificate: vi.fn(),
      } as any,
    };

    registerCertificateHandlers(mockServices as ApplicationContext, () => mockWin);
  });

  it('registers certificates:checkHealth handler', () => {
    expect(handlers.has('certificates:checkHealth')).toBe(true);
  });

  it('returns NO_CERT when company has no certificate in certRepo', async () => {
    const handler = handlers.get('certificates:checkHealth')!;
    (mockServices.companyService!.getById as any).mockReturnValueOnce({ id: 2, name: 'Empresa Sem Cert' });
    const res = await handler(fakeEvent, 2);
    expect(res).toEqual({
      status: 'NO_CERT',
      message: 'Nenhum certificado vinculado a esta empresa.',
    });
  });

  it('returns NOT_FOUND_IN_STORE when cert is in certRepo but not found in live store', async () => {
    const handler = handlers.get('certificates:checkHealth')!;
    (mockServices.certProvider!.getCertificate as any).mockResolvedValueOnce(null);

    const result = await handler(fakeEvent, 1);
    expect(result.status).toBe('NOT_FOUND_IN_STORE');
    expect(result.message).toContain('não localizado no repositório do Windows');
    expect(result.thumbprint).toBe('964AA08BEFA9DF59F012CC9153AC82A210F2195E');
  });

  it('returns EXPIRED when cert in live store is expired', async () => {
    const handler = handlers.get('certificates:checkHealth')!;
    (mockServices.certProvider!.getCertificate as any).mockResolvedValueOnce({
      subject: 'CN=Empresa Ativa',
      thumbprint: '964AA08BEFA9DF59F012CC9153AC82A210F2195E',
      valid_to: '2020-01-01T00:00:00Z',
      has_private_key: true,
      is_expired: true,
    });

    const result = await handler(fakeEvent, 1);
    expect(result.status).toBe('EXPIRED');
    expect(result.message).toContain('expirou em');
  });

  it('returns NO_PRIVATE_KEY when cert in live store lacks private key', async () => {
    const handler = handlers.get('certificates:checkHealth')!;
    (mockServices.certProvider!.getCertificate as any).mockResolvedValueOnce({
      subject: 'CN=Empresa Ativa',
      thumbprint: '964AA08BEFA9DF59F012CC9153AC82A210F2195E',
      valid_to: '2028-01-01T00:00:00Z',
      has_private_key: false,
      is_expired: false,
    });

    const result = await handler(fakeEvent, 1);
    expect(result.status).toBe('NO_PRIVATE_KEY');
    expect(result.message).toContain('não possui chave privada acessível');
  });

  it('returns READY when cert in live store is valid and present', async () => {
    const handler = handlers.get('certificates:checkHealth')!;
    (mockServices.certProvider!.getCertificate as any).mockResolvedValueOnce({
      subject: 'CN=Empresa Ativa',
      thumbprint: '964AA08BEFA9DF59F012CC9153AC82A210F2195E',
      valid_to: '2028-01-01T00:00:00Z',
      has_private_key: true,
      is_expired: false,
    });

    const result = await handler(fakeEvent, 1);
    expect(result.status).toBe('READY');
    expect(result.message).toContain('ativo e válido');
  });
});
