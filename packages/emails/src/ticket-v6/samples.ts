import { getTranslation } from "@calcom/i18n/server";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { SummaryFields } from "./summary";

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

// The design's sample for email 6, with the design's own captions.
export const SAMPLE_SUMMARY: SummaryFields = {
  quotes: [
    "We charge premium prices but we read like every other candle brand on the shelf.",
    "We redrew the labels last year. They looked better. Sales did not move.",
    "John Lewis will list us if the range reads as premium.",
  ],
  categoryNoun: "candle",
  today: { premium: true, distinctive: false },
  target: { premium: true, distinctive: true },
  goal: "the listing",
  captions: {
    topLeft: "Distinctive, but priced like\na supermarket brand",
    bottomLeft: "Sells on discount\nand stays there",
  },
  problem:
    "Acme does not have a design problem. The pack and the site were redrawn last year and sales held flat, because the two layers underneath were never settled. A premium price with a category-standard story reads as a contradiction, and a buyer resolves that contradiction by asking for a discount.",
  stack: [
    { settled: false, note: "never settled" },
    { settled: false, note: "never settled" },
    { settled: true, note: "redrawn last year" },
    { settled: true, note: "redrawn last year" },
  ],
  riding: [
    { title: "The listing", text: "You put it at a mid-six-figure line if the range is accepted." },
    { title: "The Q1 window", text: "Miss the buyer and the next window is a year out." },
    { title: "A third attempt", text: "Another redraw that does not move sales costs more than the fee." },
  ],
  fit: {
    yes: true,
    why: "I have repositioned four home and food brands before a retail listing. If I thought another label redraw would fix this, I would have said so on the call.",
  },
  nextTitle: "What holding the price is worth",
  nextBody:
    "Before I put a number on anything, we work out what the listing and the held price are worth to Acme, and what missing them costs. I write the proposal after that conversation, not before it.",
  deadline: "2026-10-02",
  slots: 2,
  bookingLink: "https://cal.designinnsaeit.com/vineeth/next",
};
