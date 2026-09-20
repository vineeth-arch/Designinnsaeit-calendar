import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import RawHtml from "../components/RawHtml";
import { renderReminder1h } from "../ticket-v6/templates";

// v6 booking-email design. All markup lives in ticket-v6; this only adapts props for renderEmail.
export const AttendeeReminder1hV6Email = (props: {
  calEvent: CalendarEvent;
  attendee: Person;
  now?: number;
}) => (
  <RawHtml
    html={
      renderReminder1h({
        calEvent: props.calEvent,
        recipient: props.attendee,
        timeZone: props.attendee.timeZone,
        timeFormat: props.attendee.timeFormat,
        now: props.now,
      }).html
    }
  />
);
