import type { HttpExecutionResult } from '../../certificates/ICertificateProvider';
import { NfseTlsError } from '../domain/errors';

type Sleeper = (milliseconds: number, signal?: AbortSignal) => Promise<void>;

export class NfseRetryPolicy {
  constructor(private readonly sleep: Sleeper = defaultSleep) {}

  public async execute(
    operation: () => Promise<HttpExecutionResult>,
    signal?: AbortSignal
  ): Promise<HttpExecutionResult> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await operation();
        if (attempt === 0 && isRetryableStatus(result.statusCode)) {
          await this.sleep(retryDelay(result), signal);
          continue;
        }
        return result;
      } catch (error) {
        if (attempt === 0 && error instanceof NfseTlsError) {
          await this.sleep(250, signal);
          continue;
        }
        throw error;
      }
    }
    throw new NfseTlsError('Falha transitória após a repetição permitida.');
  }
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504;
}

function retryDelay(result: HttpExecutionResult): number {
  if (result.statusCode !== 429) return 250;
  const raw = result.responseHeaders['retry-after'];
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 300_000);
  if (raw) {
    const date = Date.parse(raw);
    if (!Number.isNaN(date)) return Math.max(0, Math.min(date - Date.now(), 300_000));
  }
  return 1000;
}

function defaultSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new NfseTlsError('Consulta cancelada pelo usuário.'));
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new NfseTlsError('Consulta cancelada pelo usuário.'));
    }, { once: true });
  });
}
