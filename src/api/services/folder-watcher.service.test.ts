import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FolderWatcherService } from './folder-watcher.service';

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

  it('filters non-xml files and processes valid xml in auto mode', async () => {
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
      watchMode: 'auto',
    });

    await service.startWatcher({
      id: 'folder-1',
      name: 'Entradas 2026',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'auto',
    });

    // Wait for catch-up processing
    await new Promise((r) => setTimeout(r, 120));

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

    await new Promise((r) => setTimeout(r, 120));

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

    await new Promise((r) => setTimeout(r, 120));
    expect(service.getPendingFiles('folder-3').length).toBe(1);

    // Dismiss pending
    service.dismissPendingImport('folder-3');
    expect(service.getPendingFiles('folder-3').length).toBe(0);

    // Trigger watcher again by checking known files or rescanning
    await service.scanDirectory('folder-3', 'Pasta Teste', tempDir, false, 'prompt');
    expect(service.getPendingFiles('folder-3').length).toBe(0);
  });

  it('stops watcher when folder is deleted or mode is off', async () => {
    await service.startWatcher({
      id: 'folder-4',
      name: 'Pasta Stop',
      watchPath: tempDir,
      watchRecursive: false,
      watchMode: 'auto',
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
      watchMode: 'auto',
    });

    await new Promise((r) => setTimeout(r, 120));

    // Should NOT call processFile because the file was recognized as already imported
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
        watchMode: 'auto',
      },
      { delayScanMs: 200 }
    );

    // startWatcher returns true immediately, watcher is active
    expect(started).toBe(true);
    expect(service.isWatching('folder-delay')).toBe(true);

    // After only 50ms, the catch-up scan has not run yet
    await new Promise((r) => setTimeout(r, 50));
    expect(mockImportService.createImportJob).not.toHaveBeenCalled();

    // After delay passes (e.g. 250ms), the scan completes
    await new Promise((r) => setTimeout(r, 220));
    expect(mockImportService.createImportJob).toHaveBeenCalled();
  });
});

