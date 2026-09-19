import type { CalendarEvent } from "@calcom/types/Calendar";
import { TicketEmail } from "../components/TicketEmail";

export const OrganizerTicketNewBookingEmail = (props: { calEvent: CalendarEvent }) => {
  const organizer = props.calEvent.organizer;
  return (
    <TicketEmail
      calEvent={props.calEvent}
      recipient={organizer}
      variant="newBooking"
      t={organizer.language.translate}
      timeZone={organizer.timeZone}
      locale={organizer.language.locale}
      timeFormat={organizer.timeFormat}
      isOrganizer
    />
  );
};
