import assert from "node:assert/strict";
import { test } from "node:test";

import { JOBS, dueRoutes } from "./schedule.js";
import { buildJobs, describeAction, planActions, run } from "./setup-cronjobs.mjs";

const KEY = "super-secret-cron-key";
const opts = { appUrl: "https://app.example", cronApiKey: KEY };

test("every JOBS route is built with the right method code, url and auth header", () => {
  const jobs = buildJobs(opts);

  assert.equal(jobs.length, JOBS.length);
  const reminder = jobs.find((j) => j.title === "cal.diy bookingReminder");
  assert.equal(reminder.url, "https://app.example/api/cron/bookingReminder");
  assert.equal(reminder.requestMethod, 1);
  assert.equal(reminder.extendedData.headers.authorization, KEY);
  assert.equal(jobs.find((j) => j.title === "cal.diy selected-calendars").requestMethod, 0);
  assert.equal(reminder.requestTimeout, 30);
  assert.equal(reminder.notification.onFailure, true);
});

test("the heartbeat job is added only when a URL is given, and carries no auth header", () => {
  assert.equal(buildJobs(opts).length, JOBS.length);
  const jobs = buildJobs({ ...opts, heartbeatUrl: "https://w.example/heartbeat?token=t" });
  const beat = jobs.at(-1);

  assert.equal(jobs.length, JOBS.length + 1);
  assert.equal(beat.extendedData, undefined);
  assert.equal(beat.schedule.minutes.length, 12);
});

test("job schedules agree with dueRoutes for a sample of minutes", () => {
  for (const iso of ["2026-09-19T10:07:00Z", "2026-09-19T10:15:00Z", "2026-09-19T03:00:00Z", "2026-10-01T00:10:00Z"]) {
    const date = new Date(iso);
    const fromJobs = buildJobs(opts)
      .filter(({ schedule }) => {
        const ok = (list, v) => list.includes(-1) || list.includes(v);
        return (
          ok(schedule.minutes, date.getUTCMinutes()) &&
          ok(schedule.hours, date.getUTCHours()) &&
          ok(schedule.mdays, date.getUTCDate())
        );
      })
      .map((j) => j.url.replace("https://app.example", ""));
    assert.deepEqual(fromJobs, dueRoutes(date).map((r) => r.path), iso);
  }
});

test("planActions updates jobs that exist by title and creates the rest", () => {
  const wanted = buildJobs(opts);
  const existing = [{ jobId: 42, title: "cal.diy bookingReminder" }];
  const plan = planActions(wanted, existing);

  assert.equal(plan.find((a) => a.job.title === "cal.diy bookingReminder").action, "update");
  assert.equal(plan.find((a) => a.job.title === "cal.diy bookingReminder").jobId, 42);
  assert.equal(plan.filter((a) => a.action === "create").length, JOBS.length - 1);
});

test("describeAction never includes the key", () => {
  const [action] = planActions(buildJobs(opts), []);
  assert.ok(!describeAction(action).includes(KEY));
});

function fakeApi(existing = []) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body });
    if (url.endsWith("/jobs") && init.method === "GET") return { ok: true, status: 200, json: async () => ({ jobs: existing }) };
    return { ok: true, status: 200, json: async () => ({ jobId: 1 }) };
  };
  return { calls, fetchImpl };
}

const env = { CRONJOB_API_KEY: "cj-key", CRON_API_KEY: KEY };

test("dry run only lists jobs, writes nothing, and never prints the key", async () => {
  const { calls, fetchImpl } = fakeApi();
  const out = [];

  const code = await run({ env, argv: [], fetchImpl, log: (l) => out.push(l) });

  assert.equal(code, 0);
  assert.deepEqual(calls.map((c) => c.method), ["GET"]);
  assert.ok(!out.join("\n").includes(KEY));
  assert.ok(out.join("\n").includes("Dry run"));
});

test("--apply creates missing jobs with PUT and updates existing ones with PATCH, pausing between writes", async () => {
  const { calls, fetchImpl } = fakeApi([{ jobId: 7, title: "cal.diy webhookTriggers" }]);
  const sleeps = [];

  await run({ env, argv: ["--apply"], fetchImpl, sleep: async (ms) => void sleeps.push(ms), log: () => {} });

  const writes = calls.filter((c) => c.method !== "GET");
  assert.equal(writes.length, JOBS.length);
  assert.equal(writes.filter((c) => c.method === "PATCH").length, 1);
  assert.ok(writes.find((c) => c.method === "PATCH").url.endsWith("/jobs/7"));
  assert.equal(sleeps.length, JOBS.length - 1);
  assert.ok(sleeps.every((ms) => ms >= 12_000));
});

test("missing keys fail before any request", async () => {
  const { calls, fetchImpl } = fakeApi();
  await assert.rejects(run({ env: { CRON_API_KEY: KEY }, argv: [], fetchImpl }), /CRONJOB_API_KEY/);
  await assert.rejects(run({ env: { CRONJOB_API_KEY: "x" }, argv: [], fetchImpl }), /CRON_API_KEY/);
  assert.equal(calls.length, 0);
});

test("an API failure surfaces without leaking a key", async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(run({ env, argv: [], fetchImpl }), (error) => /429/.test(error.message) && !error.message.includes(KEY));
});

test("--check reports the status of a single webhookTriggers call", async () => {
  const out = [];
  const fetchImpl = async (url, init) => {
    assert.ok(url.endsWith("/api/cron/webhookTriggers"));
    assert.equal(init.headers.authorization, KEY);
    return { status: 400 };
  };

  const code = await run({ env: { CRON_API_KEY: KEY }, argv: ["--check"], fetchImpl, log: (l) => out.push(l) });

  assert.equal(code, 1);
  assert.ok(out[0].includes("HTTP 400"));
  assert.ok(!out[0].includes(KEY));
});
