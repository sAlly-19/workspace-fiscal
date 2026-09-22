import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  downloadUrl: string | null;
}

export function parseSemver(versionStr: string): [number, number, number] {
  const clean = versionStr.trim().replace(/^[vV]/, '');
  const parts = clean.split('.').map(p => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareSemver(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareSemver(latest, current) > 0;
}

export class UpdateService {
  private currentVersion = '2.5.1';
  private repo = 'sAlly-19/workspace-fiscal';

  constructor() {
    this.loadVersion();
  }

  private async loadVersion() {
    try {
      const pkgPath = path.resolve(__dirname, '../../../package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (pkg.version) {
        this.currentVersion = pkg.version;
      }
    } catch {
      this.currentVersion = '2.5.1';
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  async checkLatestRelease(repo = this.repo): Promise<UpdateCheckResult> {
    await this.loadVersion();
    const current = this.currentVersion;

    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `WorkspaceFiscal/${current}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.info({ repo }, 'update_check_no_releases_found');
          return {
            currentVersion: current,
            latestVersion: current,
            hasUpdate: false,
            releaseName: 'Nenhuma release encontrada',
            releaseNotes: '',
            publishedAt: new Date().toISOString(),
            releaseUrl: `https://github.com/${repo}/releases`,
            downloadUrl: null,
          };
        }
        throw new Error(`GitHub API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const latestTag = data.tag_name || data.name || current;
      const cleanLatest = latestTag.replace(/^[vV]/, '');
      const hasUpdate = isNewerVersion(cleanLatest, current);

      // Procura asset do instalador Windows (.exe)
      let downloadUrl: string | null = null;
      if (Array.isArray(data.assets)) {
        const exeAsset = data.assets.find((a: any) =>
          typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.exe')
        );
        if (exeAsset?.browser_download_url) {
          downloadUrl = exeAsset.browser_download_url;
        }
      }

      // Se não encontrou .exe direto, usa a URL da release
      if (!downloadUrl && data.html_url) {
        downloadUrl = data.html_url;
      }

      return {
        currentVersion: current,
        latestVersion: cleanLatest,
        hasUpdate,
        releaseName: data.name || `Versão ${cleanLatest}`,
        releaseNotes: data.body || '',
        publishedAt: data.published_at || new Date().toISOString(),
        releaseUrl: data.html_url || `https://github.com/${repo}/releases`,
        downloadUrl,
      };
    } catch (err: any) {
      logger.warn({ error: err.message, repo }, 'update_check_error');
      return {
        currentVersion: current,
        latestVersion: current,
        hasUpdate: false,
        releaseName: 'Verificação indisponível',
        releaseNotes: err.message,
        publishedAt: new Date().toISOString(),
        releaseUrl: `https://github.com/${repo}/releases`,
        downloadUrl: null,
      };
    }
  }
}

export const updateService = new UpdateService();

