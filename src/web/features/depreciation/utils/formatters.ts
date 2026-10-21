export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCentsBRL(cents: number): string {
  return `R$ ${formatCents(cents)}`;
}

export const MONTHS_PT_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function competenceLabel(comp: string): string {
  const [y, m] = comp.split('-');
  const idx = Number(m) - 1;
  return `${MONTHS_PT_FULL[idx]} ${y}`;
}

export function formatDateBR(d: string | Date | null | undefined): string {
  if (!d) return '-';
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return `${m[3]}/${m[2]}/${m[1]}`;
    }
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function cnpjMask(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function getLastClosedCompetence(): string {
  const now = new Date();
  const firstOfCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastClosed = new Date(firstOfCurrent.getFullYear(), firstOfCurrent.getMonth() - 1, 1);
  return `${lastClosed.getFullYear()}-${String(lastClosed.getMonth() + 1).padStart(2, '0')}`;
}

export function competenceFromDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
