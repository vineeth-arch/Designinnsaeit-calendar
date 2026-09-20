import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  barcodeWidths,
  bookingReference,
  brandShort,
  buildGoogleCalendarUrl,
  firstName,
  fromNow,
  hostLine,
  leafParts,
  pickIntake,
  rescheduleCutoff,
  timeRange,
  tzLabel,
} from "./derive";

const START = "2026-09-21T09:30:00.000Z"; // 10:30am BST, 3:00pm IST
const END = "2026-09-21T10:00:00.000Z";

describe("derive", () => {
  it("first name", () => {
    expect(firstName("Jordan Lee")).toBe("Jordan");
    expect(firstName("  Prince ")).toBe("Prince");
    expect(firstName(null)).toBe("");
  });

  it("date leaf and time range in the attendee zone", () => {
    expect(leafParts(START, "Europe/London")).toEqual({ month: "Sep", day: "21", weekday: "Monday" });
    expect(timeRange(START, END, "Europe/London")).toEqual({ start: "10:30am", end: "11:00am" });
    expect(timeRange(START, END, "Europe/London", true)).toEqual({ start: "10:30", end: "11:00" });
  });

  it("zone labels: UK switches between BST and GMT, India is fixed, others fall back to Intl", () => {
    expect(tzLabel("Europe/London", START)).toBe("UK time (BST)");
    expect(tzLabel("Europe/London", "2026-12-14T10:30:00Z")).toBe("UK time (GMT)");
    expect(tzLabel("Asia/Kolkata", START)).toBe("India time (IST)");
    expect(tzLabel("America/New_York", START)).toMatch(/Eastern/);
  });

  it("host line", () => {
    expect(hostLine(START, "Asia/Kolkata", "Mumbai")).toBe("3:00pm for me in Mumbai");
  });

  it("from now", () => {
    expect(fromNow(3 * 86_400_000 + 5)).toBe("3 days from now");
    expect(fromNow(86_400_000)).toBe("1 day from now");
    expect(fromNow(5 * 3_600_000)).toBe("5 hours from now");
    expect(fromNow(90_000)).toBe("1 minute from now");
    expect(fromNow(0)).toBe("now");
    expect(fromNow(Number.NaN)).toBe("now");
  });

  it("booking reference is reversible by suffix", () => {
    expect(bookingReference("abcXYZ7k2m9q")).toBe("DI-7K2M9Q");
    expect(bookingReference("x-7k2m9q")).toBe("DI-7K2M9Q");
  });

  it("barcode: design sample reproduces the drawn pattern, other refs differ", () => {
    expect(barcodeWidths("DI-7K2M9Q")).toEqual([5, 5, 2, 2, 2, 4, 4, 3, 5, 5, 2, 2, 2, 4, 4, 3]);
    expect(barcodeWidths("DI-AAAAAA")).toHaveLength(16);
    expect(barcodeWidths("DI-AAAAAA")).not.toEqual(barcodeWidths("DI-7K2M9Q"));
    expect(barcodeWidths("DI-AAAAAA")).toEqual(barcodeWidths("DI-AAAAAA"));
  });

  it("brand short", () => {
    expect(brandShort("Acme Studio")).toBe("Acme");
    expect(brandShort("Acme Co.")).toBe("Acme");
    expect(brandShort("Studio")).toBe("Studio");
    expect(brandShort("Northwind")).toBe("Northwind");
    expect(brandShort("")).toBe("your brand");
    expect(brandShort(undefined)).toBe("your brand");
  });

  it("intake: matches by key or label, category only when present", () => {
    const i = pickIntake(
      {
        brand: { label: "Brand", value: "Acme Studio" },
        website: { label: "Website", value: "acme.studio" },
        country: { label: "Country", value: "United Kingdom" },
      },
      "  Our rebrand stalled "
    );
    expect(i).toEqual({
      brand: "Acme Studio",
      website: "acme.studio",
      country: "United Kingdom",
      category: null,
      note: "Our rebrand stalled",
    });
    expect(pickIntake({ industry: { label: "Industry", value: "home fragrance" } }).category).toBe(
      "home fragrance"
    );
    expect(pickIntake(null)).toEqual({
      brand: null,
      website: null,
      country: null,
      category: null,
      note: null,
    });
  });

  it("working days skip the weekend in the given zone", () => {
    // Fri 2026-09-18 -> +2 working days = Tue 22 Sep; Thu -> Mon
    expect(addWorkingDays("2026-09-18T09:30:00Z", 2, "Asia/Kolkata").format("dddd D MMMM")).toBe(
      "Tuesday 22 September"
    );
    expect(addWorkingDays("2026-09-17T09:30:00Z", 2, "Asia/Kolkata").format("dddd D MMMM")).toBe(
      "Monday 21 September"
    );
    expect(addWorkingDays("2026-09-18T09:30:00Z", 1, "Asia/Kolkata").format("dddd D MMMM")).toBe(
      "Monday 21 September"
    );
  });

  it("reschedule cutoff only when a minimum notice exists", () => {
    expect(rescheduleCutoff(START, null, "Europe/London")).toBeNull();
    expect(rescheduleCutoff(START, 0, "Europe/London")).toBeNull();
    expect(rescheduleCutoff(START, 24 * 60, "Europe/London")?.format("dddd D MMMM, h:mma")).toBe(
      "Sunday 20 September, 10:30am"
    );
  });

  it("google calendar url", () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        title: "Call",
        startIso: START,
        endIso: END,
        location: "https://meet.google.com/x",
      })
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("dates")).toBe("20260921T093000Z/20260921T100000Z");
    expect(url.searchParams.get("text")).toBe("Call");
    expect(url.searchParams.get("location")).toBe("https://meet.google.com/x");
  });
});
