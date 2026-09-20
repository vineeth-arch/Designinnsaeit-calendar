import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import RawHtml from "../components/RawHtml";
import { renderHostAlert } from "../ticket-v6/templates";

// v6 booking-email design. All markup lives in ticket-v6; this only adapts props for renderEmail.
export const OrganizerNewBookingV6Email = (props: {
  calEvent: CalendarEvent;
  attendee: Person;
  now?: number;
}) => (
  <RawHtml
    html={
      renderHostAlert({
        calEvent: props.calEvent,
        recipient: props.calEvent.organizer,
        timeZone: props.calEvent.organizer.timeZone,
        timeFormat: props.calEvent.organizer.timeFormat,
        now: props.now,
      }).html
    }
  />
);
