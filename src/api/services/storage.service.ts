import fs from 'fs/promises';
import path from 'path';

export interface IStorageService {
  saveXml(filename: string, content: Buffer | string): Promise<string>;
  readXml(filepath: string): Promise<string>;
  deleteXml(filepath: string): Promise<void>;
  savePdf(filename: string, content: Buffer): Promise<string>;
  readPdf(filepath: string): Promise<Buffer>;
  getDocumentPath(type: 'xml' | 'pdf', filename: string): string;
}

function resolveStorageBase(): string {
  try {
    const electron = require('electron');
    const app = electron?.app;
    if (app && typeof app.getPath === 'function') {
      return path.join(app.getPath('userData'), 'storage');
    }
  } catch {}
  if (process.env.NFVIEW_STORAGE_PATH) return path.resolve(process.env.NFVIEW_STORAGE_PATH);
  return path.join(process.cwd(), 'storage');
}

export class LocalStorageService implements IStorageService {
  private basePath: string;
  private ready: Promise<void>;

  constructor(basePath?: string) {
    this.basePath = basePath || resolveStorageBase();
    this.ready = this.ensureDirectories();
    this.ready.catch(console.error);
  }

  private async ensureDirectories() {
    await fs.mkdir(path.join(this.basePath, 'documents'), { recursive: true });
    await fs.mkdir(path.join(this.basePath, 'pdf'), { recursive: true });
  }

  /** Valida filename para prevenir path traversal */
  private sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    if (!base || base === '.' || base === '..') throw new Error('Nome de arquivo inválido');
    // Permite apenas [a-zA-Z0-9._-]
    if (!/^[a-zA-Z0-9._-]+$/.test(base)) throw new Error(`Nome de arquivo inválido: ${filename}`);
    return base;
  }

  /** Garante que filepath está dentro do basePath (defesa em profundidade) */
  private assertInsideBase(filepath: string) {
    const resolved = path.resolve(filepath);
    const baseResolved = path.resolve(this.basePath);
    if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
      throw new Error('Acesso fora do diretório de armazenamento negado');
    }
  }

  getDocumentPath(type: 'xml' | 'pdf', filename: string): string {
    const folder = type === 'xml' ? 'documents' : 'pdf';
    const safe = this.sanitizeFilename(filename);
    return path.join(this.basePath, folder, safe);
  }

  async saveXml(filename: string, content: Buffer | string): Promise<string> {
    await this.ready;
    const filepath = this.getDocumentPath('xml', filename);
    this.assertInsideBase(filepath);
    await fs.writeFile(filepath, content, 'utf-8');
    return filepath;
  }

  async readXml(filepath: string): Promise<string> {
    this.assertInsideBase(filepath);
    // Valida existência e que não é diretório
    const stat = await fs.stat(filepath).catch(() => null);
    if (!stat || !stat.isFile()) throw new Error('Arquivo XML não encontrado');
    return fs.readFile(filepath, 'utf-8');
  }

  async deleteXml(filepath: string): Promise<void> {
    this.assertInsideBase(filepath);
    await fs.unlink(filepath).catch((err: any) => {
      if (err?.code !== 'ENOENT') throw err;
    });
  }

  async savePdf(filename: string, content: Buffer): Promise<string> {
    await this.ready;
    const filepath = this.getDocumentPath('pdf', filename);
    this.assertInsideBase(filepath);
    await fs.writeFile(filepath, content);
    return filepath;
  }

  async readPdf(filepath: string): Promise<Buffer> {
    this.assertInsideBase(filepath);
    return fs.readFile(filepath);
  }

  /** Remove todos os XMLs/PDFs do storage (usado em reset) */
  async clearAll(): Promise<void> {
    await this.ready;
    for (const sub of ['documents', 'pdf']) {
      const dir = path.join(this.basePath, sub);
      try {
        const entries = await fs.readdir(dir);
        await Promise.all(
          entries.map((e) => fs.unlink(path.join(dir, e)).catch(() => {}))
        );
      } catch {}
    }
  }

  getBasePath(): string {
    return this.basePath;
  }
}

// Export a singleton instance. This makes it easy to swap out with S3StorageService later.
export const storageService = new LocalStorageService();
