import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FolderWatcherService } from './folder-watcher.service';


async function waitForCondition(fn: () => boolean, timeoutMs = 2000, stepMs = 25): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return fn();
}

describe('FolderWatcherService', () => {
  let tempDir: string;
  let service: FolderWatcherService;
  let mockImportService: any;
  let mockActivityLogService: any;
  let mockWorkspaceRepo: any;
  let emittedEvents: Array<{ event: string; data: any }>;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsf-watch-test-'));
    emittedEvents = [];

    mockImportService = {
      createImportJob: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
      processFile: vi.fn().mockResolvedValue({ success: true }),
      markJobCompleted: vi.fn().mockResolvedValue(undefined),
    };

    mockActivityLogService = {
      record: vi.fn().mockResolvedValue({ id: 'log-1' }),
    };

    mockWorkspaceRepo = {
      getFolderById: vi.fn(),
      getActiveWatchedFolders: vi.fn().mockResolvedValue([]),
      getWatchFiles: vi.fn().mockResolvedValue([]),
      getExistingAccessKeysForFolder: vi.fn().mockResolvedValue(new Set()),
      recordWatchFile: vi.fn().mockResolvedValue(undefined),
      recordWatchFilesBatch: vi.fn().mockResolvedValue(undefined),
    };

    service = new FolderWatcherService({
      importService: mockImportService,
      activityLogService: mockActivityLogService,
      workspaceRepository: mockWorkspaceRepo,
      debounceMs: 50, // fast debounce for tests
    });

    service.on('event', (payload: { event: string; data: any }) => {
      emittedEvents.push(payload);
    });
  });

  afterEach(async () => {
    service.stopAll();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('filters non-xml files and processes valid xml when prompt is confirmed', async () => {
    // Create an XML and a non-XML file in tempDir
    const xmlFile = path.join(tempDir, 'nfe_test_01.xml');
    const txtFile = path.join(tempDir, 'ignored.txt');
    fs.writeFileSync(xmlFile, '<NFe><infNFe>teste</infNFe></NFe>', 'utf-8');
    fs.writeFileSync(txtFile, 'not an xml', 'utf-8');

    mockWorkspaceRepo.getFolderById.mockResolvedValue({
      id: 'folder-1',
      name: 'Entradas 2026',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    await service.startWatcher({
      id: 'folder-1',
      name: 'Entradas 2026',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    // Wait for catch-up scanning
    await waitForCondition(() => Boolean(emittedEvents.find((e) => e.event === 'WATCH_PROMPT_IMPORT')));

    // Initially queues for confirmation
    expect(mockImportService.createImportJob).not.toHaveBeenCalled();
    const promptEvent = emittedEvents.find((e) => e.event === 'WATCH_PROMPT_IMPORT');
    expect(promptEvent).toBeDefined();
    expect(promptEvent?.data.folderId).toBe('folder-1');
    expect(promptEvent?.data.pendingCount).toBe(1);

    // Confirm import
    const result = await service.confirmPendingImport('folder-1');
    expect(result.importedCount).toBe(1);
    expect(mockImportService.createImportJob).toHaveBeenCalled();
    expect(mockImportService.processFile).toHaveBeenCalledTimes(1);
    expect(mockImportService.markJobCompleted).toHaveBeenCalledWith('mock-job-id');

    // Check emitted SSE event
    const autoEvent = emittedEvents.find((e) => e.event === 'WATCH_AUTO_IMPORTED');
    expect(autoEvent).toBeDefined();
    expect(autoEvent?.data.folderId).toBe('folder-1');
    expect(autoEvent?.data.importedCount).toBe(1);

    // Check emitted progress events
    const progressEvents = emittedEvents.filter((e) => e.event === 'WATCH_SYNC_PROGRESS');
    expect(progressEvents.length).toBeGreaterThanOrEqual(2);
    expect(progressEvents.some((e) => e.data.isSyncing === true)).toBe(true);
    expect(progressEvents.some((e) => e.data.isSyncing === false && e.data.phase === 'completed')).toBe(true);

    // Activity log should have been recorded
    expect(mockActivityLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'INFO',
        module: 'NFVIEW',
        action: 'WATCH_AUTO_IMPORTED',
      })
    );
  });

  it('queues files in prompt mode without auto-importing, until confirmPendingImport is called', async () => {
    const xmlFile = path.join(tempDir, 'nfe_prompt_01.xml');
    fs.writeFileSync(xmlFile, '<NFe><infNFe>prompt</infNFe></NFe>', 'utf-8');

    await service.startWatcher({
      id: 'folder-2',
      name: 'Aguardando Revisão',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    await waitForCondition(() => service.getPendingFiles('folder-2').length === 1);

    // In prompt mode, importService should NOT be called automatically
    expect(mockImportService.createImportJob).not.toHaveBeenCalled();

    // But WATCH_PROMPT_IMPORT should be emitted
    const promptEvent = emittedEvents.find((e) => e.event === 'WATCH_PROMPT_IMPORT');
    expect(promptEvent).toBeDefined();
    expect(promptEvent?.data.folderId).toBe('folder-2');
    expect(promptEvent?.data.pendingCount).toBe(1);

    // Pending files should be reported
    const pending = service.getPendingFiles('folder-2');
    expect(pending.length).toBe(1);

    // Call confirmPendingImport
    const result = await service.confirmPendingImport('folder-2');
    expect(result.importedCount).toBe(1);
    expect(mockImportService.createImportJob).toHaveBeenCalled();
    expect(service.getPendingFiles('folder-2').length).toBe(0);
  });

  it('dismisses pending files and ignores them on subsequent checks', async () => {
    const xmlFile = path.join(tempDir, 'nfe_dismiss.xml');
    fs.writeFileSync(xmlFile, '<NFe><infNFe>dismiss</infNFe></NFe>', 'utf-8');

    await service.startWatcher({
      id: 'folder-3',
      name: 'Pasta Teste',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    await waitForCondition(() => service.getPendingFiles('folder-3').length === 1);
    expect(service.getPendingFiles('folder-3').length).toBe(1);

    // Dismiss pending
    service.dismissPendingImport('folder-3');
    expect(service.getPendingFiles('folder-3').length).toBe(0);

    // Trigger watcher again by checking known files or rescanning
    await service.scanDirectory('folder-3', 'Pasta Teste', tempDir, false);
    expect(service.getPendingFiles('folder-3').length).toBe(0);
  });

  it('stops watcher when folder is deleted or mode is off', async () => {
    await service.startWatcher({
      id: 'folder-4',
      name: 'Pasta Stop',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    expect(service.isWatching('folder-4')).toBe(true);

    service.stopWatcher('folder-4');
    expect(service.isWatching('folder-4')).toBe(false);
  });

  it('skips already imported files loaded from repository persistence on catch-up scan', async () => {
    const xmlFile = path.join(tempDir, 'nfe_persisted.xml');
    fs.writeFileSync(xmlFile, '<NFe><infNFe>persisted</infNFe></NFe>', 'utf-8');

    // Repository already knows this file was imported in a past session
    mockWorkspaceRepo.getWatchFiles.mockResolvedValue([
      { filePath: xmlFile, status: 'imported' },
    ]);

    await service.startWatcher({
      id: 'folder-persisted',
      name: 'Pasta Persistida',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    await new Promise((r) => setTimeout(r, 120));

    // Should NOT queue or call processFile because the file was recognized as already imported
    expect(service.getPendingFiles('folder-persisted').length).toBe(0);
    expect(mockImportService.createImportJob).not.toHaveBeenCalled();
    expect(mockImportService.processFile).not.toHaveBeenCalled();
  });

  it('defers catch-up scan when delayScanMs is set without blocking startWatcher', async () => {
    const xmlFile = path.join(tempDir, 'nfe_deferred.xml');
    fs.writeFileSync(xmlFile, '<NFe><infNFe>deferred</infNFe></NFe>', 'utf-8');

    const started = await service.startWatcher(
      {
        id: 'folder-delay',
        name: 'Pasta Delay',
        watchPath: tempDir,
        watchRecursive: false,
        watchMode: 'prompt',
      },
      { delayScanMs: 200 }
    );

    // startWatcher returns true immediately, watcher is active
    expect(started).toBe(true);
    expect(service.isWatching('folder-delay')).toBe(true);

    // After only 50ms, the catch-up scan has not run yet
    await new Promise((r) => setTimeout(r, 50));
    expect(service.getPendingFiles('folder-delay').length).toBe(0);

    // After delay passes (e.g. 250ms), the scan completes and queues pending file
    await new Promise((r) => setTimeout(r, 220));
    expect(service.getPendingFiles('folder-delay').length).toBe(1);
  });

  it('reconcilia arquivos com chave de acesso pertencente a outra pasta sem colocar em pendingFiles', async () => {
    const key = '35260100000000000000550010000000099000000099';
    const xmlFile = path.join(tempDir, `${key}-nfe.xml`);
    fs.writeFileSync(xmlFile, `<NFe><infNFe Id="NFe${key}"></infNFe></NFe>`, 'utf-8');

    // Chave existente globalmente (importada em outra pasta)
    mockWorkspaceRepo.getExistingDocumentIdentifiers = vi.fn().mockResolvedValue({
      accessKeys: new Set([key]),
      numbersByIssuer: new Set(),
      rawXmlFileNames: new Set(),
    });

    await service.startWatcher({
      id: 'folder-supreme',
      name: 'SUPREME',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    await new Promise((r) => setTimeout(r, 120));

    // Nao deve ter pendencias
    expect(service.getPendingFiles('folder-supreme').length).toBe(0);
    // Nao deve ter emitido WATCH_PROMPT_IMPORT
    const promptEvent = emittedEvents.find((e) => e.event === 'WATCH_PROMPT_IMPORT');
    expect(promptEvent).toBeUndefined();
    // Deve ter gravado em lote como imported
    expect(mockWorkspaceRepo.recordWatchFilesBatch).toHaveBeenCalledWith(
      'folder-supreme',
      expect.arrayContaining([{ filePath: xmlFile, status: 'imported' }])
    );
  });

  it('arquivo com nome generico (nota.xml) passa pelo sniffer e se bate com NFS-e do banco e reconciliado', async () => {
    const xmlFile = path.join(tempDir, 'nota.xml');
    fs.writeFileSync(
      xmlFile,
      `<CompNfse><Nfse><InfNfse><Numero>7711</Numero><PrestadorServico><IdentificacaoPrestador><CpfCnpj><Cnpj>99887766000199</Cnpj></CpfCnpj></IdentificacaoPrestador></PrestadorServico></InfNfse></Nfse></CompNfse>`,
      'utf-8'
    );

    mockWorkspaceRepo.getExistingDocumentIdentifiers = vi.fn().mockResolvedValue({
      accessKeys: new Set(),
      numbersByIssuer: new Set(['99887766000199:7711']),
      rawXmlFileNames: new Set(['nota.xml']), // Mesmo que o nome de arquivo exista, sendo generico ele deve passar pelo sniffer
    });

    await service.startWatcher({
      id: 'folder-nfse',
      name: 'NFS-e Folder',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'prompt',
    });

    await new Promise((r) => setTimeout(r, 400));

    // Reconciliado com sucesso
    expect(service.getPendingFiles('folder-nfse').length).toBe(0);
    expect(mockWorkspaceRepo.recordWatchFilesBatch).toHaveBeenCalledWith(
      'folder-nfse',
      expect.arrayContaining([{ filePath: xmlFile, status: 'imported' }])
    );
  });
});

