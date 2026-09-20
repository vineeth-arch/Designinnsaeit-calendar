import { beforeAll, describe, expect, it } from "vitest";
import renderEmail from "../renderEmail";
import { bodyFragment } from "./normalize";
import { DAY, HOUR, SAMPLE_START, sampleEvent } from "./samples";
import {
  countdownText,
  followUpDates,
  renderConfirmation,
  renderFollowUp,
  renderHostAlert,
  renderNoShow,
  renderReminder1h,
  renderReminder24h,
  type V6Input,
} from "./templates";

const start = new Date(SAMPLE_START).getTime();
let base: Awaited<ReturnType<typeof sampleEvent>>;
beforeAll(async () => {
  base = await sampleEvent();
});

const attendeeInput = (over: Partial<V6Input> = {}, now = start - 3 * DAY): V6Input => ({
  calEvent: base.calEvent,
  recipient: base.attendee,
  timeZone: base.attendee.timeZone,
  now,
  ...over,
});
const hostInput = (over: Partial<V6Input> = {}): V6Input => ({
  calEvent: base.calEvent,
  recipient: base.organizer,
  timeZone: base.organizer.timeZone,
  now: start - 3 * DAY,
  ...over,
});

const renderers = [
  { name: "confirmation", run: (i: V6Input) => renderConfirmation(i), input: () => attendeeInput() },
  { name: "host alert", run: (i: V6Input) => renderHostAlert(i), input: () => hostInput() },
  {
    name: "24h reminder",
    run: (i: V6Input) => renderReminder24h(i),
    input: () => attendeeInput({}, start - DAY),
  },
  {
    name: "1h reminder",
    run: (i: V6Input) => renderReminder1h(i),
    input: () => attendeeInput({}, start - HOUR),
  },
  {
    name: "follow-up",
    run: (i: V6Input) => renderFollowUp(i),
    input: () => attendeeInput({}, start + 2 * HOUR),
  },
  { name: "no-show", run: (i: V6Input) => renderNoShow(i), input: () => attendeeInput({}, start + 2 * HOUR) },
];

describe("v6 emails: hygiene", () => {
  for (const r of renderers) {
    it(`${r.name} is email-safe, small and marked`, () => {
      const { html } = r.run(r.input());
      expect(Buffer.byteLength(html)).toBeLessThan(100 * 1024);
      expect(html).toContain('data-v6="1"');
      expect(html).not.toMatch(/display:\s*(flex|grid)/);
      expect(html).not.toMatch(/<script|<svg/i);
      for (const img of html.match(/<img[^>]*>/g) ?? []) expect(img).toMatch(/alt=/);
    });
  }
});

describe("v6 emails: subjects", () => {
  it("use the design's inbox lines", () => {
    expect(renderConfirmation(attendeeInput()).subject).toBe(
      "Booked: brand strategy call, Mon 21 Sep, 10:30am UK time"
    );
    expect(renderHostAlert(hostInput()).subject).toBe(
      "New booking: Jordan Lee, Acme Studio (United Kingdom). Mon 21 Sep, 3:00pm IST"
    );
    expect(renderReminder24h(attendeeInput({}, start - DAY)).subject).toBe(
      "Tomorrow, 10:30am: three things to bring"
    );
    expect(renderReminder1h(attendeeInput({}, start - HOUR)).subject).toBe(
      "Starting in 1 hour: your link to join"
    );
  });
});

describe("v6 emails: links", () => {
  it("confirmation links to the calendar, meeting, booking and manage pages", () => {
    const { html } = renderConfirmation(attendeeInput());
    expect(html).toContain("https://calendar.google.com/calendar/render?");
    expect(html).toContain("https://meet.google.com/abc-defg-hij");
    expect(html).toContain("https://acme.studio");
    expect(html).toMatch(/\/reschedule\/abcXYZ7k2m9q/);
    expect(html).toMatch(/\/booking\/abcXYZ7k2m9q/);
    expect(html).toContain("DI-7K2M9Q");
  });

  it("host alert links to the site and to a mail to the attendee", () => {
    const { html } = renderHostAlert(hostInput());
    expect(html).toContain('href="https://acme.studio"');
    expect(html).toContain('href="mailto:jordan@acme.studio"');
    expect(html).toContain("LEAD DI-7K2M9Q");
  });
});

describe("v6 emails: graceful with missing data", () => {
  it("drops the cutoff clause when no minimum notice is set", async () => {
    const { calEvent } = await sampleEvent({ minimumRescheduleNotice: null });
    const { html } = renderConfirmation({ ...attendeeInput(), calEvent });
    expect(html).toContain("Need to move it?");
    expect(html).not.toContain("so the slot can go to someone else");
  });

  it("omits the moves sentence when rescheduling and cancelling are disabled", async () => {
    const { calEvent } = await sampleEvent({ disableRescheduling: true, disableCancelling: true });
    const { html } = renderConfirmation({ ...attendeeInput(), calEvent });
    expect(html).not.toContain("Need to move it?");
  });

  it("without a meeting link there is no call button and the location is shown", async () => {
    const { calEvent } = await sampleEvent({ location: "10 Downing Street, London" });
    const one = renderReminder1h({ ...attendeeInput({}, start - HOUR), calEvent });
    expect(one.html).not.toContain("Join the call");
    const conf = renderConfirmation({ ...attendeeInput(), calEvent });
    expect(conf.html).toContain("10 Downing Street, London");
    expect(conf.html).not.toContain("on Google Meet");
  });

  it("drops the website button, category and note when absent", async () => {
    const { calEvent } = await sampleEvent({
      additionalNotes: undefined,
      responses: { brand: { label: "Brand", value: "Northwind" } },
      userFieldsResponses: { brand: { label: "Brand", value: "Northwind" } },
    });
    const { html } = renderHostAlert({ ...hostInput(), calEvent });
    expect(html).not.toMatch(/>Open [^ <]+\.[a-z]+</i);
    expect(html).not.toContain("Why they booked");
    expect(html).toContain("Email Jordan");
    expect(html).toContain("PREP: Jordan Lee, Northwind.");
  });

  it("escapes untrusted intake text", async () => {
    const evil = { brand: { label: "Brand", value: "<img src=x onerror=alert(1)>" } };
    const { calEvent } = await sampleEvent({
      responses: evil,
      userFieldsResponses: evil,
      additionalNotes: "<script>alert(1)</script>",
    });
    const html = renderHostAlert({ ...hostInput(), calEvent }).html;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("v6 emails: 1h countdown and reminder wording", () => {
  it("static countdown counts down from the send time", () => {
    const text = countdownText(59 * 60_000 + 42_000).replace(/<[^>]+>/g, " ");
    expect(text.replace(/\s+/g, " ")).toContain("00 hours : 59 minutes : 42 seconds");
    expect(countdownText(-5)).toContain(">00<");
  });

  it("24h reminder calls the day 'Tomorrow' and later ones by weekday", () => {
    expect(renderReminder24h(attendeeInput({}, start - DAY)).html).toContain(">Tomorrow<");
    expect(renderReminder24h(attendeeInput({}, start - 3 * DAY)).html).toContain(">Monday<");
  });
});

describe("v6 emails: regression guard", () => {
  it("shared old templates do not carry the v6 marker", async () => {
    const { calEvent, attendee } = base;
    for (const name of [
      "AttendeeScheduledEmail",
      "AttendeeCancelledEmail",
      "AttendeeRescheduledEmail",
    ] as const) {
      expect(await renderEmail(name, { calEvent, attendee })).not.toContain('data-v6="1"');
    }
    expect(await renderEmail("OrganizerScheduledEmail", { calEvent, attendee })).not.toContain('data-v6="1"');
  });

  it("v6 components render through renderEmail with the marker and no leftover script tags", async () => {
    const { calEvent, attendee } = base;
    const html = await renderEmail("AttendeeConfirmationV6Email", {
      calEvent,
      attendee,
      now: start - 3 * DAY,
    });
    expect(html).toContain('data-v6="1"');
    expect(html).not.toContain("<script");
    expect(bodyFragment(html)).toContain("Jordan, you are booked.");
  });
});

describe("follow-up dates", () => {
  it("skips the weekend in the host's zone", () => {
    // Fri 25 Sep 2026 10:00 UTC (15:30 IST): +1 working day = Mon 28, +2 = Tue 29
    const { due, replyBy } = followUpDates("2026-09-25T10:00:00.000Z", "Asia/Kolkata");
    expect(replyBy.format("ddd D")).toBe("Mon 28");
    expect(due.format("ddd D")).toBe("Tue 29");
  });
  it("counts Mon call: reply Tue, summary Wed", () => {
    const { due, replyBy } = followUpDates("2026-09-21T10:00:00.000Z", "Asia/Kolkata");
    expect(replyBy.format("ddd D")).toBe("Tue 22");
    expect(due.format("ddd D")).toBe("Wed 23");
  });
});

describe("no-show variant", () => {
  it("has its own subject, status and one button", () => {
    const r = renderNoShow(attendeeInput({}, start + 2 * HOUR));
    expect(r.subject).toBe("We missed each other today");
    expect(r.html).toContain("MISSED CALL");
    expect(r.html).toContain("Pick a new time");
    expect(r.html).not.toContain("here is what happens next");
  });
});
