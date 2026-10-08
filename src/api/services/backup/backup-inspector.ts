import { existsSync, statSync, readFileSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { createClient } from '@libsql/client';
import type { BackupInspectionResult, BackupManifest } from './backup.types';

export async function inspectBackup(filePath: string): Promise<BackupInspectionResult> {
  if (!existsSync(filePath)) {
    return { valid: false, error: `Arquivo de backup não encontrado: ${filePath}` };
  }

  const st = statSync(filePath);
  if (st.isDirectory()) {
    return { valid: false, error: 'O caminho selecionado é um diretório e não um arquivo.' };
  }

  // 1. Verifica se é um arquivo SQLite legado
  try {
    const fd = readFileSync(filePath);
    const isSqlite = fd.subarray(0, 16).toString('utf-8').startsWith('SQLite format 3');
    if (isSqlite || filePath.toLowerCase().endsWith('.db')) {
      const tempClient = createClient({ url: `file:${path.resolve(filePath)}` });
      try {
        const integrity = await tempClient.execute('PRAGMA integrity_check;');
        const checkRes = integrity.rows?.[0]?.[0] ?? (integrity.rows?.[0] as any)?.integrity_check;
        if (checkRes !== 'ok') {
          return {
            valid: false,
            isLegacy: true,
            format: 'legacy-sqlite',
            error: 'O arquivo SQLite está corrompido ou falhou na verificação de integridade.',
          };
        }

        // Lê contagens das tabelas suportadas
        let compCount = 0;
        let assetCount = 0;
        let docCount = 0;
        try {
          const cRes = await tempClient.execute('SELECT COUNT(*) as c FROM companies;');
          compCount = Number((cRes.rows[0] as any)?.c || (cRes.rows[0] as any)?.[0] || 0);
        } catch {}
        try {
          const aRes = await tempClient.execute('SELECT COUNT(*) as c FROM assets;');
          assetCount = Number((aRes.rows[0] as any)?.c || (aRes.rows[0] as any)?.[0] || 0);
        } catch {}
        try {
          const dRes = await tempClient.execute('SELECT COUNT(*) as c FROM documents;');
          docCount = Number((dRes.rows[0] as any)?.c || (dRes.rows[0] as any)?.[0] || 0);
        } catch {}

        return {
          valid: true,
          isLegacy: true,
          format: 'legacy-sqlite',
          appVersion: 'Legado (cópia bruta)',
          createdAt: st.mtime.toISOString(),
          filePath,
          modules: ['FULL_DATABASE'],
          stats: {
            companies: compCount,
            assets: assetCount,
            documents: docCount,
          },
        };
      } finally {
        tempClient.close();
      }
    }
  } catch {
    // Prossegue para validação WFB
  }

  // 2. Valida como arquivo estruturado .wfb
  try {
    const zip = new AdmZip(filePath);
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      return {
        valid: false,
        error: 'Arquivo não é um backup válido do Workspace Fiscal (manifesto ausente).',
      };
    }

    const manifestContent = manifestEntry.getData().toString('utf-8');
    const manifest: BackupManifest = JSON.parse(manifestContent);

    if (manifest.format !== 'workspace-fiscal-backup') {
      return {
        valid: false,
        error: 'Formato do arquivo de backup incompatível com o Workspace Fiscal.',
      };
    }

    // Valida presença dos dados declarados no manifesto
    if (manifest.modules.includes('DEPRECIATION') && !zip.getEntry('data/depreciation.json')) {
      return { valid: false, error: 'Arquivo corrompido: dados de Depreciação ausentes no pacote.' };
    }
    if (manifest.modules.includes('NF_VIEW') && !zip.getEntry('data/nf_view.json')) {
      return { valid: false, error: 'Arquivo corrompido: dados de NF View ausentes no pacote.' };
    }
    if (manifest.modules.includes('SETTINGS') && !zip.getEntry('data/settings.json')) {
      return { valid: false, error: 'Arquivo corrompido: dados de Configurações ausentes no pacote.' };
    }

    return {
      valid: true,
      isLegacy: false,
      format: 'wfb',
      appVersion: manifest.appVersion || 'Desconhecida',
      createdAt: manifest.createdAt,
      filePath,
      modules: manifest.modules,
      stats: manifest.stats,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Não foi possível ler o arquivo de backup: ${(err as Error).message}`,
    };
  }
}

