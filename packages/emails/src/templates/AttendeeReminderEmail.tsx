import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

// Upcoming-booking reminder sent to the attendee ahead of the call. Reuses the
// scheduled-email body (What/When/Who/Where + intake responses) with a reminder
// title/subtitle driven by how far out the booking is.
export const AttendeeReminderEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    reminderLabel?: "24h" | "1h";
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const title = props.reminderLabel === "1h" ? "reminder_1h_title" : "reminder_24h_title";

  return (
    <BaseScheduledEmail
      locale={props.attendee.language.locale}
      timeZone={props.attendee.timeZone}
      t={props.attendee.language.translate}
      timeFormat={props.attendee?.timeFormat}
      headerType="calendarCircle"
      title={title}
      subtitle={<>{props.attendee.language.translate("reminder_email_subtitle")}</>}
      {...props}
    />
  );
};
