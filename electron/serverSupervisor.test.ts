import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { LocalServerSupervisor, ServerStatus } from './serverSupervisor';

class MockHttpServer extends EventEmitter {
  public closed = false;
  private port: number;

  constructor(port = 3000) {
    super();
    this.port = port;
  }

  address() {
    return { port: this.port };
  }

  close(cb?: (err?: Error) => void) {
    this.closed = true;
    if (cb) cb();
    this.emit('close');
    return this;
  }
}

describe('LocalServerSupervisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the server and reports initial running status and port', async () => {
    const mockServer = new MockHttpServer(4567);
    const factory = vi.fn().mockResolvedValue({ server: mockServer, port: 4567 });

    const supervisor = new LocalServerSupervisor(factory);
    const port = await supervisor.start();

    expect(port).toBe(4567);
    expect(factory).toHaveBeenCalledTimes(1);

    const status = supervisor.getStatus();
    expect(status.running).toBe(true);
    expect(status.port).toBe(4567);
    expect(status.restarts).toBe(0);
  });

  it('does not auto-restart when stop() is explicitly called (isStopping guard)', async () => {
    const mockServer = new MockHttpServer(4567);
    const factory = vi.fn().mockResolvedValue({ server: mockServer, port: 4567 });

    const supervisor = new LocalServerSupervisor(factory, {
      backoffMs: [10, 20, 30],
    });
    await supervisor.start();

    await supervisor.stop();

    expect(mockServer.closed).toBe(true);
    expect(supervisor.getStatus().running).toBe(false);
    expect(factory).toHaveBeenCalledTimes(1); // not called again
  });

  it('auto-restarts with backoff on unexpected close event up to maxRestarts', async () => {
    let portCounter = 5000;
    const servers: MockHttpServer[] = [];

    const factory = vi.fn().mockImplementation(async () => {
      portCounter++;
      const s = new MockHttpServer(portCounter);
      servers.push(s);
      return { server: s, port: portCounter };
    });

    const onUrlChanged = vi.fn();
    const supervisor = new LocalServerSupervisor(factory, {
      maxRestarts: 2,
      backoffMs: [5, 10],
      onUrlChanged,
    });

    const initialPort = await supervisor.start();
    expect(initialPort).toBe(5001);

    // Simulate unexpected crash (server closes abruptly without supervisor.stop())
    servers[0].emit('close');

    // Wait for async backoff restart
    await new Promise((r) => setTimeout(r, 50));

    expect(factory).toHaveBeenCalledTimes(2);
    expect(supervisor.getStatus().restarts).toBe(1);
    expect(supervisor.getStatus().port).toBe(5002);
    expect(onUrlChanged).toHaveBeenCalledWith(5002);

    await supervisor.stop();
  });

  it('manual restart() safely cycles the server without unexpected crash loops', async () => {
    let portCounter = 6000;
    const factory = vi.fn().mockImplementation(async () => {
      portCounter++;
      const s = new MockHttpServer(portCounter);
      return { server: s, port: portCounter };
    });

    const onUrlChanged = vi.fn();
    const supervisor = new LocalServerSupervisor(factory, {
      maxRestarts: 3,
      backoffMs: [5, 10],
      onUrlChanged,
    });

    await supervisor.start();
    const newPort = await supervisor.restart();

    expect(newPort).toBe(6002);
    expect(supervisor.getStatus().port).toBe(6002);
    expect(onUrlChanged).toHaveBeenCalledWith(6002);

    await supervisor.stop();
  });
});

