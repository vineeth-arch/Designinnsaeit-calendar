# Deferred Build Log — Design Innsaeit Booking System

Features that are well-defined and ready to build, but deliberately not built yet because their trigger condition hasn't been met. Each entry is self-contained — check "Trigger to build" before picking one up. Do not build ahead of the stated trigger; these are sequenced by when they earn their value, not by when they're technically possible.

Last updated: 2026-07-09

---

## [NOT STARTED] Booking → n8n → Outreach Cockpit / Obsidian enrichment

**What it does:** cal.diy webhook fires on booking created/rescheduled/cancelled → n8n receives it → auto-creates/updates the prospect record in the Outreach Cockpit (Supabase) and/or the Obsidian 07-People note with the booking's intake answers (brand, category, country, signal).

**Why deferred:** n8n workflow side not yet built; webhook stub exists in the Outreach Cockpit settings but isn't wired end-to-end yet.

**Trigger to build:** as soon as the first real booking comes in — build reactively, don't build ahead of data.

**Effort:** Medium (n8n workflow + payload parsing).

**Implementation notes:** cal.diy webhook payload includes attendee info + custom intake field answers; n8n needs a node to map these to Outreach Cockpit's `prospects` table schema (brand_name, category, country, contact_email, signal) via Supabase REST/webhook, and/or to Obsidian via existing MCP/file-write pattern. This is the highest-leverage item — it connects booking to the whole acquisition system.

**Value:** Every booking auto-prepares you with context and can trigger the follow-up cadence.

---

## [NOT STARTED] Stripe deposits on paid event types (Strategy Intensive)

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

**Trigger to build:** once the Outreach Cockpit follow-up engine (`/api/draft-followup`) is live.

**Effort:** Medium.

**Implementation notes:** cal.diy "after event ends" trigger → webhook → n8n → calls the Cockpit's draft-followup endpoint → surfaces in the founder's follow-up dashboard for review/send. Do NOT auto-send (hard rule).

**Value:** Converts discovery calls into proposals without relying on memory.

---

## [NOT STARTED] Category-adaptive intake forms

**What it does:** Different/deeper intake questions depending on prospect category (Wellness vs F&B vs Beauty) so every call starts with tailored context.

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

## [NOT STARTED] Reschedule + cancellation policy (notice window + fee)

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

## [NOT STARTED] Timezone-prominence polish on confirmation/reminder copy

**What it does:** Ensure every confirmation email, reminder, and the booking page itself prominently displays the time in the PROSPECT's local timezone, not just the founder's.

**Why deferred:** cal.diy already auto-converts timezones under the hood; this is a copy/display polish item, not a functional gap — low priority relative to the above.

**Trigger to build:** opportunistic — bundle into any future email-template editing pass.

**Effort:** Quick win.

**Implementation notes:** Check the workflow email templates and the Booker's confirmation view render the attendee's tz explicitly and legibly (not just implied by the invite).

**Value:** Reduces international timezone confusion/back-and-forth — matters for GCC/EU/ANZ prospects specifically.

---
