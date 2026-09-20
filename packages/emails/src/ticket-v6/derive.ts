import dayjs from "@calcom/dayjs";

// Pure helpers behind the v6 emails: every value the design tags "derived". No I/O.

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? "").trim().split(/\s+/)[0] ?? "";
}

export function leafParts(iso: string, timeZone: string) {
  const d = dayjs(iso).tz(timeZone);
  return { month: d.format("MMM"), day: d.format("D"), weekday: d.format("dddd") };
}

export function timeRange(startIso: string, endIso: string, timeZone: string, twentyFourHour = false) {
  const fmt = twentyFourHour ? "HH:mm" : "h:mma";
  return { start: dayjs(startIso).tz(timeZone).format(fmt), end: dayjs(endIso).tz(timeZone).format(fmt) };
}

const ABBR_OVERRIDE: Record<string, string> = { "Asia/Kolkata": "IST", "Asia/Calcutta": "IST" };

/** Short zone name as an English reader expects it (BST, GMT, IST). Intl only knows "GMT+5:30" for India. */
export function zoneAbbreviation(timeZone: string, iso: string): string {
  return (
    ABBR_OVERRIDE[timeZone] ??
    new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ??
    timeZone
  );
}

// Friendly zone names for the zones this studio actually deals with; anything else falls back to Intl.
export function tzLabel(timeZone: string, iso: string): string {
  const abbr = (locale: string) =>
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: "short" })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  if (timeZone === "Europe/London") return `UK time (${abbr("en-GB")})`;
  if (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta") return "India time (IST)";
  return (
    new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "long" })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone
  );
}

export function hostLine(startIso: string, hostTimeZone: string, city: string, twentyFourHour = false) {
  const t = dayjs(startIso)
    .tz(hostTimeZone)
    .format(twentyFourHour ? "HH:mm" : "h:mma");
  return `${t} for me in ${city}`;
}

export function fromNow(msUntilStart: number): string {
  if (!Number.isFinite(msUntilStart) || msUntilStart <= 0) return "now";
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} from now`;
  if (msUntilStart >= DAY_MS) return plural(Math.floor(msUntilStart / DAY_MS), "day");
  if (msUntilStart >= HOUR_MS) return plural(Math.floor(msUntilStart / HOUR_MS), "hour");
  return plural(Math.max(1, Math.floor(msUntilStart / 60_000)), "minute");
}

/** Reversible by a `uid ends with` lookup, so a client quoting it can be traced back to the booking. */
export function bookingReference(uid: string): string {
  return `DI-${uid
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-6)
    .toUpperCase()}`;
}

const BAR_PATTERN = [5, 5, 2, 2, 2, 4, 4, 3];
// Rotation is keyed to the reference so bookings look different; the phase aligns the design's sample
// reference (DI-7K2M9Q, char-code sum 581) with the bar pattern drawn in the design file.
const BAR_PHASE = 581 % BAR_PATTERN.length;

export function barcodeWidths(reference: string, bars = 16): number[] {
  const sum = reference.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const offset = (((sum - BAR_PHASE) % BAR_PATTERN.length) + BAR_PATTERN.length) % BAR_PATTERN.length;
  return Array.from({ length: bars }, (_, i) => BAR_PATTERN[(i + offset) % BAR_PATTERN.length]);
}

const GENERIC_SUFFIX = /\s+(studio|studios|co|company|ltd|limited|inc|llc|group|labs)\.?$/i;

/** "Acme Studio" becomes "Acme" for card titles; falls back to the full brand, then a neutral phrase. */
export function brandShort(brand: string | null | undefined): string {
  const b = (brand ?? "").trim();
  if (!b) return "your brand";
  const short = b.replace(GENERIC_SUFFIX, "").trim();
  return short || b;
}

type ResponseValue = { label?: string; value?: unknown } | undefined;
type Responses = Record<string, ResponseValue> | null | undefined;

export type Intake = {
  brand: string | null;
  website: string | null;
  country: string | null;
  category: string | null;
  note: string | null;
};

export function pickIntake(responses: Responses, additionalNotes?: string | null): Intake {
  const entries = Object.entries(responses ?? {});
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const find = (re: RegExp) => {
    const hit = entries.find(([key, r]) => re.test(key) || re.test(String(r?.label ?? "")));
    return hit ? text(hit[1]?.value) : null;
  };
  return {
    brand: find(/^brand/i),
    website: find(/website|url/i),
    country: find(/country/i),
    category: find(/category|industry|sector/i),
    note: text(additionalNotes),
  };
}

/** Working days (Mon to Fri) after an instant, counted in the given zone. */
export function addWorkingDays(iso: string, days: number, timeZone: string) {
  let d = dayjs(iso).tz(timeZone);
  let left = days;
  while (left > 0) {
    d = d.add(1, "day");
    if (d.day() !== 0 && d.day() !== 6) left--;
  }
  return d;
}

/** Null when no minimum notice is configured: never state a deadline the system will not hold. */
export function rescheduleCutoff(
  startIso: string,
  minimumNoticeMinutes: number | null | undefined,
  timeZone: string
) {
  if (!minimumNoticeMinutes || minimumNoticeMinutes <= 0) return null;
  return dayjs(startIso).subtract(minimumNoticeMinutes, "minute").tz(timeZone);
}

export function buildGoogleCalendarUrl(args: {
  title: string;
  startIso: string;
  endIso: string;
  details?: string | null;
  location?: string | null;
}): string {
  const stamp = (iso: string) => dayjs(iso).utc().format("YYYYMMDD[T]HHmmss[Z]");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: args.title,
    dates: `${stamp(args.startIso)}/${stamp(args.endIso)}`,
  });
  if (args.details) params.set("details", args.details);
  if (args.location) params.set("location", args.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
