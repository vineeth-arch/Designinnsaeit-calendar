// Failover watchdog for the cal.diy cron routes. cron-job.org is the primary scheduler and pings
// /heartbeat every 5 minutes. This Worker only calls the routes itself when the heartbeat goes quiet,
// so the two never run the same job at once (handleWebhookScheduledTriggers is not safe to run twice).
import { dueRoutes } from "./schedule.js";

const MINUTE_MS = 60_000;
const REQUIRED_SECRETS = ["CRON_API_KEY", "HEARTBEAT_TOKEN"];

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function alert(env, text) {
  if (!env.ALERT_URL) return;
  try {
    await fetch(env.ALERT_URL, { method: "POST", body: text, signal: AbortSignal.timeout(10_000) });
  } catch {
    // An alert that can't be delivered must not stop the cron calls.
  }
}

async function runRoutes(env, routes) {
  const results = await Promise.allSettled(
    routes.map(async ({ path, method }) => {
      const res = await fetch(env.APP_URL + path, {
        method,
        headers: { authorization: env.CRON_API_KEY },
        signal: AbortSignal.timeout(25_000),
      });
      console.log(`${method} ${path} ${res.status}`);
    })
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") console.log(`${routes[i].method} ${routes[i].path} failed: ${r.reason}`);
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/heartbeat") {
      return new Response("Not found", { status: 404 });
    }
    const token = url.searchParams.get("token") ?? "";
    if (!env.HEARTBEAT_TOKEN || !safeEqual(token, env.HEARTBEAT_TOKEN)) {
      return new Response("Unauthorized", { status: 401 });
    }
    await env.STATE.put("last_beat", String(Date.now()));
    return new Response(null, { status: 204 });
  },

  async scheduled(event, env, ctx) {
    const now = event.scheduledTime;

    // A missing secret would make every failover call fail quietly, so say so loudly instead. The flag
    // expires after a day so a still-broken Worker keeps reminding you.
    const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
    if (missing.length > 0) {
      console.log(`cron watchdog misconfigured: missing ${missing.join(", ")}`);
      if (!(await env.STATE.get("misconfig_alerted"))) {
        await env.STATE.put("misconfig_alerted", String(now), { expirationTtl: 86_400 });
        ctx.waitUntil(alert(env, `cal.diy cron watchdog is missing secret(s): ${missing.join(", ")}. Failover cannot work until they are set.`));
      }
      return;
    }

    let deployedAt = Number(await env.STATE.get("deployed_at"));
    if (!deployedAt) {
      deployedAt = now;
      await env.STATE.put("deployed_at", String(now));
    }
    const lastBeat = Number(await env.STATE.get("last_beat")) || 0;
    const staleAfterMs = Number(env.STALE_AFTER_MIN || 10) * MINUTE_MS;
    // Deploy time counts as a beat, which gives the primary one full window to start pinging.
    const stale = now - Math.max(lastBeat, deployedAt) > staleAfterMs;
    const failoverSince = await env.STATE.get("failover_since");

    if (!stale) {
      if (failoverSince) {
        await env.STATE.delete("failover_since");
        ctx.waitUntil(alert(env, "cal.diy cron watchdog: heartbeat is back, handed back to cron-job.org."));
      }
      return;
    }

    if (!failoverSince) {
      await env.STATE.put("failover_since", String(now));
      ctx.waitUntil(alert(env, "cal.diy cron watchdog: no heartbeat from cron-job.org, Worker is running the crons."));
    }
    ctx.waitUntil(runRoutes(env, dueRoutes(new Date(now))));
  },
};
