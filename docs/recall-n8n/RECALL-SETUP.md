# Recall.ai notetaker via n8n

A Recall.ai bot joins each booked Google Meet, and the transcript lands in the Handshake desk inbox.
Nothing in cal.diy calls Recall.ai; the whole flow runs in n8n Cloud (`https://osaaajii.app.n8n.cloud`).

```
Cal.diy webhook ──► n8n "Cal.diy booking to Recall.ai bot" ──► Recall.ai creates / deletes a bot
                          ▲ daily 06:00 IST check repairs missed webhooks
Recall.ai bot.done ──► n8n "Recall.ai transcript to Handshake" ──► Handshake POST /api/recordings ──► desk inbox
Any failure ──► n8n "Recall.ai automation error alert" ──► your alert URL
```

The workflows use only plain Code and HTTP nodes: no Data Tables, no n8n Variables, no `require('crypto')`,
so they work on any n8n plan. The booking-to-bot map lives in the workflow's static data.

## 1. Import

In n8n: **Workflows → Import from file**, once for each of:

- `cal-to-recall.json`
- `recall-transcript.json`
- `recall-error-alert.json`

Regenerate them any time with `node build-workflows.mjs` (the JSON files are generated).

## 2. Create three credentials (n8n → Credentials → Header Auth)

| Name (exact) | Header name | Header value |
|---|---|---|
| `Recall API` | `Authorization` | `Token <your Recall.ai API key>` |
| `Handshake Worker` | `Authorization` | `Bearer <WORKER_TOKEN from Handshake>` |
| `Cal API` | `Authorization` | `Bearer <CAL_API_KEY>` |

Open each HTTP node that shows a red credential warning and pick the matching credential. The keys stay in
n8n and never enter this repo.

## 3. Edit each workflow's `Config` node

- **Cal.diy booking to Recall.ai bot:** `calWebhookSecret` (a new random secret, also set on the Cal webhook
  below), `recallBaseUrl` (your region URL from the Recall.ai dashboard, for example
  `https://us-east-1.recall.ai`), `botName`, `calApiBase`.
- **Recall.ai transcript to Handshake:** `recallWebhookSecret` (the workspace signing secret, `whsec_...`, see
  step 5), `recallBaseUrl` (same as above), `handshakeRecordingsUrl`. `recallWebhookToken` is only a fallback
  used while `recallWebhookSecret` is empty.
- **Recall.ai automation error alert:** `alertUrl`, for example your ntfy topic URL.

Also change the two webhook paths from `...-CHANGE-ME` to long random strings.

## 4. Error workflow and activation

1. In the two main workflows: **Settings → Error workflow** = *Recall.ai automation error alert*.
2. Activate all three workflows (the toggle at the top). Static data and the daily schedule only work on
   active workflows, not on test runs.
3. Copy the two **Production** webhook URLs (not the Test URLs).

## 5. Register the webhooks

**cal.diy:** Settings → Developer → Webhooks → New.
- Subscriber URL = the production URL of *Cal.diy booking to Recall.ai bot*.
- Triggers: Booking created, Booking rescheduled, Booking cancelled.
- Secret = the `calWebhookSecret` from step 3.
- Leave the existing Handshake webhook alone.

**Recall.ai dashboard → Webhooks → Add endpoint:**
- URL = the production URL of *Recall.ai transcript to Handshake*.
- Event: `bot.done`.
- Signing secret: Recall.ai dashboard → Developers → API Keys & Secrets → Create Workspace Secret. Paste the
  `whsec_...` value into `recallWebhookSecret` in the workflow's Config node. Requests are then verified by
  signature (`webhook-id`, `webhook-timestamp`, `webhook-signature`; older workspaces send `svix-*` headers)
  with a 5-minute timestamp window.
- Without a signing secret, leave `recallWebhookSecret` empty, set `recallWebhookToken` and add
  `?token=<recallWebhookToken>` to the endpoint URL. That only proves the caller knew the URL, so prefer the secret.

## 6. Test

1. **Signed sample.** Edit `sample-cal-payload.json` (a Meet link you own, a `startTime` 20+ minutes from
   now), then post it with a valid signature:

   ```bash
   SECRET='<calWebhookSecret>'
   SIG=$(openssl dgst -sha256 -hmac "$SECRET" -hex < sample-cal-payload.json | awk '{print $NF}')
   curl -i -X POST '<production webhook url>' -H 'content-type: application/json' \
     -H "x-cal-signature-256: $SIG" --data-binary @sample-cal-payload.json
   ```

   Expect `200`, an execution in n8n that creates a bot, and the bot in the Recall.ai dashboard.
   Send a `BOOKING_CANCELLED` copy (same `uid`) and the bot is deleted.
2. **Real booking.** Book the `15min` event 15+ minutes ahead. Open the Meet at start time, admit the bot,
   talk for a minute, end the call.
3. **Transcript.** A few minutes later a `recall:<botId>` item appears in the Handshake desk inbox.
4. **Reschedule.** Move a booking: the old bot disappears and a new one is created.
5. **Failure alert.** Temporarily break the `Recall API` credential; the alert URL gets a message.

## Known limits

- Static data is per workflow and only persists for active executions. If the map is ever lost, the daily
  check recreates missing bots for upcoming accepted bookings and skips ones that already ended.
  A bot that already exists in Recall.ai but was forgotten from the map would be duplicated, so do not clear
  static data casually.
- A bot for a booking made less than 10 minutes before the start joins immediately and may wait in the lobby.
  Recall.ai only guarantees a scheduled join when `join_at` is 10+ minutes ahead.
- Google Meet asks the host to admit the bot. The bot's name announces the recording; a consent line in the
  booking confirmation is recommended (your call on wording).
- If the transcript is not ready when `bot.done` arrives, the transcript workflow errors and alerts. Re-run
  that execution from the n8n Executions list.
- Recall.ai bills per recorded hour plus transcription. See the Recall.ai pricing page.
- These workflows were generated and syntax-checked locally but not imported into n8n by the author. If a node
  shows an upgrade or parameter warning on import, accept the upgrade and check the node's fields.
