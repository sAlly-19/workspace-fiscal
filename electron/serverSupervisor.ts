export interface ServerStatus {
  running: boolean;
  port: number;
  restarts: number;
  lastError?: string;
}

export interface SupervisorOptions {
  maxRestarts?: number;
  backoffMs?: number[];
  onUrlChanged?: (newPort: number) => void;
}

export interface ServerInstance {
  server: any;
  port: number;
}

export class LocalServerSupervisor {
  private currentServer: any | null = null;
  private currentPort: number = 0;
  private isStopping: boolean = false;
  private running: boolean = false;
  private restartCount: number = 0;
  private lastErrorMsg?: string;

  private maxRestarts: number;
  private backoffMs: number[];
  private onUrlChanged?: (newPort: number) => void;

  constructor(
    private serverFactory: () => Promise<ServerInstance>,
    options: SupervisorOptions = {}
  ) {
    this.maxRestarts = options.maxRestarts ?? 3;
    this.backoffMs = options.backoffMs ?? [500, 1500, 3000];
    this.onUrlChanged = options.onUrlChanged;
  }

  public async start(): Promise<number> {
    this.isStopping = false;
    const instance = await this.serverFactory();
    this.attachListeners(instance.server);
    this.currentServer = instance.server;
    this.currentPort = instance.port;
    this.running = true;
    return this.currentPort;
  }

  public async stop(): Promise<void> {
    this.isStopping = true;
    this.running = false;
    if (this.currentServer) {
      const serverToClose = this.currentServer;
      this.currentServer = null;
      await new Promise<void>((resolve) => {
        try {
          serverToClose.close(() => resolve());
        } catch {
          resolve();
        }
      });
    }
  }

  public async restart(): Promise<number> {
    this.isStopping = true;
    if (this.currentServer) {
      const serverToClose = this.currentServer;
      this.currentServer = null;
      await new Promise<void>((resolve) => {
        try {
          serverToClose.close(() => resolve());
        } catch {
          resolve();
        }
      });
    }

    this.isStopping = false;
    const instance = await this.serverFactory();
    this.attachListeners(instance.server);
    this.currentServer = instance.server;
    this.currentPort = instance.port;
    this.running = true;
    this.onUrlChanged?.(this.currentPort);
    return this.currentPort;
  }

  public getStatus(): ServerStatus {
    return {
      running: this.running,
      port: this.currentPort,
      restarts: this.restartCount,
      lastError: this.lastErrorMsg,
    };
  }

  private attachListeners(server: any): void {
    if (!server || typeof server.on !== 'function') return;

    server.on('error', (err: any) => {
      this.lastErrorMsg = err?.message || String(err);
      this.handleUnexpectedTermination(err);
    });

    server.on('close', () => {
      this.handleUnexpectedTermination();
    });
  }

  private handleUnexpectedTermination(err?: any): void {
    if (this.isStopping) {
      return;
    }

    if (this.restartCount >= this.maxRestarts) {
      this.running = false;
      this.lastErrorMsg = `Limite de reinicializações excedido (${this.maxRestarts}): ${err?.message || 'servidor finalizado'}`;
      console.error(`[LocalServerSupervisor] ${this.lastErrorMsg}`);
      return;
    }

    const delay = this.backoffMs[Math.min(this.restartCount, this.backoffMs.length - 1)] ?? 1000;
    this.restartCount++;
    console.warn(`[LocalServerSupervisor] Queda detectada. Tentando reiniciar em ${delay}ms (tentativa ${this.restartCount}/${this.maxRestarts})...`);

    setTimeout(async () => {
      if (this.isStopping) return;
      try {
        const instance = await this.serverFactory();
        this.attachListeners(instance.server);
        this.currentServer = instance.server;
        this.currentPort = instance.port;
        this.running = true;
        this.onUrlChanged?.(this.currentPort);
        console.log(`[LocalServerSupervisor] Servidor reiniciado com sucesso na porta ${this.currentPort}`);
      } catch (restartErr: any) {
        console.error(`[LocalServerSupervisor] Falha ao reiniciar servidor:`, restartErr);
        this.handleUnexpectedTermination(restartErr);
      }
    }, delay);
  }
}

