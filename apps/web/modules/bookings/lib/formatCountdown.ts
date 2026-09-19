const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type Countdown = { days: number; hours: number; minutes: number; seconds: number };

/** Returns null once the start time has passed (or input is not a finite number) so callers can hide it. */
export function getCountdown(msUntilStart: number): Countdown | null {
  if (!Number.isFinite(msUntilStart) || msUntilStart <= 0) return null;
  return {
    days: Math.floor(msUntilStart / DAY),
    hours: Math.floor((msUntilStart % DAY) / HOUR),
    minutes: Math.floor((msUntilStart % HOUR) / MINUTE),
    seconds: Math.floor((msUntilStart % MINUTE) / SECOND),
  };
}

/** Whole minutes between two instants; 0 for invalid or non-positive ranges. */
export function getDurationMinutes(start: string | Date, end: string | Date): number {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / MINUTE);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}
