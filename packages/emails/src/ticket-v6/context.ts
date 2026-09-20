import dayjs from "@calcom/dayjs";
import {
  getBookingUrl,
  getCancelLink,
  getRescheduleLink,
  getVideoCallUrlFromCalEvent,
} from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { HOST } from "./copy";
import {
  bookingReference,
  brandShort,
  buildGoogleCalendarUrl,
  firstName,
  fromNow,
  hostLine,
  leafParts,
  pickIntake,
  rescheduleCutoff,
  timeRange,
  tzLabel,
  zoneAbbreviation as zoneAbbr,
} from "./derive";

// Everything a v6 template needs, computed once from a CalendarEvent. Pure: `now` is injected so tests
// and previews are deterministic.

export type V6Context = {
  recipient: Person;
  first: string;
  attendeeName: string;
  attendeeEmail: string;
  startIso: string;
  endIso: string;
  tz: string;
  hostTz: string;
  msUntilStart: number;
  durationMinutes: number;
  leaf: { month: string; day: string; weekday: string };
  time: { start: string; end: string };
  zoneLabel: string;
  zoneShort: string;
  hostLineText: string;
  fromNowText: string;
  joinUrl: string | null;
  joinDisplay: string | null;
  locationText: string | null;
  placePhrase: string;
  gcalUrl: string;
  rescheduleUrl: string | null;
  cancelUrl: string | null;
  bookingUrl: string | null;
  reference: string;
  cutoffText: string | null;
  intake: ReturnType<typeof pickIntake>;
  brandShort: string;
  host: { time12: string; weekdayTime: string; shortDayTime: string; zoneAbbr: string };
  attendeeCity: string;
  attendeeZoneAbbr: string;
  relativeDay: string;
  uid: string;
};

const cityOf = (timeZone: string) => (timeZone.split("/").pop() ?? timeZone).replace(/_/g, " ");

/** Meeting phrase for the intro line: ", on Google Meet". Empty when there is no link. */
export function placePhraseFor(joinUrl: string | null): string {
  if (!joinUrl) return "";
  const host = new URL(joinUrl).hostname;
  if (host.endsWith("meet.google.com")) return ", on Google Meet";
  if (host.endsWith("zoom.us")) return ", on Zoom";
  if (host.endsWith("teams.microsoft.com")) return ", on Microsoft Teams";
  return ", by video call";
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Same-day, next-day or weekday word in the recipient's zone. */
export function relativeDayWord(
  startIso: string,
  nowMs: number,
  timeZone: string,
  capitalise = false
): string {
  const start = dayjs(startIso).tz(timeZone).startOf("day");
  const today = dayjs(nowMs).tz(timeZone).startOf("day");
  const diff = start.diff(today, "day");
  const word = diff === 0 ? "today" : diff === 1 ? "tomorrow" : start.format("dddd");
  return capitalise ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

export function buildContext(args: {
  calEvent: CalendarEvent;
  recipient: Person;
  timeZone: string;
  now: number;
  timeFormat?: TimeFormat;
}): V6Context {
  const { calEvent, recipient, timeZone: tz, now } = args;
  const startIso = new Date(calEvent.startTime).toISOString();
  const endIso = new Date(calEvent.endTime).toISOString();
  const attendee = calEvent.attendees[0];
  const hostTz = calEvent.organizer.timeZone;
  const twentyFour = args.timeFormat === TimeFormat.TWENTY_FOUR_HOUR;
  const rawJoin = getVideoCallUrlFromCalEvent(calEvent);
  const joinUrl = /^https?:\/\//i.test(rawJoin) ? rawJoin : null;
  const msUntilStart = new Date(startIso).getTime() - now;
  const uid = calEvent.uid ?? "";
  const intake = pickIntake(calEvent.userFieldsResponses ?? calEvent.responses, calEvent.additionalNotes);

  const isOrganizer = recipient.email === calEvent.organizer.email;
  const isAttendee = calEvent.attendees.some((a) => a.email === recipient.email);
  const manage = isOrganizer || isAttendee;
  const rescheduleUrl =
    manage && !calEvent.disableRescheduling && !calEvent.recurringEvent
      ? getRescheduleLink({ calEvent, attendee: recipient }) || null
      : null;
  const cancelUrl =
    manage && !calEvent.disableCancelling
      ? getCancelLink(
          {
            platformClientId: calEvent.platformClientId,
            platformCancelUrl: calEvent.platformCancelUrl,
            type: calEvent.type,
            organizer: calEvent.organizer,
            recurringEvent: calEvent.recurringEvent,
            bookerUrl: calEvent.bookerUrl,
            uid: calEvent.uid,
            attendeeSeatId: calEvent.attendeeSeatId,
            team: calEvent.team,
          },
          recipient
        ) || null
      : null;
  const bookingUrl = manage
    ? getBookingUrl({
        platformClientId: calEvent.platformClientId,
        platformBookingUrl: calEvent.platformBookingUrl,
        bookerUrl: calEvent.bookerUrl,
        type: calEvent.type,
        uid: calEvent.uid,
        organizer: calEvent.organizer,
        attendeeSeatId: calEvent.attendeeSeatId,
      }) || null
    : null;

  const cutoff = rescheduleCutoff(startIso, calEvent.minimumRescheduleNotice, tz);
  const hostStart = dayjs(startIso).tz(hostTz);
  const zoneLabel = tzLabel(tz, startIso);

  return {
    recipient,
    first: firstName(attendee?.name),
    attendeeName: attendee?.name ?? "",
    attendeeEmail: attendee?.email ?? "",
    startIso,
    endIso,
    tz,
    hostTz,
    msUntilStart,
    durationMinutes: Math.max(
      0,
      Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)
    ),
    leaf: leafParts(startIso, tz),
    time: timeRange(startIso, endIso, tz, twentyFour),
    zoneLabel,
    zoneShort: zoneLabel.replace(/\s*\(.*\)$/, ""),
    hostLineText: hostLine(startIso, hostTz, HOST.city, twentyFour),
    fromNowText: fromNow(msUntilStart),
    joinUrl,
    joinDisplay: joinUrl ? stripProtocol(joinUrl) : null,
    locationText: joinUrl ? null : calEvent.location || null,
    placePhrase: placePhraseFor(joinUrl),
    gcalUrl: buildGoogleCalendarUrl({
      title: calEvent.title,
      startIso,
      endIso,
      location: joinUrl ?? calEvent.location,
    }),
    rescheduleUrl,
    cancelUrl,
    bookingUrl,
    reference: bookingReference(uid),
    cutoffText: cutoff ? cutoff.format("dddd D MMMM, h:mma") : null,
    intake,
    brandShort: brandShort(intake.brand),
    host: {
      time12: hostStart.format("h:mma"),
      weekdayTime: hostStart.format("dddd, h:mma"),
      shortDayTime: hostStart.format("ddd D MMM, h:mma"),
      zoneAbbr: zoneAbbr(hostTz, startIso),
    },
    attendeeCity: cityOf(tz),
    attendeeZoneAbbr: zoneAbbr(tz, startIso),
    relativeDay: relativeDayWord(startIso, now, tz),
    uid,
  };
}

export const BOOKING_HOST = (): string => new URL(WEBAPP_URL).host;
