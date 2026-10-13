import { useState, useEffect } from 'react';
import { calculateRemainingSeconds, formatRemainingTime } from '../utils/cooldown';

export interface UseCooldownTimerResult {
  isCoolingDown: boolean;
  remainingSeconds: number;
  formattedTime: string;
}

export function useCooldownTimer(targetIsoString?: string | null, onCooldownEnd?: () => void): UseCooldownTimerResult {
  const [remainingSeconds, setRemainingSeconds] = useState(() => calculateRemainingSeconds(targetIsoString));

  useEffect(() => {
    const initial = calculateRemainingSeconds(targetIsoString);
    setRemainingSeconds(initial);

    if (initial <= 0) return;

    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds(targetIsoString);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onCooldownEnd?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetIsoString, onCooldownEnd]);

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    formattedTime: formatRemainingTime(remainingSeconds),
  };
}

