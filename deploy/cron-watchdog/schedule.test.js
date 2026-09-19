import assert from "node:assert/strict";
import { test } from "node:test";

import { dueRoutes } from "./schedule.js";

const names = (iso) => dueRoutes(new Date(iso)).map((r) => r.path.replace("/api/cron/", ""));

test("an ordinary minute only runs webhookTriggers", () => {
  assert.deepEqual(names("2026-09-19T10:07:00Z"), ["webhookTriggers"]);
});

test("quarter hours add the 15-minute routes", () => {
  assert.deepEqual(names("2026-09-19T10:15:00Z"), [
    "webhookTriggers",
    "bookingReminder",
    "attendeeAutomations",
    "selected-calendars",
    "calendar-subscriptions",
  ]);
});

test("03:00 UTC includes the calendar subscription cleanup", () => {
  assert.ok(names("2026-09-19T03:00:00Z").includes("calendar-subscriptions-cleanup"));
});

test("00:05 UTC runs changeTimeZone, on any day", () => {
  assert.ok(names("2026-09-19T00:05:00Z").includes("changeTimeZone"));
});

test("syncAppMeta runs only on the 1st at 00:10 UTC", () => {
  assert.ok(names("2026-10-01T00:10:00Z").includes("syncAppMeta"));
  assert.ok(!names("2026-10-02T00:10:00Z").includes("syncAppMeta"));
});

test("methods match what each route exports", () => {
  const byName = Object.fromEntries(dueRoutes(new Date("2026-10-01T00:15:00Z")).map((r) => [r.path, r.method]));
  assert.equal(byName["/api/cron/webhookTriggers"], "POST");
  assert.equal(byName["/api/cron/selected-calendars"], "GET");
});
