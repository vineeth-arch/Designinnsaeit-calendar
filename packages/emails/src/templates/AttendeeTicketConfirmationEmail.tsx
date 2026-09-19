import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { TicketEmail } from "../components/TicketEmail";

export const AttendeeTicketConfirmationEmail = (props: { calEvent: CalendarEvent; attendee: Person }) => (
  <TicketEmail
    calEvent={props.calEvent}
    recipient={props.attendee}
    variant="confirmation"
    t={props.attendee.language.translate}
    timeZone={props.attendee.timeZone}
    locale={props.attendee.language.locale}
    timeFormat={props.attendee.timeFormat}
  />
);
