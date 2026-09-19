import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { TicketEmail } from "../components/TicketEmail";

// Post-call follow-up sent to the attendee after the event ends; no join or manage actions
// since the booking is already in the past.
export const AttendeeFollowUpEmail = (props: { calEvent: CalendarEvent; attendee: Person }) => (
  <TicketEmail
    calEvent={props.calEvent}
    recipient={props.attendee}
    variant="followUp"
    t={props.attendee.language.translate}
    timeZone={props.attendee.timeZone}
    locale={props.attendee.language.locale}
    timeFormat={props.attendee.timeFormat}
  />
);
