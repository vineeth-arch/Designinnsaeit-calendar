#!/usr/bin/env node
// Creates or updates the cron-job.org jobs for the cal.diy cron routes from the JOBS table in schedule.js.
//
//   CRONJOB_API_KEY=... CRON_API_KEY=... node setup-cronjobs.mjs           # dry run, prints the plan
//   CRONJOB_API_KEY=... CRON_API_KEY=... node setup-cronjobs.mjs --apply   # writes the jobs
//   CRON_API_KEY=... node setup-cronjobs.mjs --check                       # one live call to webhookTriggers
//
// Optional: HEARTBEAT_URL (the Worker's /heartbeat?token=... URL) adds the heartbeat job; APP_URL overrides
// the default app URL. Keys are read from the environment only and are never printed.
import { pathToFileURL } from "node:url";

import { JOBS } from "./schedule.js";

const API = "https://api.cron-job.org";
const DEFAULT_APP_URL = "https://appointments.designinnsaeit.com";
const METHOD_CODE = { GET: 0, POST: 1 };
// cron-job.org allows 5 job creations per minute; stay under it.
const WRITE_DELAY_MS = 13_000;

const HEARTBEAT_TITLE = "cal.diy cron watchdog heartbeat";

export function buildJobs({ appUrl, cronApiKey, heartbeatUrl }) {
  const jobs = JOBS.map(({ title, path, method, schedule }) => ({
    title,
    url: appUrl + path,
    enabled: true,
    saveResponses: false,
    requestTimeout: 30,
    requestMethod: METHOD_CODE[method],
    extendedData: { headers: { authorization: cronApiKey } },
    schedule: { timezone: "UTC", months: [-1], wdays: [-1], ...schedule },
    notification: { onFailure: true, onSuccess: false, onDisable: true },
  }));
  if (heartbeatUrl) {
    jobs.push({
      title: HEARTBEAT_TITLE,
      url: heartbeatUrl,
      enabled: true,
      saveResponses: false,
      requestTimeout: 30,
      requestMethod: METHOD_CODE.GET,
      schedule: { timezone: "UTC", hours: [-1], mdays: [-1], months: [-1], wdays: [-1], minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
      notification: { onFailure: true, onSuccess: false, onDisable: true },
    });
  }
  return jobs;
}

// Plans one action per wanted job: update when a job with the same title exists, otherwise create.
export function planActions(wanted, existing) {
  const byTitle = new Map(existing.map((job) => [job.title, job]));
  return wanted.map((job) => {
    const match = byTitle.get(job.title);
    return match ? { action: "update", jobId: match.jobId, job } : { action: "create", job };
  });
}

// Never prints header values, so the cron key cannot leak into a terminal or a log.
export function describeAction({ action, job }) {
  const method = job.requestMethod === 1 ? "POST" : "GET";
  return `${action.padEnd(6)} ${job.title}  ${method} ${job.url.split("?")[0]}`;
}

async function api(fetchImpl, key, method, path, body) {
  const res = await fetchImpl(API + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`cron-job.org ${method} ${path} failed: HTTP ${res.status}`);
  return res.json();
}

export async function run({ env, argv, fetchImpl = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log }) {
  const apply = argv.includes("--apply");
  const appUrl = (env.APP_URL || DEFAULT_APP_URL).replace(/\/+$/, "");

  if (argv.includes("--check")) {
    if (!env.CRON_API_KEY) throw new Error("Set CRON_API_KEY to use --check");
    const res = await fetchImpl(`${appUrl}/api/cron/webhookTriggers`, {
      method: "POST",
      headers: { authorization: env.CRON_API_KEY },
    });
    log(`POST /api/cron/webhookTriggers -> HTTP ${res.status} (200 = key accepted, 400 = key does not match Railway)`);
    return res.status === 200 ? 0 : 1;
  }

  if (!env.CRONJOB_API_KEY) throw new Error("Set CRONJOB_API_KEY (cron-job.org > Settings > API)");
  if (!env.CRON_API_KEY) throw new Error("Set CRON_API_KEY (the same value as on the Railway web service)");

  const wanted = buildJobs({ appUrl, cronApiKey: env.CRON_API_KEY, heartbeatUrl: env.HEARTBEAT_URL });
  const existing = (await api(fetchImpl, env.CRONJOB_API_KEY, "GET", "/jobs")).jobs ?? [];
  const actions = planActions(wanted, existing);

  actions.forEach((a) => log(describeAction(a)));
  if (!apply) {
    log(`\nDry run: ${actions.length} job(s). Re-run with --apply to write them.`);
    return 0;
  }

  for (let i = 0; i < actions.length; i++) {
    const { action, jobId, job } = actions[i];
    if (action === "update") await api(fetchImpl, env.CRONJOB_API_KEY, "PATCH", `/jobs/${jobId}`, { job });
    else await api(fetchImpl, env.CRONJOB_API_KEY, "PUT", "/jobs", { job });
    log(`done ${i + 1}/${actions.length}: ${job.title}`);
    if (i < actions.length - 1) await sleep(WRITE_DELAY_MS);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  run({ env: process.env, argv: process.argv.slice(2) }).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    }
  );
}
