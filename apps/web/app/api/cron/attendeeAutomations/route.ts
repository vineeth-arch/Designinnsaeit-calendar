import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { sendAttendeeFollowUpEmail, sendAttendeeReminderEmail } from "@calcom/emails/email-manager";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { getTranslation } from "@calcom/i18n/server";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

// Attendee-side automations that the (removed) Workflows engine used to cover.
// A single cron pass sends: a 24h reminder, a 1h reminder, and a post-call
// follow-up. De-dup is windowed — each job matches a non-overlapping 15-minute
// slice keyed to a 15-minute cron cadence, so a booking is picked up exactly
// once per job without a WorkflowReminder table.
type ReminderJob =
  | { kind: "reminder"; label: "24h" | "1h"; field: "startTime"; fromMin: number; toMin: number }
  | { kind: "followup"; field: "endTime"; fromMin: number; toMin: number };

const JOBS: ReminderJob[] = [
  { kind: "reminder", label: "24h", field: "startTime", fromMin: 24 * 60, toMin: 24 * 60 + 15 },
  { kind: "reminder", label: "1h", field: "startTime", fromMin: 60, toMin: 75 },
  // ended between 60 and 75 minutes ago
  { kind: "followup", field: "endTime", fromMin: -75, toMin: -60 },
];

async function postHandler(request: NextRequest) {
  // Accept the key as a raw Authorization header, a "Bearer <key>" header, or an ?apiKey= query param.
  const authHeader = request.headers.get("authorization");
  const headerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  const apiKey = headerKey || request.nextUrl.searchParams.get("apiKey");

  if (!process.env.CRON_API_KEY || process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let emailsSent = 0;

  for (const job of JOBS) {
    const windowStart = dayjs().add(job.fromMin, "minutes").toDate();
    const windowEnd = dayjs().add(job.toMin, "minutes").toDate();

    const timeFilter = { gte: windowStart, lt: windowEnd };
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.ACCEPTED,
        ...(job.field === "startTime" ? { startTime: timeFilter } : { endTime: timeFilter }),
      },
      select: {
        ...bookingMinimalSelect,
        location: true,
        responses: true,
        uid: true,
        destinationCalendar: true,
        user: {
          select: { id: true, email: true, name: true, username: true, locale: true, timeZone: true },
        },
        eventType: {
          select: { recurringEvent: true, bookingFields: true, title: true },
        },
      },
    });

    for (const booking of bookings) {
      const { user } = booking;
      const organizerName = user?.name || user?.username;
      if (!user || !organizerName || !user.timeZone) continue;

      const tOrganizer = await getTranslation(user.locale ?? "en", "common");

      const attendeesList = await Promise.all(
        booking.attendees.map(async (attendee) => ({
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        }))
      );

      const evt: CalendarEvent = {
        type: booking.eventType?.title || booking.title,
        title: booking.title,
        description: booking.description || undefined,
        customInputs: isPrismaObjOrUndefined(booking.customInputs),
        ...getCalEventResponses({
          bookingFields: booking.eventType?.bookingFields ?? null,
          booking,
        }),
        location: booking.location ?? "",
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        organizer: {
          id: user.id,
          email: booking.userPrimaryEmail ?? user.email,
          name: organizerName,
          timeZone: user.timeZone,
          language: { translate: tOrganizer, locale: user.locale ?? "en" },
        },
        attendees: attendeesList,
        uid: booking.uid,
        recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
      };

      for (const attendee of attendeesList) {
        if (job.kind === "reminder") {
          await sendAttendeeReminderEmail(evt, attendee, job.label);
        } else {
          await sendAttendeeFollowUpEmail(evt, attendee);
        }
        emailsSent++;
      }
    }
  }

  return NextResponse.json({ emailsSent });
}

export const POST = defaultResponderForAppDir(postHandler);
