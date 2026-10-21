export function getDisposedCompetence(asset: any): string | null {
  if (!asset || asset.status !== 'DISPOSED' || !asset.disposedAt) return null;
  if (typeof asset.disposedAt === 'string') {
    const m = asset.disposedAt.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  const d = new Date(asset.disposedAt);
  if (isNaN(d.getTime())) return null;
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isDisposedBefore(asset: any, competence: string): boolean {
  const comp = getDisposedCompetence(asset);
  if (!comp) return false;
  return competence > comp;
}
