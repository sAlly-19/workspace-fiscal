export function parseCteNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const original = String(val).trim();
  if (original.includes(',') && original.includes('.')) {
    return parseFloat(original.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (original.includes(',')) {
    return parseFloat(original.replace(',', '.')) || 0;
  }
  return parseFloat(original) || 0;
}

