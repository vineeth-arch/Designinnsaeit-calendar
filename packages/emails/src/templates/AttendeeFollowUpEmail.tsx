import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

// Post-call follow-up sent to the attendee after the event ends. Reuses the
// scheduled-email body with a "thanks / next steps" title; no manage CTA since
// the booking is already in the past.
export const AttendeeFollowUpEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  return (
    <BaseScheduledEmail
      locale={props.attendee.language.locale}
      timeZone={props.attendee.timeZone}
      t={props.attendee.language.translate}
      timeFormat={props.attendee?.timeFormat}
      headerType="checkCircle"
      title="follow_up_email_title"
      subtitle={<>{props.attendee.language.translate("follow_up_email_subtitle")}</>}
      callToAction={null}
      {...props}
    />
  );
};
