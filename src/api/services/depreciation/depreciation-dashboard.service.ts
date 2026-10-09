import { assetsRepository } from '../../repositories/assets.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import {
  generateSchedule,
  DepreciationRule,
  getLastClosedCompetence,
} from '../../../core/depreciation/calculate';
import { getDisposedCompetence } from './depreciation-disposal.utils';

export async function calculateDepreciationDashboard(companyId: string) {
  const allAssets = await assetsRepository.findAll(companyId);
  const company = await companiesRepository.findById(companyId);
  const rule = (company?.depreciationRule as DepreciationRule) || 'PROPORTIONAL';

  let totalAcquisition = 0;
  let totalCurrent = 0;
  let fullyDepreciated = 0;
  const lastClosedComp = getLastClosedCompetence();

  for (const asset of allAssets) {
    totalAcquisition += asset.acquisitionValue;
    if (asset.status === 'DISPOSED') {
      continue;
    }

    const schedule = generateSchedule({
      acquisitionValue: asset.acquisitionValue,
      annualRate: asset.annualRate,
      acquisitionDate: asset.acquisitionDate,
      depreciationRule: rule,
    });

    const last = schedule[schedule.length - 1];
    if (last && last.competence <= lastClosedComp && last.currentValue === 0) {
      fullyDepreciated += 1;
    }

    let history = schedule.filter((m) => m.competence <= lastClosedComp);
    const disposedCompDash = getDisposedCompetence(asset);
    if (disposedCompDash) {
      history = history.filter((m) => m.competence <= disposedCompDash);
    }

    const lastHist = history[history.length - 1];
    if (lastHist) {
      totalCurrent += lastHist.currentValue;
    } else {
      totalCurrent += asset.acquisitionValue;
    }
  }

  return {
    totalAssets: allAssets.length,
    totalAcquisition,
    totalCurrent,
    fullyDepreciated,
    company,
  };
}

