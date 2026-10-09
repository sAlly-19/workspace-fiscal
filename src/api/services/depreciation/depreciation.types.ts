export interface DepreciationRow {
  assetId: string;
  supplier: string;
  documentNumber: string;
  description: string;
  categoryName: string | null;
  acquisitionDate: Date;
  acquisitionValue: number;
  annualRate: number;
  competence: string;
  depreciationValue: number;
  accumulatedValue: number;
  currentValue: number;
  isFirstProportional?: boolean;
  isLastResidual?: boolean;
  exported: boolean;
  status: 'exported' | 'current' | 'not_issued' | 'future';
}

