/**
 * Motor de depreciação em centavos — evita float.
 * Regras:
 * - Taxa anual % (ex: 10.00) => mensal = anual/12
 * - Valor mensal cheio = round( acquisitionCents * anual / 1200 )
 * - Primeiro mês proporcional (PROPORTIONAL): valor = round( acquisitionCents * anual * diasRestantes / (100*12*diasNoMes) )
 * - Último mês: residual (acquisition - acumulado) para zerar exato
 */

export type DepreciationRule = 'MONTH_OF_ACQUISITION' | 'NEXT_MONTH' | 'PROPORTIONAL';

export interface AssetInput {
  acquisitionValue: number; // centavos
  annualRate: number; // % ex: 10.00
  acquisitionDate: Date;
  depreciationRule: DepreciationRule;
}

export interface DepreciationMonth {
  competence: string; // YYYY-MM
  depreciationValue: number; // centavos
  accumulatedValue: number; // centavos
  currentValue: number; // centavos
  isFirstProportional?: boolean;
  isLastResidual?: boolean;
}

function daysInMonth(year: number, month: number): number {
  // month 1-12
  return new Date(year, month, 0).getDate();
}

function formatCompetence(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseCompetence(comp: string): { year: number; month: number } {
  const [y, m] = comp.split('-').map(Number);
  return { year: y, month: m };
}

function addMonths(year: number, month: number, add: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + add, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function competenceFromDate(d: Date): string {
  return formatCompetence(d.getFullYear(), d.getMonth() + 1);
}

export { competenceFromDate };

/**
 * Calcula valor mensal cheio em centavos (arredondado)
 */
export function monthlyFullCents(acquisitionCents: number, annualRate: number): number {
  // anualRate ex: 10 => 10%
  // monthly = acquisition * annualRate / 100 / 12
  return Math.round((acquisitionCents * annualRate) / 1200);
}

/**
 * Calcula valor proporcional do primeiro mês (PROPORTIONAL)
 * acquisitionDate dentro do mês
 */
export function proportionalFirstMonthCents(
  acquisitionCents: number,
  annualRate: number,
  acquisitionDate: Date
): number {
  const year = acquisitionDate.getFullYear();
  const month = acquisitionDate.getMonth() + 1;
  const day = acquisitionDate.getDate();
  const dim = daysInMonth(year, month);
  const daysRemaining = dim - day + 1; // inclusive
  // Proporcional sobre mensal cheio
  // = round( acquisition * annual * daysRemaining / (100*12*dim) )
  const fullMonthly = (acquisitionCents * annualRate) / 1200;
  const proportional = (fullMonthly * daysRemaining) / dim;
  return Math.round(proportional);
  // Alternativa direta sem double rounding: Math.round(acquisitionCents * annualRate * daysRemaining / (100*12*dim))
}

/**
 * Gera cronograma completo até zerar. Limita a maxMonths por segurança.
 */
export function generateSchedule(input: AssetInput, maxMonths = 600): DepreciationMonth[] {
  const { acquisitionValue, annualRate, acquisitionDate, depreciationRule } = input;

  if (acquisitionValue <= 0) throw new Error('Valor de aquisição deve ser > 0');
  if (annualRate <= 0 || annualRate > 100) throw new Error('Taxa anual inválida');

  const monthlyFull = monthlyFullCents(acquisitionValue, annualRate);
  if (monthlyFull <= 0) throw new Error('Taxa resulta em depreciação mensal zero');

  const acqYear = acquisitionDate.getFullYear();
  const acqMonth = acquisitionDate.getMonth() + 1;
  const acqDay = acquisitionDate.getDate();

  let startYear = acqYear;
  let startMonth = acqMonth;

  let firstIsProportional = false;
  let firstValue: number | null = null;

  if (depreciationRule === 'NEXT_MONTH') {
    const nxt = addMonths(acqYear, acqMonth, 1);
    startYear = nxt.year;
    startMonth = nxt.month;
  } else if (depreciationRule === 'PROPORTIONAL') {
    firstIsProportional = true;
    firstValue = proportionalFirstMonthCents(acquisitionValue, annualRate, acquisitionDate);
    // Se dia 1, proporcional = cheio (daysRemaining = dim)
    // Se valor proporcional ==0 (ex: último dia com taxa baixa) garante pelo menos 1 centavo se residual >0
    if (firstValue === 0 && acquisitionValue > 0) firstValue = 1;
    // Se firstValue já consome tudo (valor pequeno), será único mês
  } else {
    // MONTH_OF_ACQUISITION: full
  }

  const schedule: DepreciationMonth[] = [];
  let accumulated = 0;
  let year = startYear;
  let month = startMonth;
  let isFirst = true;

  for (let i = 0; i < maxMonths; i++) {
    const competence = formatCompetence(year, month);
    let depValue: number;

    if (isFirst && firstIsProportional && firstValue !== null) {
      depValue = firstValue;
    } else {
      depValue = monthlyFull;
    }

    // Ajuste último mês: se acumulado + depValue > aquisição, pega residual
    const remaining = acquisitionValue - accumulated;
    if (depValue > remaining) depValue = remaining;
    // Garante que último mês não deixa 1 centavo residual por arredondamento
    // Se após este mês, remaining - depValue < monthlyFull e < 5 centavos, absorve
    // Mas nossa lógica já garante residual no próximo loop, então apenas garante não negativo

    if (depValue <= 0) break;

    accumulated += depValue;
    const currentValue = acquisitionValue - accumulated;
    const isLast = accumulated >= acquisitionValue;

    schedule.push({
      competence,
      depreciationValue: depValue,
      accumulatedValue: accumulated,
      currentValue,
      isFirstProportional: isFirst && firstIsProportional,
      isLastResidual: isLast && depValue !== monthlyFull,
    });

    if (isLast) break;

    // Avança mês
    const nxt = addMonths(year, month, 1);
    year = nxt.year;
    month = nxt.month;
    isFirst = false;

    // Segurança: se taxa muito baixa, não loop infinito
    if (schedule.length >= maxMonths) break;
  }

  return schedule;
}

/**
 * Gera histórico filtrado até uma competência alvo (inclusive), marcando status exportado depois.
 */
export function generateHistoryUntil(
  schedule: DepreciationMonth[],
  untilCompetence?: string
): DepreciationMonth[] {
  if (!untilCompetence) return schedule;
  return schedule.filter((m) => m.competence <= untilCompetence);
}

export function getNextCompetence(comp: string): string {
  const { year, month } = parseCompetence(comp);
  const nxt = addMonths(year, month, 1);
  return formatCompetence(nxt.year, nxt.month);
}

export function getCurrentCompetence(): string {
  const now = new Date();
  return formatCompetence(now.getFullYear(), now.getMonth() + 1);
}

export function getLastClosedCompetence(): string {
  const now = new Date();
  // Último mês fechado = mês anterior ao atual
  const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastClosed = new Date(firstOfCurrent.getFullYear(), firstOfCurrent.getMonth() - 1, 1);
  return formatCompetence(lastClosed.getFullYear(), lastClosed.getMonth() + 1);
}

export function getCompetencesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  let { year, month } = parseCompetence(start);
  const endParsed = parseCompetence(end);
  while (year < endParsed.year || (year === endParsed.year && month <= endParsed.month)) {
    result.push(formatCompetence(year, month));
    const nxt = addMonths(year, month, 1);
    year = nxt.year;
    month = nxt.month;
  }
  return result;
}

export function compareCompetence(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Estima previsão de término (última competência do cronograma)
 */
export function estimateEndCompetence(input: AssetInput): string | null {
  const sched = generateSchedule(input, 600);
  return sched.length ? sched[sched.length - 1].competence : null;
}

/**
 * Calcula totais para uma competência específica (mês) a partir de lista de assets + seus cronogramas
 */
export function sumForCompetence(
  assetsSchedules: Array<{ asset: AssetInput & { id: string }; schedule: DepreciationMonth[] }>,
  competence: string
): { total: number; count: number; entries: Array<{ assetId: string; value: number }> } {
  let total = 0;
  let count = 0;
  const entries: Array<{ assetId: string; value: number }> = [];
  for (const { asset, schedule } of assetsSchedules) {
    const month = schedule.find((m) => m.competence === competence);
    if (month) {
      total += month.depreciationValue;
      count += 1;
      entries.push({ assetId: asset.id, value: month.depreciationValue });
    }
  }
  return { total, count, entries };
}

// Util para formatar centavos -> BRL string
export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseBRLToCents(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100);
  // Aceita "5.000,00" ou "5000.00" ou "5000,00"
  const cleaned = String(value).trim().replace(/\s/g, '');
  if (!cleaned) return 0;
  // Se contém , e .
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return Math.round(parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) * 100);
  }
  if (cleaned.includes(',')) {
    return Math.round(parseFloat(cleaned.replace(',', '.')) * 100);
  }
  return Math.round(parseFloat(cleaned) * 100);
}
