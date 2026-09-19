# Deferred Build Log — Design Innsaeit Booking System

Features that are well-defined and ready to build, but deliberately not built yet because their trigger condition hasn't been met. Each entry is self-contained — check "Trigger to build" before picking one up. Do not build ahead of the stated trigger; these are sequenced by when they earn their value, not by when they're technically possible.

Last updated: 2026-09-19

---

## Shipped 2026-09-19

- **OG image fix and branded share card**: PR #2 (`cb726cb`). Root cause: `next.config.ts` sets `images.unoptimized`, which disables `/_next/image`, while `SEO_IMG_OGIMG` sent every `og:image` through it, so link previews fetched a dead URL. `/api/social/og/image` is now served directly (verified live: 200, `image/png`) with a Design Innsaeit frame (studio logo, Bricolage title, host name, duration numeral) and `twitter:` card tags. WhatsApp caches previews per URL, so test with a fresh link (append `?ref=x`).
- **24 h reschedule notice** on `discovery-45` and `production-consult-45`: applied through the v2 API (`disableRescheduling.minutesBefore = 1440`), repeatable with `scripts/set-reschedule-notice.sh <minutes> <slug>...` (PR #3). Adjustable per event type.
- **Handshake webhook registered** for `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_NO_SHOW_UPDATED` and `BOOKING_PAID`, pointing at `https://handshake.designinnsaeit.com/api/cal/webhook`; the real contract is in `WEBHOOKS.md` (PR #6). Deliveries are rejected until the shared secret is aligned (see the Handshake entry).
- **Razorpay Payment Links app** merged, hardened and tested (PR #5). Inert until enabled; see the Razorpay entry for why it cannot take payments yet.
- **`users.brandLogoUrl` column** added, migration only (PR #4), as the first half of the per-user brand logo feature.
- **Railway `web` pre-deploy command** set to `npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma`. Railway does not expose pre-deploy logs, so it is unverified that it runs (see "Migrations do not auto-apply").

---

## [DONE 2026-09-19, secret alignment pending] Booking → Handshake webhook (was: n8n → Outreach Cockpit / Obsidian enrichment)

**Status 2026-09-19:** the webhook is registered (id `0636e832-a49f-455a-bc87-275a08f7cd25`) and documented in `WEBHOOKS.md`. Handshake already had a `CAL_WEBHOOK_SECRET` that does not match the secret this webhook was registered with (a signed probe got 401), so nothing is delivered until the two are aligned. Known gaps: Handshake drops no-shows (payload has `bookingUid`, its route needs `uid`), ignores `BOOKING_PAID`, and no event type currently defines the brand/website/country intake fields, so those are not sent. The n8n route below is superseded: Handshake now receives bookings directly.

**What it does:** cal.diy webhook fires on booking created/rescheduled/cancelled → n8n receives it → auto-creates/updates the prospect record in the Outreach Cockpit (Supabase) and/or the Obsidian 07-People note with the booking's intake answers (brand, category, country, signal).

**Why deferred:** n8n workflow side not yet built; webhook stub exists in the Outreach Cockpit settings but isn't wired end-to-end yet.

**Trigger to build:** as soon as the first real booking comes in — build reactively, don't build ahead of data.

**Effort:** Medium (n8n workflow + payload parsing).

**Implementation notes:** cal.diy webhook payload includes attendee info + custom intake field answers; n8n needs a node to map these to Outreach Cockpit's `prospects` table schema (brand_name, category, country, contact_email, signal) via Supabase REST/webhook, and/or to Obsidian via existing MCP/file-write pattern. This is the highest-leverage item — it connects booking to the whole acquisition system.

**Value:** Every booking auto-prepares you with context and can trigger the follow-up cadence.

---

## [PARTIAL 2026-09-19] Paid event types (Strategy Intensive): Razorpay app merged, payments not yet possible (was: Stripe deposits)

**Status 2026-09-19:** the Razorpay Payment Links app is merged, hardened and tested (PR #5), but **no payment app can complete a payment in this fork yet**: `apps/web/app/(use-page-wrapper)/payment/[uid]/page.tsx` is a hard-coded stub (empty payment, `appId: null`), so a booker sent to `/payment/[uid]` sees a blank page. Do not enable a price on `strategy-intensive-90` until that page loader is restored (see "Restore the payment page loader"). `strategy-intensive-90` has no payment configured today. Refunds are manual (`refund()` logs a warning and returns null).

**When the loader is restored, to switch Razorpay on:** set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` on the Railway `web` service; install the app; enable it on the event type with the price in paise (9,000 INR = `900000`); add the Razorpay dashboard webhook `https://appointments.designinnsaeit.com/api/integrations/razorpay/webhook` for `payment_link.paid` with the same secret as `RAZORPAY_WEBHOOK_SECRET`; make sure no other payment app is enabled on that event type; test with a `rzp_test_` key first. The price cannot be set through the v2 API (`metadata.apps` is not an input), only the UI.

Original entry (Stripe), kept for context:

**What it does:** Require payment (or a card hold) at booking time for `strategy-intensive-90`, so the slot is only confirmed once paid.

**Why deferred:** No Stripe account/keys wired yet; the v2 API server config has `STRIPE_API_KEY=sk_test_dummy` placeholder only.

**Trigger to build:** before the first Strategy Intensive is actively promoted/booked.

**Effort:** Medium (Stripe account setup + cal.diy payment integration, which is natively supported).

**Implementation notes:** cal.diy/cal.com supports Stripe payments on event types natively — replace the dummy Stripe keys on the v2 API server with real ones, enable "requires payment" on the event type, set the price.

**Value:** Eliminates no-shows on the highest-value call type; filters for serious buyers; the industry data is consistent that payment at booking is the single best no-show deterrent.

---

## [BLOCKED] Post-call automated follow-up email

**What it does:** "After event ends" workflow → auto-drafted (Claude) follow-up email with next-step/proposal link, review-gated before send.

**Why deferred:** Depends on the Outreach Cockpit's follow-up engine (cadence system) being live first, so this can plug into the same drafting pipeline instead of being a one-off.

**Update 2026-09-19:** the `MEETING_ENDED` trigger can be added to the same Handshake webhook (one API call) when the draft-followup endpoint exists.

**Trigger to build:** once the Outreach Cockpit follow-up engine (`/api/draft-followup`) is live.

**Effort:** Medium.

**Implementation notes:** cal.diy "after event ends" trigger → webhook → n8n → calls the Cockpit's draft-followup endpoint → surfaces in the founder's follow-up dashboard for review/send. Do NOT auto-send (hard rule).

**Value:** Converts discovery calls into proposals without relying on memory.

---

## [NOT STARTED] Category-adaptive intake forms

**What it does:** Different/deeper intake questions depending on prospect category (Wellness vs F&B vs Beauty) so every call starts with tailored context.

**Correction 2026-09-19:** the v2 API shows **no** custom booking fields on any of the 13 event types (only the defaults: name, email, location, notes, guests, rescheduleReason), so the brand/website/country intake below is not in the live configuration. Check Event type > Advanced > Booking questions; if they were lost, re-add them. Handshake already turns any non-system answer into a "Booking answers" message.

**Why deferred:** Base intake (brand/website/country) already ships; category-specific depth is a refinement, not a blocker.

**Trigger to build:** after ~10 real discovery calls, once patterns emerge on what's actually useful to ask each category upfront.

**Effort:** Medium (event-type-specific custom fields, possibly conditional logic).

**Implementation notes:** cal.diy custom booking fields support per-event-type config; could add category-specific fields to `discovery-45` if further segmented into per-category event types, or use conditional field logic if supported.

**Value:** Walk into every call already knowing what matters to that category of brand.

---

## [NOT STARTED] Lightweight routing front-door (category → event type)

**What it does:** A short "what kind of brand are you?" pre-screen that routes Wellness/F&B/Beauty prospects to the most relevant event type/questions.

**Why deferred:** cal.diy has Routing Forms stripped out (enterprise feature removed at the fork). Would need a custom lightweight page, not a native feature.

**Trigger to build:** once booking volume across categories is high enough that manual routing (prospect picks the right event type themselves) starts causing mismatches.

**Effort:** Medium (custom page + logic, since native Routing Forms aren't available in cal.diy).

**Implementation notes:** A simple custom landing page (could live on the marketing site or as a cal.diy custom page) asking 1-2 qualifying questions, then deep-linking to the right event type with pre-filled context.

**Value:** Better-qualified calls, less manual triage.

---

## [PARTIAL 2026-09-19] Reschedule + cancellation policy (notice window + fee)

**Status 2026-09-19:** the 24 h **reschedule** notice is set on `discovery-45` and `production-consult-45` (`disableRescheduling.minutesBefore = 1440`; change with `scripts/set-reschedule-notice.sh`). A **cancellation** notice window is not possible in this platform: `disableCancelling` is a boolean only (the v2 DTO comment says a minutes option "can be added later"), so only the reschedule half of the original ask exists. A late-cancellation fee is still deferred (it needs working payments, see the paid event types entry).

**What it does:** Set a minimum reschedule/cancellation notice window; optionally a fee for late cancellations on paid event types.

**Why deferred:** Native cal.diy config, but not yet configured — low priority until paid events exist.

**Trigger to build:** alongside Stripe deposits (#2) — natural pairing.

**Effort:** Quick win (native settings).

**Implementation notes:** cal.diy event-type settings already support minimum notice; cancellation fee requires Stripe (see #2).

**Value:** Protects prep time; standard professional practice.

---

## [NOT STARTED] Booking-source attribution / lightweight analytics

**What it does:** Track which outreach channel/source (cold email, LinkedIn, referral, region) actually produces booked calls, to learn where to focus effort.

**Why deferred:** cal.diy has native Insights stripped out (enterprise feature). No data yet to analyze — building analytics before there's booking volume produces empty charts.

**Trigger to build:** once there's a meaningful sample of bookings (e.g. 15-20+) across multiple sources.

**Effort:** Medium (custom, since native Insights isn't available in cal.diy — likely built as a simple view in the Outreach Cockpit using the `source` field already in its schema, joined against booking webhook data).

**Update 2026-09-19:** Handshake now receives every booking and stores the full raw payload plus `metadata.source`, so attribution can be derived from Handshake's `booking` table rather than a cockpit webhook.

**Implementation notes:** Don't rebuild cal.com's Insights dashboard; instead extend the Outreach Cockpit (which already has a `source` enum field) once #1 is wired, and derive attribution from cockpit data rather than cal.diy itself.

**Value:** Tells you which outreach channels/regions actually convert, so effort goes where it works.

---

## [NOT STARTED] Waitlist for full/popular slots

**What it does:** When an event type is fully booked, prospects can join a waitlist that's notified if a slot opens.

**Why deferred:** Not a native cal.diy feature; low priority at current (low) booking volume.

**Trigger to build:** once a specific event type is consistently fully booked out.

**Effort:** Larger (custom build, not native to cal.diy).

**Implementation notes:** Would need a new table + notification logic (email via Resend) triggered on cancellation.

**Value:** Recovers slots that would otherwise go unused; relevant only past a real demand ceiling.

---

## [NOT STARTED] Outbound "Schedule a call" deep link from Outreach Cockpit

**What it does:** From a prospect's card in the Outreach Cockpit, a button opens Google Calendar's event composer pre-filled with that prospect's email as a guest — for when the founder wants to initiate a call rather than wait for an inbound booking.

**Why deferred:** Belongs in the Outreach Cockpit build, not the cal.diy repo — logged here for cross-reference since it's part of the same "scheduling" system.

**Trigger to build:** alongside the Outreach Cockpit prospect detail panel.

**Effort:** Quick win (URL deep link, no backend).

**Implementation notes:** `https://calendar.google.com/calendar/render?action=TEMPLATE&add={prospect_email}&text={title}` — no API needed, just a formatted link.

**Value:** Completes the two-way scheduling story (inbound booking page + outbound calendar deep link) without rebuilding Google Calendar.

---

## [NOT STARTED] SMS reminders

**What it does:** Text message reminders alongside email, for attendees who prefer SMS.

**Why deferred:** Requires Twilio + Meta/carrier setup + per-message cost — same category of complexity as WhatsApp automation, previously deferred for the same reasons.

**Trigger to build:** only if email reminders prove insufficient (measured no-show rate stays high despite email + WhatsApp-deeplink reminders).

**Effort:** Larger (Twilio account, opt-in collection, cost).

**Implementation notes:** cal.diy workflows support SMS as an action type if Twilio is configured — same mechanism as the (also deferred) WhatsApp template messaging.

**Value:** Marginal over email+WhatsApp for most users; only worth it if data shows a real gap.

---

## [PARTIALLY SCOPED] WhatsApp template reminders (auto-send, via Business API)

**What it does:** Fully automated WhatsApp reminder messages (not the manual `wa.me` deeplink already built) via Meta's WhatsApp Business Cloud API.

**Why deferred:** Requires Meta Business verification, approved message templates, opt-in consent collection, and per-message cost. Manual `wa.me` share button already covers the "share on WhatsApp" need without any of this overhead.

**Trigger to build:** only once booking volume is high enough that manually tapping `wa.me` reminders becomes a real time cost (e.g. dozens of calls/week), AND a WhatsApp opt-in checkbox has been added to the booking flow for clean consent.

**Effort:** Larger (Meta approval process, opt-in UI, n8n WhatsApp Cloud API node).

**Implementation notes:** If built, prefer n8n's native WhatsApp Business Cloud node (direct to Meta API) over Twilio, to avoid the markup.

**Value:** Only worth it past a real volume threshold; premature today.

---

## [VERIFIED 2026-09-19, polish only] Timezone-prominence polish on confirmation/reminder copy

**Status 2026-09-19:** an audit confirmed explicit timezone labels already render in the emails (`WhenInfo.tsx`), the ticket-stub page (`bookings-single-view.tsx`) and the Booker (timezone selector). Only the copy/prominence polish below remains.

**What it does:** Ensure every confirmation email, reminder, and the booking page itself prominently displays the time in the PROSPECT's local timezone, not just the founder's.

**Why deferred:** cal.diy already auto-converts timezones under the hood; this is a copy/display polish item, not a functional gap — low priority relative to the above.

**Trigger to build:** opportunistic — bundle into any future email-template editing pass.

**Effort:** Quick win.

**Implementation notes:** Check the workflow email templates and the Booker's confirmation view render the attendee's tz explicitly and legibly (not just implied by the invite).

**Value:** Reduces international timezone confusion/back-and-forth — matters for GCC/EU/ANZ prospects specifically.

---

## [NOT STARTED] Restore the payment page loader (payments cannot complete)

**What it does:** Replace the hard-coded stub in `apps/web/app/(use-page-wrapper)/payment/[uid]/page.tsx` with a real server loader (payment by uid with its booking, event type and profile) so the booker sees the Pay button and the post-payment confirmation.

**Why deferred:** discovered 2026-09-19 while reviewing Razorpay. It affects every payment app in the fork, including the original Stripe plan.

**Trigger to build:** before any event type gets a price (first paid Strategy Intensive).

**Effort:** Medium (upstream cal.com has this loader; the props shape is already declared in the stub).

**Value:** Without it, paid event types strand bookers on a blank page.

---

## [NOT STARTED] Migrations do not auto-apply on Railway (`web` service)

**What it is:** the Railway `web` service overrides `startCommand` (`yarn workspace @calcom/web start`), so the Dockerfile's `scripts/start.sh` (which runs `prisma migrate deploy` and the app-store seed) never runs. The runtime log goes straight from "Starting Container" to Next.js. Any schema change must be applied to the database before the code that reads it deploys.

**What was done 2026-09-19:** a pre-deploy command (`npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma`) was set on the service, but Railway does not expose pre-deploy logs, so it is unverified. Schema changes should be shipped expand/contract: PR 1 adds the column only (idempotent SQL), confirm it exists in Railway Postgres, PR 2 ships the code that uses it. The `Designinnsaeit-calendar` service (v2 API) has the same exposure since its Prisma client comes from the same schema.

**Trigger to build:** before the next schema change. Consider a health check on a DB-backed page so a bad deploy never replaces the running one.

**Effort:** Quick win.

---

## [IN PROGRESS] Per-user brand logo on share cards, with a live preview in Settings > Appearance

**Status 2026-09-19:** code is written and validated locally against a throwaway Postgres (upload, storage in the personal `isBanner:true` Avatar slot with a fresh key per upload, serving, and the card with the uploaded logo and `darkBrandColor`; a same-origin guard makes the card ignore external logo URLs). It is on branch `feat/brand-logo-preview` (commit `45947de`) and is held until the `users.brandLogoUrl` column is confirmed in production. The Settings > Appearance upload field and preview are type-checked but have not been rendered in a browser (needs a logged-in session). The upload field downsizes without cropping (the avatar `ImageUploader` crops to a square, which would slice a wide wordmark). PNG/JPEG only; SVG is deliberately unsupported.

---

## [NOT STARTED] Handshake: align the secret, read `bookingUid`, handle `BOOKING_PAID`

**What it does:** (1) set Handshake's `CAL_WEBHOOK_SECRET` to the secret the cal.diy webhook was registered with (or patch the webhook with Handshake's existing one), (2) read `payload.bookingUid ?? payload.uid` so no-shows are not dropped, (3) record payment status from `BOOKING_PAID` (`payload.paymentId`, `payload.metadata.externalId`).

**Trigger to build:** now for (1); (2) and (3) when no-show tracking or paid bookings matter.

**Effort:** Quick win (Handshake repo, `app/api/cal/webhook/route.ts`, `lib/cal/upsert.ts`). Handshake's optional reconcile job also needs `CAL_API_KEY` and `CAL_API_BASE_URL`; the v2 API has no custom domain, so that base URL is the `*.up.railway.app` address unless a custom domain is added.

---

## [NOT STARTED] Automate Razorpay refunds

**What it does:** implement `refund()` in `packages/app-store/razorpay/lib/PaymentService.ts`: fetch the payment link's `payments[0].payment_id`, then `POST /payments/{id}/refund`. Today it logs a warning and returns null, so refunds after a cancel or reject are manual from the Razorpay dashboard.

**Trigger to build:** first refund request, once payments work.

**Effort:** Medium (real money movement, needs tests and a live test key).

---

## [NOT STARTED] Pull-request CI is broken; only push-triggered type-check works

**What it is:** the upstream `PR Update` workflow fails in its `Prepare` job on every PR in this fork (`yarn playwright install` runs before the node_modules state exists), so type-check, lint and unit tests never run on PRs and the required check is always red (there is no branch protection). The only working check is `Design Innsæit type-check (push)`, which runs on pushes to `main` and `claude/**`. Workaround used on 2026-09-19: push the branch to a temporary `claude/...` ref for a CI signal, then delete it.

**Trigger to build:** before more contributors or larger changes; fix the Prepare step or point the PR trigger at the working workflow.

**Effort:** Quick win.

---

## [NOT STARTED] Smaller follow-ups found 2026-09-19

- Booking pages emit `twitter:site` and `twitter:creator` as `@calcom` (from the default layout metadata); replace with the studio's handle.
- OG cards for team and dynamic-group pages use the studio logo only (no per-user logo).
- The app shell loads Bricolage through `next/font/google` while the OG card uses a local TTF; unify in a performance pass.
- Cancellation-notice windows are not supported by the platform (boolean `disableCancelling` only).
- Committing from a folder whose path contains spaces makes the pre-commit app-store generator stage unformatted files; use a space-free worktree path (`~/wt/<name>`).

---
