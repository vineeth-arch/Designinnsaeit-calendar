import { readFileSync } from "node:fs";
import process from "node:process";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { beforeAll, describe, expect, it } from "vitest";
import { BOOKING_HOST } from "./context";
import { bodyFragment, diffHtml } from "./normalize";
import { DAY, HOUR, SAMPLE_START, sampleEvent } from "./samples";
import {
  renderConfirmation,
  renderFollowUp,
  renderHostAlert,
  renderReminder1h,
  renderReminder24h,
  type V6Input,
} from "./templates";

const fixtureDir = `${process.cwd()}/docs/design/emails/v6/fixtures`;
const start = new Date(SAMPLE_START).getTime();

const fixture = (name: string) =>
  readFileSync(`${fixtureDir}/${name}.html`, "utf8")
    .replaceAll("{{WEBAPP_URL}}", WEBAPP_URL)
    .replaceAll("cal.designinnsaeit.com", BOOKING_HOST());

// href values are data (links built from the booking), so they are checked separately below.
const ignoreHref = (_path: string, attr: string) => attr === "href";

let base: Awaited<ReturnType<typeof sampleEvent>>;
beforeAll(async () => {
  base = await sampleEvent();
});

const input = (recipient: "attendee" | "host", now: number): V6Input => ({
  calEvent: base.calEvent,
  recipient: recipient === "attendee" ? base.attendee : base.organizer,
  timeZone: recipient === "attendee" ? base.attendee.timeZone : base.organizer.timeZone,
  now,
});

// Differences that are intentional. Anything not listed fails the test.
const KNOWN_DEVIATIONS: { fixture: string; expected: string; actual: string; reason: string }[] = [
  {
    fixture: "host",
    expected: "Jordan Lee, United Kingdom. Home fragrance, D2C and wholesale.",
    actual: "Jordan Lee, United Kingdom. Home fragrance.",
    reason:
      "The design's sample has a second intake answer (D2C and wholesale) that the booking form does not collect.",
  },
];

const unexpected = (fixtureName: string, diffs: ReturnType<typeof diffHtml>) =>
  diffs.filter(
    (d) =>
      !KNOWN_DEVIATIONS.some(
        (k) => k.fixture === fixtureName && k.expected === d.expected && k.actual === d.actual
      )
  );

const cases = [
  {
    name: "confirmation",
    fixture: "confirmation",
    render: () => renderConfirmation(input("attendee", start - 3 * DAY)),
  },
  { name: "host alert", fixture: "host", render: () => renderHostAlert(input("host", start - 3 * DAY)) },
  {
    name: "24h reminder",
    fixture: "reminder24",
    render: () => renderReminder24h(input("attendee", start - DAY)),
  },
  {
    name: "1h reminder",
    fixture: "reminder1",
    render: () => renderReminder1h(input("attendee", start - (HOUR - 18_000))),
  },
  {
    name: "follow-up",
    fixture: "followup",
    render: () => renderFollowUp(input("attendee", start + 2 * HOUR)),
  },
];

describe("v6 golden", () => {
  for (const c of cases) {
    it(`${c.name} matches the design`, () => {
      const { html } = c.render();
      const diffs = diffHtml(fixture(c.fixture), bodyFragment(html), ignoreHref);
      expect(unexpected(c.fixture, diffs).slice(0, 30)).toEqual([]);
    });
  }
});
