import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import worker from "./worker.js";

const MIN = 60_000;
const NOW = Date.parse("2026-09-19T10:07:00Z");

let store;
let calls;
let waiting;

const env = () => ({
  STATE: {
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => void store.set(k, v),
    delete: async (k) => void store.delete(k),
  },
  APP_URL: "https://app.example",
  CRON_API_KEY: "key",
  HEARTBEAT_TOKEN: "beat-token",
  STALE_AFTER_MIN: "10",
});
const ctx = () => ({ waitUntil: (p) => void waiting.push(p) });
const tick = async (e = env()) => {
  await worker.scheduled({ scheduledTime: NOW }, e, ctx());
  await Promise.all(waiting);
};

beforeEach(() => {
  store = new Map();
  calls = [];
  waiting = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { status: 200 };
  };
});

test("heartbeat rejects a wrong token and stores nothing", async () => {
  const res = await worker.fetch(new Request("https://w.example/heartbeat?token=nope"), env());
  assert.equal(res.status, 401);
  assert.equal(store.has("last_beat"), false);
});

test("heartbeat with the right token records a beat", async () => {
  const res = await worker.fetch(new Request("https://w.example/heartbeat?token=beat-token"), env());
  assert.equal(res.status, 204);
  assert.ok(store.has("last_beat"));
});

test("any other path is 404", async () => {
  const res = await worker.fetch(new Request("https://w.example/"), env());
  assert.equal(res.status, 404);
});

test("first tick after deploy does not take over (deploy counts as a beat)", async () => {
  await tick();
  assert.equal(calls.length, 0);
});

test("fresh heartbeat means the Worker stays quiet", async () => {
  store.set("deployed_at", String(NOW - 60 * MIN));
  store.set("last_beat", String(NOW - 2 * MIN));
  await tick();
  assert.equal(calls.length, 0);
});

test("a stale heartbeat makes the Worker call the due routes with the key", async () => {
  store.set("deployed_at", String(NOW - 60 * MIN));
  store.set("last_beat", String(NOW - 11 * MIN));
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://app.example/api/cron/webhookTriggers");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization, "key");
  assert.ok(store.has("failover_since"));
});

test("alerts once on takeover and once on hand-back", async () => {
  const e = { ...env(), ALERT_URL: "https://alert.example/topic" };
  store.set("deployed_at", String(NOW - 60 * MIN));
  store.set("last_beat", String(NOW - 11 * MIN));
  await tick(e);
  await tick(e);
  assert.equal(calls.filter((c) => c.url === e.ALERT_URL).length, 1);

  store.set("last_beat", String(NOW - MIN));
  await tick(e);
  assert.equal(store.has("failover_since"), false);
  assert.equal(calls.filter((c) => c.url === e.ALERT_URL).length, 2);
});

test("a failing route does not stop the others or throw", async () => {
  store.set("deployed_at", String(NOW - 60 * MIN));
  const quarter = Date.parse("2026-09-19T10:15:00Z");
  globalThis.fetch = async (url) => {
    calls.push({ url });
    if (String(url).includes("bookingReminder")) throw new Error("boom");
    return { status: 200 };
  };
  await worker.scheduled({ scheduledTime: quarter }, env(), ctx());
  await Promise.all(waiting);
  assert.equal(calls.length, 5);
});

test("a missing CRON_API_KEY alerts once, makes no route calls, and never throws", async () => {
  const e = { ...env(), CRON_API_KEY: undefined, ALERT_URL: "https://alert.example/topic" };
  store.set("deployed_at", String(NOW - 60 * MIN));
  store.set("last_beat", String(NOW - 30 * MIN));

  await tick(e);
  await tick(e);

  assert.equal(calls.filter((c) => c.url !== e.ALERT_URL).length, 0);
  const alerts = calls.filter((c) => c.url === e.ALERT_URL);
  assert.equal(alerts.length, 1);
  assert.ok(alerts[0].init.body.includes("CRON_API_KEY"));
});

test("a missing HEARTBEAT_TOKEN is also reported", async () => {
  const e = { ...env(), HEARTBEAT_TOKEN: undefined, ALERT_URL: "https://alert.example/topic" };

  await tick(e);

  assert.ok(calls.some((c) => c.url === e.ALERT_URL && c.init.body.includes("HEARTBEAT_TOKEN")));
});
