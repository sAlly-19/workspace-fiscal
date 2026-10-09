export function formatRole(role: string): string {
  const map: Record<string, string> = {
    '0': 'Remetente',
    '1': 'Expedidor',
    '2': 'Recebedor',
    '3': 'Destinatário',
    '4': 'Outros',
  };
  return map[role] || 'Remetente';
}

export function formatUnit(unit: string): string {
  const map: Record<string, string> = {
    '00': 'M3',
    '01': 'KG',
    '02': 'TON',
    '03': 'UN',
    '04': 'LT',
    '05': 'MMBTU',
  };
  return map[unit] || unit;
}

