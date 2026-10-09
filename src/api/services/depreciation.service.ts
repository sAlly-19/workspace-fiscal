import { getLastClosedCompetence } from '../../core/depreciation/calculate';
import {
  DepreciationRow,
  ColumnMappingItem,
  RetroactiveBatchParams,
  RetroactiveBatchResult,
  calculateMonthlyDepreciation,
  calculateAssetHistory,
  exportMonthlyCsv,
  exportRetroactiveAssetCsv,
  recalculateAssetSchedule,
  executeRetroactiveBatch,
  calculateDepreciationDashboard,
} from './depreciation/index';

// Re-exporta utilitários e tipos modularizados para manter 100% de compatibilidade com os consumidores
export * from './depreciation/index';

export class DepreciationService {
  /**
   * Retorna linhas de depreciação para uma competência e empresa
   */
  async getMonthlyDepreciation(
    companyId: string,
    competence: string
  ): Promise<{
    rows: DepreciationRow[];
    total: number;
    count: number;
    isExported: boolean;
    exportInfo: any | null;
  }> {
    return calculateMonthlyDepreciation(companyId, competence);
  }

  /**
   * Gera histórico completo de um bem (todas as competências)
   */
  async getAssetHistory(assetId: string): Promise<{
    asset: any;
    schedule: DepreciationRow[];
    summary: {
      acquisitionValue: number;
      depreciated: number;
      currentValue: number;
      annualRate: number;
      endCompetence: string | null;
    };
  }> {
    return calculateAssetHistory(assetId);
  }

  /**
   * Gera CSV e registra exportação para uma competência
   */
  async generateCsv(
    companyId: string,
    competence: string,
    options?: {
      separator?: string;
      numericFormat?: 'BRL' | 'RAW';
      dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
      columns?: ColumnMappingItem[];
    }
  ): Promise<{
    csv: string;
    filename: string;
    total: number;
    count: number;
    alreadyExported: boolean;
  }> {
    return exportMonthlyCsv(companyId, competence, options);
  }

  getCurrentCompetence(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  getLastClosedCompetence(): string {
    return getLastClosedCompetence();
  }

  /**
   * Gera CSV retroativo para um bem específico: todas as competências desde aquisição até último fechado
   */
  async generateRetroactiveForAsset(
    companyId: string,
    assetId: string
  ): Promise<{
    csv: string;
    filename: string;
    total: number;
    count: number;
    competences: string[];
  }> {
    return exportRetroactiveAssetCsv(companyId, assetId);
  }

  /**
   * Recalcula o cronograma de depreciação de um bem quando a taxa ou categoria muda.
   */
  async recalculateAsset(
    assetId: string,
    options?: { force?: boolean }
  ): Promise<{
    assetId: string;
    monthsRecalculated: number;
    monthsPreserved: number;
    schedule: Array<{
      competence: string;
      depreciationValue: number;
      accumulatedValue: number;
      currentValue: number;
    }>;
  }> {
    return recalculateAssetSchedule(assetId, options);
  }

  /**
   * F8: Depreciação retroativa em lote.
   */
  async generateRetroactiveBatch(params: RetroactiveBatchParams): Promise<RetroactiveBatchResult> {
    return executeRetroactiveBatch(params);
  }

  /**
   * Agregação patrimonial e contábil para o Dashboard
   */
  async getDashboard(companyId: string) {
    return calculateDepreciationDashboard(companyId);
  }
}

export const depreciationService = new DepreciationService();
