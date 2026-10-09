import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { sanitizeFilename, buildSafeDocumentPath } from './path-sanitizer';
import { Company, DocumentType, SefazEnvironment } from '../domain/types';
import { normalizeNfseAccessKey } from '../nfse/domain/access-key';

export interface PendingFileWrite {
  filePath: string;
  contentHash: string;
  commit(): void;
  rollback(): void;
}

export class StorageService {
  constructor(private defaultBasePath: string = path.resolve(process.cwd(), 'data', 'documents')) {}

  public getCompanyStoragePath(company: Company, configuredBasePath?: string): string {
    if (company.folder_path?.trim()) return path.resolve(company.folder_path);
    const root = configuredBasePath?.trim() ? path.resolve(configuredBasePath) : this.defaultBasePath;
    return path.join(root, `${company.cnpj}_${sanitizeFilename(company.name)}`);
  }

  public saveXml(
    company: Company,
    docType: DocumentType,
    environment: SefazEnvironment,
    accessKey: string,
    xmlContent: string | Buffer,
    issueDate?: string,
    schemaType?: string,
    configuredBasePath?: string
  ): string {
    const pending = this.saveXmlTransactional(
      company, docType, environment, accessKey, xmlContent, issueDate, schemaType, configuredBasePath
    );
    pending.commit();
    return pending.filePath;
  }

  public saveXmlTransactional(
    company: Company,
    docType: DocumentType,
    environment: SefazEnvironment,
    accessKey: string,
    xmlContent: string | Buffer,
    issueDate?: string,
    schemaType?: string,
    configuredBasePath?: string
  ): PendingFileWrite {
    const baseDir = this.getCompanyStoragePath(company, configuredBasePath);
    const { year, month } = this.getDateParts(issueDate);
    if (accessKey.includes('..') || accessKey.includes('\\')) {
      throw new Error('Chave de acesso contém sequência de caminho inválida.');
    }
    const cleanKey = docType === 'NFSE' ? normalizeNfseAccessKey(accessKey) : accessKey;
    if (docType !== 'NFSE' && !/^\d{44}$/.test(cleanKey)) {
      throw new Error('A chave de acesso de NF-e/CT-e deve conter exatamente 44 dígitos.');
    }

    const isEvent = Boolean(schemaType?.toLowerCase().includes('evento'));
    const cleanSchema = sanitizeFilename((schemaType || 'evento').replace(/\.xsd$/i, ''));
    const filename = isEvent ? `${cleanKey}-${cleanSchema}.xml` : `${cleanKey}.xml`;
    const filePath = buildSafeDocumentPath(baseDir, '', docType, environment, year, month, filename);
    return this.atomicWrite(filePath, xmlContent);
  }

  public savePdf(
    company: Company,
    docType: 'NFE' | 'CTE',
    environment: SefazEnvironment,
    accessKey: string,
    pdfBuffer: Buffer,
    issueDate?: string,
    configuredBasePath?: string
  ): string {
    const baseDir = this.getCompanyStoragePath(company, configuredBasePath);
    const { year, month } = this.getDateParts(issueDate);
    const cleanKey = sanitizeFilename(accessKey);
    if (!/^\d{44}$/.test(cleanKey)) throw new Error('Chave de acesso inválida para armazenamento.');
    const filePath = buildSafeDocumentPath(baseDir, '', docType, environment, year, month, `${cleanKey}.pdf`);
    const pending = this.atomicWrite(filePath, pdfBuffer);
    pending.commit();
    return filePath;
  }

  public readXml(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  }

  public readPdf(filePath: string): Buffer | null {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  public fileExists(filePath?: string): boolean {
    return Boolean(filePath && fs.existsSync(filePath));
  }

  public deleteFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  private getDateParts(issueDate?: string): { year: string; month: string } {
    const parsed = issueDate ? new Date(issueDate) : new Date();
    const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return {
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1).padStart(2, '0'),
    };
  }

  private atomicWrite(filePath: string, content: string | Buffer): PendingFileWrite {
    const targetDir = path.dirname(filePath);
    fs.mkdirSync(targetDir, { recursive: true });

    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const contentHash = createHash('sha256').update(contentBuffer).digest('hex');
    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
    const tempPath = path.join(
      targetDir,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
    );
    const fd = fs.openSync(tempPath, 'wx');
    try {
      fs.writeFileSync(fd, contentBuffer);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    try {
      safeReplaceFileSync(tempPath, filePath);
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        /* ignora se o temporário ainda estiver travado por antivírus */
      }
      throw err;
    }

    let finished = false;
    return {
      filePath,
      contentHash,
      commit: () => { finished = true; },
      rollback: () => {
        if (finished) return;
        if (previous === undefined) {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch {
              /* ignora */
            }
          }
          return;
        }
        const restore = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.restore`;
        fs.writeFileSync(restore, previous);
        try {
          safeReplaceFileSync(restore, filePath);
        } catch {
          /* preserva erro de restauração */
        }
      },
    };
  }
}

function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* busy-wait fallback */
    }
  }
}

/**
 * Substitui o arquivo de destino de forma segura e atômica.
 * No Windows, operações de rename podem falhar temporariamente com EPERM, EBUSY ou EACCES
 * devido a scanners de antivírus (Windows Defender), Search Indexer ou concorrência de handles.
 * Esta função aplica retentativas com backoff exponencial e fallback para copy + unlink.
 */
export function safeReplaceFileSync(sourcePath: string, targetPath: string): void {
  try {
    fs.renameSync(sourcePath, targetPath);
    return;
  } catch (err: any) {
    const isWindowsTransient =
      process.platform === 'win32' ||
      err.code === 'EPERM' ||
      err.code === 'EBUSY' ||
      err.code === 'EACCES' ||
      err.code === 'EMFILE';

    if (!isWindowsTransient) {
      throw err;
    }

    // Retentativas com backoff exponencial para liberar travas transitórias do Windows Defender / Indexer
    const delays = [10, 25, 50, 100, 150, 250, 400];
    for (const delay of delays) {
      sleepSync(delay);
      try {
        if (fs.existsSync(targetPath)) {
          try {
            fs.chmodSync(targetPath, 0o666);
          } catch {
            /* ignora se não for possível alterar permissões */
          }
        }
        fs.renameSync(sourcePath, targetPath);
        return;
      } catch {
        /* continua tentando */
      }
    }

    // Se rename ainda falhar após todas as retentativas, fallback para cópia e deleção da fonte
    try {
      fs.copyFileSync(sourcePath, targetPath);
      try {
        fs.unlinkSync(sourcePath);
      } catch {
        /* se a fonte temporária ainda estiver presa por scanner, será limpa pelo SO */
      }
    } catch {
      throw err; // lança o erro original do rename
    }
  }
}

