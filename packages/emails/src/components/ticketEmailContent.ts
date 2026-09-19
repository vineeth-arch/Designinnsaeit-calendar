import dayjs from "@calcom/dayjs";
import {
  getBookingUrl,
  getCancelLink,
  getLocation,
  getRescheduleLink,
  getVideoCallUrlFromCalEvent,
} from "@calcom/lib/CalEventParser";
import { formatToLocalizedTimezone } from "@calcom/lib/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";

export type TicketEmailVariant = "confirmation" | "newBooking" | "reminder24h" | "reminder1h" | "followUp";

export type TicketAction = { label: string; href: string };

export type TicketEmailContent = {
  label: string;
  eventName: string;
  dateText: string;
  timeText: string;
  durationText: string | null;
  timezoneText: string;
  startsInText: string | null;
  joinUrl: string | null;
  locationText: string | null;
  withText: string | null;
  actions: TicketAction[];
  preheader: string;
  /** Absolute start instant; consumed by the live countdown image. */
  countdownTarget: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Copied from apps/web/modules/bookings/lib/formatCountdown.ts: packages must not import from apps.
export function getDurationMinutes(start: string | Date, end: string | Date): number {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / MINUTE);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

export function formatDuration(minutes: number, t: TFunction): string | null {
  if (minutes <= 0) return null;
  if (minutes < 60) return t("multiple_duration_mins", { count: minutes });
  if (minutes % 60 === 0) return t("ticket_duration_h", { hours: minutes / 60 });
  return t("ticket_duration_hm", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

export function formatStartsIn(msUntilStart: number, t: TFunction): string | null {
  if (!Number.isFinite(msUntilStart)) return null;
  if (msUntilStart <= MINUTE) return t("ticket_email_starting_now");
  if (msUntilStart >= DAY) return t("ticket_email_starts_in_days", { count: Math.round(msUntilStart / DAY) });
  if (msUntilStart >= HOUR)
    return t("ticket_email_starts_in_hours", { count: Math.round(msUntilStart / HOUR) });
  return t("ticket_email_starts_in_minutes", { count: Math.round(msUntilStart / MINUTE) });
}

export function getJoinUrl(calEvent: CalendarEvent): string | null {
  const url = getVideoCallUrlFromCalEvent(calEvent);
  return /^https?:\/\//i.test(url) ? url : null;
}

// Mirrors ManageLink's visibility rules so the ticket never offers an action the old email hid.
function getManageActions(calEvent: CalendarEvent, recipient: Person, t: TFunction) {
  const isOriginalAttendee = recipient.email === calEvent.attendees[0]?.email;
  const isOrganizer = calEvent.organizer.email === recipient.email;
  const isTeamMember = calEvent.team?.members.some((member) => recipient.email === member.email);
  if (!isOriginalAttendee && !isOrganizer && !isTeamMember)
    return { reschedule: null, cancel: null, view: null };

  const cancelLink = getCancelLink(
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
  );
  const rescheduleLink = getRescheduleLink({ calEvent, attendee: recipient });
  const bookingLink = getBookingUrl({
    platformClientId: calEvent.platformClientId,
    platformBookingUrl: calEvent.platformBookingUrl,
    bookerUrl: calEvent.bookerUrl,
    type: calEvent.type,
    uid: calEvent.uid,
    organizer: calEvent.organizer,
    attendeeSeatId: calEvent.attendeeSeatId,
  });

  return {
    reschedule:
      rescheduleLink && !calEvent.disableRescheduling && !calEvent.recurringEvent
        ? { label: t("reschedule"), href: rescheduleLink }
        : null,
    cancel: cancelLink && !calEvent.disableCancelling ? { label: t("cancel"), href: cancelLink } : null,
    view: bookingLink ? { label: t("ticket_email_view_booking"), href: bookingLink } : null,
  };
}

export function buildTicketEmailContent({
  calEvent,
  recipient,
  variant,
  t,
  timeZone,
  locale,
  timeFormat,
  now = Date.now(),
}: {
  calEvent: CalendarEvent;
  recipient: Person;
  variant: TicketEmailVariant;
  t: TFunction;
  timeZone: string;
  locale: string;
  timeFormat?: TimeFormat;
  now?: number;
}): TicketEmailContent {
  const start = dayjs(calEvent.startTime).tz(timeZone);
  const timeText = start.format(timeFormat ?? TimeFormat.TWELVE_HOUR);
  const dateText = `${t(start.format("dddd").toLowerCase())}, ${start.format("D")} ${t(
    start.format("MMMM").toLowerCase()
  )} ${start.format("YYYY")}`;
  const timezoneText = formatToLocalizedTimezone(start.toDate(), locale, timeZone) ?? timeZone;
  const startsInText = formatStartsIn(new Date(calEvent.startTime).getTime() - now, t);
  const joinUrl = getJoinUrl(calEvent);
  const location = getLocation(calEvent);
  const locationText = !joinUrl && location ? location : null;
  const { reschedule, cancel, view } = getManageActions(calEvent, recipient, t);
  const compact = (list: (TicketAction | null)[]) => list.filter((a): a is TicketAction => !!a);
  const attendee = calEvent.attendees[0];

  const base = {
    eventName: calEvent.title,
    dateText,
    timeText,
    durationText: formatDuration(getDurationMinutes(calEvent.startTime, calEvent.endTime), t),
    timezoneText,
    joinUrl,
    locationText,
    countdownTarget: new Date(calEvent.startTime).toISOString(),
    preheader: [dateText, `${timeText} ${timezoneText}`, joinUrl ? t("join_meeting") : null]
      .filter(Boolean)
      .join(" · "),
  };

  switch (variant) {
    case "confirmation":
      return {
        ...base,
        label: t("ticket_email_label_booked"),
        startsInText,
        withText: calEvent.organizer.name,
        actions: compact([view, reschedule, cancel]),
      };
    case "newBooking":
      return {
        ...base,
        label: t("ticket_email_label_new_booking"),
        startsInText,
        withText: attendee ? `${attendee.name} (${attendee.email})` : null,
        actions: compact([view, cancel]),
      };
    case "reminder24h":
      return {
        ...base,
        label: t("ticket_email_label_tomorrow"),
        startsInText,
        withText: calEvent.organizer.name,
        actions: compact([view, reschedule, cancel]),
      };
    case "reminder1h":
      return {
        ...base,
        label: t("ticket_email_label_in_1h"),
        startsInText,
        withText: calEvent.organizer.name,
        actions: compact([reschedule, cancel]),
      };
    case "followUp":
      return {
        ...base,
        label: t("ticket_email_label_thanks"),
        startsInText: t("ticket_email_thanks"),
        joinUrl: null,
        locationText: null,
        withText: calEvent.organizer.name,
        actions: [],
      };
  }
}
