"use server";

import { sendAttendeeSummaryEmail } from "@calcom/emails/email-manager";
import { renderSummary } from "@calcom/emails/src/ticket-v6/summary";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getTranslation } from "@calcom/i18n/server";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { summaryFieldsSchema } from "./summarySchema";

const requestSchema = z.object({ uid: z.string().min(1).max(64), fields: summaryFieldsSchema });

export type SummaryActionResult = { ok: true; html?: string } | { ok: false; error: string };

// Only the host of a booking may write or send its summary; the recipient is always that booking's first
// attendee (or the host, for a test), never an address typed into the form.
async function loadEvent(uid: string) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) return null;

  const booking = await prisma.booking.findFirst({
    where: { uid, userId, status: BookingStatus.ACCEPTED },
    select: {
      ...bookingMinimalSelect,
      location: true,
      responses: true,
      uid: true,
      user: {
        select: { id: true, email: true, name: true, username: true, locale: true, timeZone: true },
      },
      eventType: { select: { bookingFields: true, title: true } },
    },
  });
  const user = booking?.user;
  const first = booking?.attendees[0];
  const organizerName = user?.name || user?.username;
  if (!booking || !user || !first || !organizerName || !user.timeZone) return null;

  const attendee: Person = {
    name: first.name,
    email: first.email,
    timeZone: first.timeZone,
    language: {
      translate: await getTranslation(first.locale ?? "en", "common"),
      locale: first.locale ?? "en",
    },
  };
  const calEvent: CalendarEvent = {
    type: booking.eventType?.title || booking.title,
    title: booking.title,
    description: booking.description || undefined,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    ...getCalEventResponses({ bookingFields: booking.eventType?.bookingFields ?? null, booking }),
    location: booking.location ?? "",
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      id: user.id,
      email: booking.userPrimaryEmail ?? user.email,
      name: organizerName,
      timeZone: user.timeZone,
      language: {
        translate: await getTranslation(user.locale ?? "en", "common"),
        locale: user.locale ?? "en",
      },
    },
    attendees: [attendee],
    uid: booking.uid,
  };
  return { userId, userEmail: user.email, calEvent, attendee };
}

const parse = (input: unknown) => {
  const parsed = requestSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
};

export async function previewSummary(input: unknown): Promise<SummaryActionResult> {
  const data = parse(input);
  if (!data) return { ok: false, error: "invalid_fields" };
  const event = await loadEvent(data.uid);
  if (!event) return { ok: false, error: "not_found" };
  const { html } = renderSummary(
    { calEvent: event.calEvent, recipient: event.attendee, timeZone: event.attendee.timeZone },
    data.fields
  );
  return { ok: true, html };
}

export async function sendSummary(input: unknown, mode: "test" | "attendee"): Promise<SummaryActionResult> {
  const data = parse(input);
  if (!data) return { ok: false, error: "invalid_fields" };
  const event = await loadEvent(data.uid);
  if (!event) return { ok: false, error: "not_found" };

  try {
    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `summaryEmail:${event.userId}`,
    });
  } catch {
    return { ok: false, error: "rate_limited" };
  }

  const recipient = mode === "test" ? { ...event.attendee, email: event.userEmail } : event.attendee;
  await sendAttendeeSummaryEmail(event.calEvent, recipient, data.fields);
  return { ok: true };
}
