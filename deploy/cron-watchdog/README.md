# Cron scheduling for appointments.designinnsaeit.com

cal.diy needs something to call its `/api/cron/*` routes on a schedule. The upstream GitHub Actions
cron workflows do not: they need `APP_URL` and `CRON_API_KEY` repo secrets that were never set, so their
only step is skipped and they show green while doing nothing. Those workflows are disabled (see
`.github/DISABLED-WORKFLOWS.md`).

## Design

- **Primary: cron-job.org** (free, 1-minute interval) calls every route.
- **Backup: this Cloudflare Worker** (free plan). cron-job.org also pings the Worker's `/heartbeat` every
  5 minutes. If no heartbeat arrives for 10 minutes, the Worker calls the due routes itself, sends one
  alert, and hands back automatically when heartbeats resume.
- Never both at once: `handleWebhookScheduledTriggers` reads, sends, then deletes, so running it twice at
  the same moment would send some webhooks twice.

## cron-job.org jobs

Create them with one command (dry run first; keys stay in your shell, never in the repo):

```bash
export CRONJOB_API_KEY=...   # cron-job.org > Settings > API
export CRON_API_KEY=...      # same value as the CRON_API_KEY variable on the Railway `web` service
node deploy/cron-watchdog/setup-cronjobs.mjs            # prints the plan, writes nothing
node deploy/cron-watchdog/setup-cronjobs.mjs --apply    # creates or updates the jobs (about 2 minutes: cron-job.org allows 5 creations a minute)
node deploy/cron-watchdog/setup-cronjobs.mjs --check    # one live call to webhookTriggers: 200 = key accepted
```

Re-running is safe: jobs are matched by title and updated. The script has only been tested against a mock of
the cron-job.org API, so if a call is rejected, the error shows the HTTP status. The table below is the same
list for creating jobs by hand.

Base URL `https://appointments.designinnsaeit.com`. Every job sends the header
`authorization: <CRON_API_KEY>` (the raw key, **no** `Bearer`), timeout 30 s, "notify on failure" on.

| Job | Method | Path | Schedule (UTC) |
|---|---|---|---|
| webhookTriggers | POST | `/api/cron/webhookTriggers` | every minute |
| bookingReminder | POST | `/api/cron/bookingReminder` | every 15 min |
| attendeeAutomations | POST | `/api/cron/attendeeAutomations` | every 15 min |
| selected-calendars | GET | `/api/cron/selected-calendars` | every 15 min |
| calendar-subscriptions | GET | `/api/cron/calendar-subscriptions` | every 15 min |
| calendar-subscriptions-cleanup | GET | `/api/cron/calendar-subscriptions-cleanup` | daily 03:00 |
| changeTimeZone | POST | `/api/cron/changeTimeZone` | daily 00:05 |
| syncAppMeta | POST | `/api/cron/syncAppMeta` | 1st of month 00:10 |
| heartbeat | GET | `https://<worker>.workers.dev/heartbeat?token=<HEARTBEAT_TOKEN>` | every 5 min (no auth header) |

A route without a valid key answers `{"message":"Not authenticated"}` with HTTP **400** in this app, so
treat any non-200 as a failure. If the first run of a job says 400, the key in the header does not match
`CRON_API_KEY` on the Railway `web` service.

## Worker setup

```bash
cd deploy/cron-watchdog
npm test                                      # node --test, no dependencies
npx wrangler login
npx wrangler kv namespace create STATE        # paste the returned id into wrangler.toml
npx wrangler secret put CRON_API_KEY          # same value as on Railway `web`
npx wrangler secret put HEARTBEAT_TOKEN       # long random string, e.g. openssl rand -hex 24
npx wrangler secret put ALERT_URL             # optional, e.g. your ntfy topic URL
npx wrangler deploy
```

Then re-run `setup-cronjobs.mjs --apply` with `HEARTBEAT_URL='https://<worker>.workers.dev/heartbeat?token=<HEARTBEAT_TOKEN>'`
set, which adds the heartbeat job. If a secret is missing, the Worker logs it and sends one alert a day instead
of failing quietly.

## Test the failover

1. `npx wrangler tail`. While cron-job.org is healthy the per-minute ticks print nothing.
2. Pause the heartbeat job in cron-job.org for 11 minutes. The tail starts printing
   `POST /api/cron/webhookTriggers 200` each minute and one alert is sent.
3. Resume the job. Within about 5 minutes the calls stop and a "handed back" alert is sent.

## Key rotation

Change `CRON_API_KEY` on Railway, in every cron-job.org job header, and with
`npx wrangler secret put CRON_API_KEY`, together. Rotate `HEARTBEAT_TOKEN` in the Worker secret and the
heartbeat job URL together.

## Free-plan numbers (Cloudflare Workers Free)

- 1 of 5 allowed Cron Triggers.
- About 3 KV reads per minute (roughly 4,300 a day) and at most 288 KV writes a day from heartbeats.
- At most 5 subrequests per tick on the busiest minute, plus alert calls.

## Known limits

- **Do not run reminders twice at once.** `bookingReminder` sends first and records it afterwards, and
  `attendeeAutomations` records nothing (it relies on non-overlapping 15-minute windows), so two overlapping
  runs can send duplicate emails. Never trigger these two routes by hand, and keep the Worker failover-only.

- KV is eventually consistent (up to about 60 s), which does not matter against a 10-minute threshold.
- If cron-job.org keeps running the jobs but only the heartbeat job stops, the Worker also fires and some
  jobs run twice until you fix the heartbeat. Its alert tells you when this happens.
- If `appointments.designinnsaeit.com` itself is down, the Worker cannot help; its route calls just fail.
