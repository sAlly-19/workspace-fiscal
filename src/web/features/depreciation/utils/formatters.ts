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

export function formatDateBR(d: string | Date): string {
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR');
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

export function competenceFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
