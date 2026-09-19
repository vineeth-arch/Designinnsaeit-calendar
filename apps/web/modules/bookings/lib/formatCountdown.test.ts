import { describe, expect, it } from "vitest";
import { getCountdown, getDurationMinutes } from "./formatCountdown";

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("getCountdown", () => {
  it("returns null at or after start", () => {
    expect(getCountdown(0)).toBeNull();
    expect(getCountdown(-1)).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(getCountdown(Number.NaN)).toBeNull();
  });

  it("rounds sub-second remainder down to zero seconds", () => {
    expect(getCountdown(999)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("splits seconds, minutes and hours", () => {
    expect(getCountdown(59 * SEC)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 59 });
    expect(getCountdown(HOUR + 2 * MIN + 3 * SEC)).toEqual({ days: 0, hours: 1, minutes: 2, seconds: 3 });
  });

  it("carries whole days including three-digit values", () => {
    expect(getCountdown(DAY)).toEqual({ days: 1, hours: 0, minutes: 0, seconds: 0 });
    expect(getCountdown(100 * DAY + 23 * HOUR)).toEqual({ days: 100, hours: 23, minutes: 0, seconds: 0 });
  });
});

describe("getDurationMinutes", () => {
  it("returns minutes between start and end", () => {
    expect(getDurationMinutes("2026-09-21T03:30:00Z", "2026-09-21T03:45:00Z")).toBe(15);
  });

  it("returns 0 for invalid or inverted ranges", () => {
    expect(getDurationMinutes("bad", "2026-09-21T03:45:00Z")).toBe(0);
    expect(getDurationMinutes("2026-09-21T04:00:00Z", "2026-09-21T03:00:00Z")).toBe(0);
  });
});
