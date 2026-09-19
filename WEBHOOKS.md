# Webhooks: booking events to Handshake

This is the contract for **this deployment** (`appointments.designinnsaeit.com`): what cal.diy sends, where, how it is signed, and what the receiver (Handshake) does with it. The generic upstream reference in `agents/skills/calcom-api/references/webhooks.md` is partly wrong for this fork (it shows a `sha256=` signature prefix and trigger names that do not exist).

Last verified: 2026-09-19 against `BookingPayloadBuilder.ts` (payload version `2021-10-20`) and the live v2 API; the secret and no-show gaps re-checked 2026-09-20 against Handshake `main`.

## Destination

| | |
|---|---|
| Subscriber URL | `https://handshake.designinnsaeit.com/api/cal/webhook` (Handshake: `app/api/cal/webhook/route.ts`) |
| Method | `POST`, `Content-Type: application/json` |
| Registered via | v2 API `POST /webhooks` (also visible at Settings > Developer > Webhooks) |
| Webhook id | `0636e832-a49f-455a-bc87-275a08f7cd25` |

The webhook is managed through the v2 API. That API is a separate Railway service with no custom domain, so its base URL is `https://designinnsaeit-calendar-production.up.railway.app/api/v2` (not `appointments.designinnsaeit.com`).

## Authentication

Every delivery carries `x-cal-signature-256`: the **bare lowercase hex** HMAC-SHA256 of the **raw request body**, keyed with the webhook secret. There is no `sha256=` prefix.

The same secret must be configured on both sides:

| Side | Where |
|---|---|
| cal.diy | the webhook's `secret` (set when it was registered) |
| Handshake | env var `CAL_WEBHOOK_SECRET` |

Handshake answers `503` if `CAL_WEBHOOK_SECRET` is unset, `401` if the signature does not match, and `200` for everything after that (it never returns non-2xx once the signature is valid, to avoid retry storms).

Verify like this (Node):

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function signatureMatches(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const given = Buffer.from(header, "hex");
  const expected = createHmac("sha256", secret).update(raw).digest();
  return given.length === expected.length && timingSafeEqual(expected, given);
}
```

## Registered triggers

| Trigger | Sent when | What Handshake does today |
|---|---|---|
| `BOOKING_CREATED` | a booking is created | upserts a `booking` row keyed on `payload.uid`; links or creates the person; saves booking-form answers as a message |
| `BOOKING_RESCHEDULED` | a booking is rescheduled (new `uid`) | upserts the new booking, marks the old one (`payload.rescheduleUid`) cancelled, increments the reschedule count |
| `BOOKING_CANCELLED` | a booking is cancelled | sets the booking status to `cancelled` |
| `BOOKING_NO_SHOW_UPDATED` | a host marks an attendee no-show | sets `outcome = no_show` (reads `payload.uid ?? payload.bookingUid`) |
| `BOOKING_PAID` | a payment for a booking succeeds | ignored (accepted, no effect) |

Other cal.diy triggers (`BOOKING_REQUESTED`, `BOOKING_REJECTED`, `BOOKING_PAYMENT_INITIATED`, `MEETING_ENDED`, ...) exist but are not registered.

## Envelope

```json
{
  "triggerEvent": "BOOKING_CREATED",
  "createdAt": "2026-09-19T05:00:00.000Z",
  "payload": { }
}
```

## `payload` for booking triggers

Built by `packages/features/webhooks/lib/factory/versioned/v2021-10-20/BookingPayloadBuilder.ts`.

| Field | Notes |
|---|---|
| `uid` | booking uid; the key Handshake uses (`calUid`) |
| `bookingId` | numeric booking id |
| `title`, `eventTitle`, `eventDescription` | booking title and event type title/description |
| `type` | event type slug (e.g. `discovery-45`); Handshake stores it as `eventTypeSlug` |
| `length` | event length in minutes |
| `startTime`, `endTime` | ISO 8601 UTC |
| `status` | `ACCEPTED` for created, rescheduled and paid; `CANCELLED` / `REJECTED` for those triggers |
| `organizer` | `{ name, email, timeZone, language, utcOffset, usernameInOrg }` |
| `attendees[]` | `{ name, email, timeZone, language, phoneNumber?, utcOffset, firstName, lastName }` |
| `location` | conference URL or location text |
| `responses` | booking-form answers, see below |
| `userFieldsResponses` | the subset of `responses` for custom (user-defined) fields |
| `additionalNotes`, `description` | free-text notes from the booker |
| `metadata` | booking metadata; Handshake reads `hs` (booking-link token), `person` (person id) and `source` from it |
| `price`, `currency`, `requiresConfirmation` | from the event type |
| `smsReminderNumber` | booker's SMS number if collected |
| `customInputs`, `hashedLink`, `conferenceData`, `destinationCalendar`, `assignmentReason` | present, unused by Handshake |

### `responses` (booking-form answers)

One entry per booking-form field, keyed by the field's slug:

```json
"responses": {
  "name":  { "label": "your_name",     "value": "Jane Booker" },
  "email": { "label": "email_address", "value": "jane@example.com" },
  "notes": { "label": "notes",         "value": "Looking to rebrand a tea range" }
}
```

`label` is the question text and `value` is the answer (string, array, or object depending on the field type). `isHidden` may also be present.

**Custom intake fields.** As of 2026-09-19 no event type has any custom booking field (checked through the v2 API on all 13 event types), so only the default fields (`name`, `email`, `location`, `notes`, `guests`, `rescheduleReason`, plus `attendeePhoneNumber` when enabled) are sent. If you add questions such as brand, website or country (Event type > Advanced > Booking questions), each one appears as `responses.<slug>` with its label, and Handshake stores every non-system answer as a "Booking answers" message for that person (`collectAnswers` in `lib/cal/upsert.ts`). The earlier note in `DEFERRED-BUILD-LOG.md` that brand/website/country "already ship" does not match the live configuration.

## Trigger-specific fields

`BOOKING_RESCHEDULED` adds `rescheduleId`, `rescheduleUid` (the old booking's uid), `rescheduleStartTime`, `rescheduleEndTime` and `rescheduledBy`.

`BOOKING_PAID` adds `paymentId` (the internal Payment row id) and, in `metadata`, `{ identifier: "cal.com", bookingId, eventTypeId, bookerEmail, eventTitle, externalId }` where `externalId` is the payment provider's id (a Razorpay Payment Link id such as `plink_...`). There is **no boolean `paid` field**: payment is signalled by this trigger.

`BOOKING_NO_SHOW_UPDATED` has a different, smaller payload:

```json
{
  "triggerEvent": "BOOKING_NO_SHOW_UPDATED",
  "createdAt": "...",
  "payload": {
    "bookingUid": "...",
    "bookingId": 123,
    "attendees": [{ "email": "jane@example.com", "noShow": true }],
    "message": "..."
  }
}
```

## Example: `BOOKING_CREATED` (abridged)

```json
{
  "triggerEvent": "BOOKING_CREATED",
  "createdAt": "2026-09-19T05:00:00.000Z",
  "payload": {
    "uid": "abc123",
    "bookingId": 57,
    "title": "Brand Discovery Session between Vineeth Nair and Jane Booker",
    "eventTitle": "Brand Discovery Session",
    "type": "discovery-45",
    "length": 45,
    "startTime": "2026-09-25T09:00:00.000Z",
    "endTime": "2026-09-25T09:45:00.000Z",
    "status": "ACCEPTED",
    "organizer": { "name": "Vineeth Nair", "email": "vineeth@designinnsaeit.com", "timeZone": "Asia/Kolkata", "utcOffset": 330 },
    "attendees": [
      { "name": "Jane Booker", "email": "jane@example.com", "timeZone": "Europe/London", "utcOffset": 60, "firstName": "Jane", "lastName": "Booker" }
    ],
    "responses": {
      "name": { "label": "your_name", "value": "Jane Booker" },
      "email": { "label": "email_address", "value": "jane@example.com" },
      "notes": { "label": "notes", "value": "Looking to rebrand a tea range" }
    },
    "metadata": {},
    "price": 0,
    "currency": "usd"
  }
}
```

This example is composed from the builder and the live event-type configuration, not captured from a real delivery. Replace it with a captured payload after the first live booking.

## Delivery and idempotency

- Handshake upserts on `uid`, so a repeated `BOOKING_CREATED` or `BOOKING_RESCHEDULED` does not duplicate a booking or its reschedule count.
- Answers are saved once per booking (a fixed message hash), so a retry does not stack copies.
- Handshake logs and swallows processing errors and always returns `200` after the signature check, so a bad payload is not retried. The full raw body is stored on the booking (`payload`) so a misparse can be recovered by hand.

## Known gaps

1. ~~No-shows are dropped.~~ **Fixed on the Handshake side** (its webhook route and `upsertBookingFromCal` read `payload.uid ?? payload.bookingUid`).
2. **`BOOKING_PAID` is ignored** by Handshake, so payment status is not recorded. Payments also cannot complete end to end in this fork until the `/payment/[uid]` page loader is restored (see `DEFERRED-BUILD-LOG.md`).
3. ~~Secret alignment.~~ **Verified 2026-09-20:** a correctly signed test delivery to Handshake returns `200` and a bad signature returns `401`, so both sides use the same secret.

## Managing the webhook

```bash
# list
curl -s -H "Authorization: Bearer $CAL_API_KEY" "$CAL_API_URL/webhooks"

# change the secret (never paste it into chat; export it first)
curl -s -X PATCH -H "Authorization: Bearer $CAL_API_KEY" -H "Content-Type: application/json" \
  "$CAL_API_URL/webhooks/0636e832-a49f-455a-bc87-275a08f7cd25" \
  -d "$(jq -n --arg s "$HANDSHAKE_CAL_WEBHOOK_SECRET" '{secret:$s}')"
```

## Related setup

- Cron scheduling for the time-based triggers (`MEETING_ENDED` and friends only fire when `/api/cron/webhookTriggers` is called every minute): `deploy/cron-watchdog/README.md`.
- A second, separate webhook can feed the Recall.ai notetaker workflows in n8n: `docs/recall-n8n/RECALL-SETUP.md`. The Handshake webhook above stays as it is.
