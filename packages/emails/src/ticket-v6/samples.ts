import { getTranslation } from "@calcom/i18n/server";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

// The design's sample booking: Jordan Lee of Acme Studio, Monday 21 September 2026, 10:30am BST (3:00pm IST).
export const SAMPLE_START = "2026-09-21T09:30:00.000Z";
export const SAMPLE_END = "2026-09-21T10:00:00.000Z";
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export async function sampleEvent(overrides: Partial<CalendarEvent> = {}) {
  const t = await getTranslation("en", "common");
  const person = (name: string, email: string, timeZone: string): Person => ({
    name,
    email,
    timeZone,
    language: { translate: t, locale: "en" },
  });
  const attendee = person("Jordan Lee", "jordan@acme.studio", "Europe/London");
  const organizer = person("Vineeth", "hello@designinnsaeit.com", "Asia/Kolkata");
  const intake = {
    brand: { label: "Brand", value: "Acme Studio" },
    category: { label: "Category", value: "home fragrance" },
    website: { label: "Website", value: "acme.studio" },
    country: { label: "Country", value: "United Kingdom" },
  };
  const calEvent: CalendarEvent = {
    type: "Brand strategy call",
    title: "Brand strategy call between Design Innsæit and Jordan Lee",
    startTime: SAMPLE_START,
    endTime: SAMPLE_END,
    organizer,
    attendees: [attendee],
    location: "https://meet.google.com/abc-defg-hij",
    uid: "abcXYZ7k2m9q",
    additionalNotes:
      "We charge premium prices but we read like every other candle brand on the shelf, so we end up discounting to shift stock.",
    responses: intake,
    userFieldsResponses: intake,
    minimumRescheduleNotice: 24 * 60,
    ...overrides,
  };
  return { calEvent, attendee, organizer, t };
}
