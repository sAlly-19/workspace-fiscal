export function calculateRemainingSeconds(targetIsoString?: string | null, nowMs: number = Date.now()): number {
  if (!targetIsoString) return 0;
  const targetMs = Date.parse(targetIsoString);
  if (isNaN(targetMs) || targetMs <= nowMs) return 0;
  return Math.ceil((targetMs - nowMs) / 1000);
}

export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

