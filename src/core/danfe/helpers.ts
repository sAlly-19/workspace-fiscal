/**
 * Helpers compartilhados entre frontend (React DANFE) e backend (batch-print HTML).
 * Evita 4 cópias duplicadas de formatMoney/formatDate/getPaymentLabel.
 */

export function formatDate(d?: string | Date): string {
  if (!d) return '--/--/----';
  if (typeof d === 'string') {
    if (d.includes('-')) {
      const [y, m, day] = d.split('T')[0].split('-');
      return `${day}/${m}/${y}`;
    }
    return d;
  }
  return d.toLocaleDateString('pt-BR');
}

export function formatTime(d?: string | Date): string {
  if (!d) return '--:--';
  if (typeof d === 'string' && d.includes('T')) return d.split('T')[1]?.substring(0, 5) || '--:--';
  return '--:--';
}

export function formatMoney(v?: number): string {
  return `R$ ${(v || 0).toFixed(2)}`;
}

export function formatCFOP(code?: string): string {
  if (!code) return '-';
  return `${code} - ${code?.startsWith('5') ? 'Prestação' : 'Aquisição'}`;
}

export function formatModFrete(c?: number): string {
  const map: Record<number, string> = {
    0: '0 - Por conta do Remetente (CIF)',
    1: '1 - Por conta do Destinatário (FOB)',
    2: '2 - Por conta de Terceiros',
    3: '3 - Transporte Próprio por Remetente',
    4: '4 - Transporte Próprio por Destinatário',
    9: '9 - Sem Ocorrência de Transporte',
  };
  return map[c ?? -1] || '-';
}

export function getPaymentLabel(code?: string): string {
  if (!code) return 'Outros';
  const c = String(code).padStart(2, '0');
  const map: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '14': 'Duplicata Mercantil',
    '15': 'Boleto Bancário',
    '16': 'Depósito Bancário',
    '17': 'PIX',
    '18': 'Transferência / Carteira Digital',
    '19': 'Programa Fidelidade / Cashback',
    '90': 'Sem Pagamento',
    '99': 'Outros',
  };
  return map[c] || `Forma (${code})`;
}

/**
 * QR Code procedural 21x21 — mesmo algoritmo usado nos DANFEs NFC-e.
 * Gera SVG string (backend) ou dados para <svg> (frontend pode adaptar).
 */
export function renderQrCodeSvg(seed: string, size: number): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const modules = 21;
  const cell = size / modules;
  const isFinder = (x: number, y: number) => {
    const inBox = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    const finder = (cx: number, cy: number) => {
      if (!inBox(cx, cy)) return false;
      if (x === cx || x === cx + 6 || y === cy || y === cy + 6) return true;
      if (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4) return true;
      return false;
    };
    return finder(0, 0) || finder(14, 0) || finder(0, 14);
  };
  let rects = '';
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const sep = (cx: number, cy: number) =>
        (x === cx - 1 && y >= cy - 1 && y <= cy + 7) ||
        (x === cx + 7 && y >= cy - 1 && y <= cy + 7) ||
        (y === cy - 1 && x >= cx - 1 && x <= cx + 7) ||
        (y === cy + 7 && x >= cx - 1 && x <= cx + 7);
      let dark = false;
      if (isFinder(x, y) || sep(0, 0) || sep(14, 0) || sep(0, 14)) {
        dark = true;
      } else if (x >= 14 && x <= 18 && y >= 14 && y <= 18) {
        const dx = x - 16, dy = y - 16;
        if (Math.max(Math.abs(dx), Math.abs(dy)) === 0 || (Math.abs(dx) <= 1 && Math.abs(dy) <= 1)) dark = true;
      } else if (x === 6 || y === 6) {
        if ((x + y) % 2 === 0) dark = true;
      } else {
        const bit = ((h >>> ((x * 3 + y * 5) % 32)) ^ (h * (x + 1) + y)) & 1;
        if (bit) dark = true;
      }
      if (dark) rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="black"/>`;
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="shape-rendering: crispEdges;"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}
