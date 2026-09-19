const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type Countdown =
  | { kind: "now" }
  | { kind: "minutes"; minutes: number }
  | { kind: "hours"; hours: number; minutes: number }
  | { kind: "days"; days: number; hours: number };

/** Returns null once the start time has passed, so callers can hide the countdown. */
export function getCountdown(msUntilStart: number): Countdown | null {
  if (msUntilStart <= 0) return null;
  if (msUntilStart < MINUTE) return { kind: "now" };
  if (msUntilStart < HOUR) return { kind: "minutes", minutes: Math.floor(msUntilStart / MINUTE) };
  if (msUntilStart < DAY) {
    return {
      kind: "hours",
      hours: Math.floor(msUntilStart / HOUR),
      minutes: Math.floor((msUntilStart % HOUR) / MINUTE),
    };
  }
  return {
    kind: "days",
    days: Math.floor(msUntilStart / DAY),
    hours: Math.floor((msUntilStart % DAY) / HOUR),
  };
}
