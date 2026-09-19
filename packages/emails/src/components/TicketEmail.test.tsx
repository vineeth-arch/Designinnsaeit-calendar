import { getTranslation } from "@calcom/i18n/server";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { beforeAll, describe, expect, it } from "vitest";
import { shouldUseTicketLayout } from "../../templates/organizer-scheduled-email";
import renderEmail from "../renderEmail";
import { formatDuration, formatStartsIn, getDurationMinutes, getJoinUrl } from "./ticketEmailContent";

type T = Awaited<ReturnType<typeof getTranslation>>;
let t: T;

const person = (name: string, email: string, timeZone = "Asia/Kolkata"): Person => ({
  name,
  email,
  timeZone,
  language: { translate: t, locale: "en" },
});

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => {
  const attendee = person("Jordan Lee", "jordan@acme.studio");
  return {
    type: "discovery-call",
    title: "Discovery Call between Design Innsæit and Jordan Lee",
    startTime: "2026-09-21T03:30:00.000Z",
    endTime: "2026-09-21T04:00:00.000Z",
    organizer: person("Design Innsæit", "hello@designinnsaeit.com"),
    attendees: [attendee],
    location: "https://meet.google.com/abc-defg-hij",
    uid: "uid-123",
    ...overrides,
  };
};

beforeAll(async () => {
  t = await getTranslation("en", "common");
});

describe("ticket email helpers", () => {
  it("formats durations", () => {
    expect(formatDuration(getDurationMinutes("2026-01-01T00:00:00Z", "2026-01-01T00:15:00Z"), t)).toBe(
      "15 mins"
    );
    expect(formatDuration(90, t)).toBe("1h 30m");
    expect(formatDuration(60, t)).toBe("1h");
    expect(formatDuration(0, t)).toBeNull();
    expect(getDurationMinutes("bad", "2026-01-01T00:15:00Z")).toBe(0);
  });

  it("formats the starts-in line", () => {
    expect(formatStartsIn(2 * 86_400_000, t)).toBe("Starts in 2 days");
    expect(formatStartsIn(86_400_000, t)).toBe("Starts in 1 day");
    expect(formatStartsIn(3 * 3_600_000, t)).toBe("Starts in 3 hours");
    expect(formatStartsIn(10 * 60_000, t)).toBe("Starts in 10 minutes");
    expect(formatStartsIn(-5, t)).toBe("Starting now");
    expect(formatStartsIn(Number.NaN, t)).toBeNull();
  });

  it("only treats http(s) locations as join links", () => {
    expect(getJoinUrl(makeEvent())).toBe("https://meet.google.com/abc-defg-hij");
    expect(getJoinUrl(makeEvent({ location: "+44 20 7946 0000" }))).toBeNull();
    expect(getJoinUrl(makeEvent({ location: "10 Downing St, London" }))).toBeNull();
  });

  it("keeps the old organizer email for seats, reassignment, recurring and team members", () => {
    const calEvent = makeEvent();
    expect(shouldUseTicketLayout({ calEvent })).toBe(true);
    expect(shouldUseTicketLayout({ calEvent, newSeat: true })).toBe(false);
    expect(shouldUseTicketLayout({ calEvent, reassigned: { name: "A", email: "a@x.com" } })).toBe(false);
    expect(shouldUseTicketLayout({ calEvent, teamMember: person("B", "b@x.com") })).toBe(false);
    expect(
      shouldUseTicketLayout({ calEvent: makeEvent({ recurringEvent: { freq: 2, count: 4, interval: 1 } }) })
    ).toBe(false);
  });
});

describe("ticket email rendering", () => {
  const actionCount = (html: string) => (html.match(/data-testid="ticket-email-action"/g) ?? []).length;

  it("renders the confirmation ticket in the recipient's timezone", async () => {
    const calEvent = makeEvent();
    const html = await renderEmail("AttendeeTicketConfirmationEmail", {
      calEvent,
      attendee: calEvent.attendees[0],
    });
    expect(html).toContain('data-ticket="1"');
    expect(html).toContain("Booked");
    expect(html).toContain("9:00am");
    expect(html).toContain("30 mins");
    expect(html).toContain('data-testid="ticket-email-join"');
    expect(html).toContain("https://meet.google.com/abc-defg-hij");
    expect(actionCount(html)).toBe(3);
    expect(html).toMatch(/colSpan="2"|colspan="2"/i);
  });

  it("renders the host alert, reminders and follow-up variants", async () => {
    const calEvent = makeEvent();
    const attendee = calEvent.attendees[0];
    const host = await renderEmail("OrganizerTicketNewBookingEmail", { calEvent });
    expect(host).toContain("New booking");
    expect(host).toContain("jordan@acme.studio");
    expect(actionCount(host)).toBe(2);

    const r24 = await renderEmail("AttendeeReminderEmail", { calEvent, attendee, reminderLabel: "24h" });
    expect(r24).toContain("Tomorrow");
    const r1 = await renderEmail("AttendeeReminderEmail", { calEvent, attendee, reminderLabel: "1h" });
    expect(r1).toContain("In 1 hour");
    expect(actionCount(r1)).toBe(2);

    const followUp = await renderEmail("AttendeeFollowUpEmail", { calEvent, attendee });
    expect(followUp).toContain("Thanks");
    expect(followUp).toContain("Thank you for your time");
    expect(followUp).not.toContain('data-testid="ticket-email-join"');
    expect(actionCount(followUp)).toBe(0);
  });

  it("drops the join button and shows the location text when there is no meeting URL", async () => {
    const calEvent = makeEvent({ location: "10 Downing St, London" });
    const html = await renderEmail("AttendeeTicketConfirmationEmail", {
      calEvent,
      attendee: calEvent.attendees[0],
    });
    expect(html).not.toContain('data-testid="ticket-email-join"');
    expect(html).toContain("10 Downing St, London");
    expect(html).toContain("Manage booking");
  });

  it("escapes untrusted titles and stays email-safe and under Gmail's clip size", async () => {
    const calEvent = makeEvent({ title: "<script>alert(1)</script>", description: "Intro **call**" });
    const html = await renderEmail("AttendeeTicketConfirmationEmail", {
      calEvent,
      attendee: calEvent.attendees[0],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/display:\s*(flex|grid)/);
    for (const img of html.match(/<img[^>]*>/g) ?? []) expect(img).toMatch(/alt=/);
    expect(Buffer.byteLength(html)).toBeLessThan(100 * 1024);
  });

  it("leaves the shared scheduled and cancelled emails on the old layout", async () => {
    const calEvent = makeEvent();
    const attendee = calEvent.attendees[0];
    expect(await renderEmail("AttendeeScheduledEmail", { calEvent, attendee })).not.toContain(
      'data-ticket="1"'
    );
    expect(await renderEmail("AttendeeCancelledEmail", { calEvent, attendee })).not.toContain(
      'data-ticket="1"'
    );
    expect(await renderEmail("OrganizerScheduledEmail", { calEvent, attendee })).not.toContain(
      'data-ticket="1"'
    );
  });
});
