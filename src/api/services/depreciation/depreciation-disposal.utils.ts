export function getDisposedCompetence(asset: any): string | null {
  if (!asset || asset.status !== 'DISPOSED' || !asset.disposedAt) return null;
  const d = new Date(asset.disposedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isDisposedBefore(asset: any, competence: string): boolean {
  const comp = getDisposedCompetence(asset);
  if (!comp) return false;
  return competence > comp;
}
