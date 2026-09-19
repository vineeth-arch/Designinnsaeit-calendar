import { describe, expect, it } from "vitest";
import { getCountdown } from "./formatCountdown";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("getCountdown", () => {
  it("returns null when start time has passed", () => {
    expect(getCountdown(0)).toBeNull();
    expect(getCountdown(-5 * MIN)).toBeNull();
  });

  it("returns now under one minute", () => {
    expect(getCountdown(30_000)).toEqual({ kind: "now" });
  });

  it("returns minutes under one hour", () => {
    expect(getCountdown(45 * MIN + 10_000)).toEqual({ kind: "minutes", minutes: 45 });
  });

  it("returns hours and minutes under one day", () => {
    expect(getCountdown(3 * HOUR + 20 * MIN)).toEqual({ kind: "hours", hours: 3, minutes: 20 });
  });

  it("returns days and hours from one day up", () => {
    expect(getCountdown(2 * DAY + 4 * HOUR + 59 * MIN)).toEqual({ kind: "days", days: 2, hours: 4 });
  });
});
