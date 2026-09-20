import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import RawHtml from "../components/RawHtml";
import { renderSummary, type SummaryFields } from "../ticket-v6/summary";

// v6 booking-email design. All markup lives in ticket-v6; this only adapts props for renderEmail.
export const AttendeeSummaryV6Email = (props: {
  calEvent: CalendarEvent;
  attendee: Person;
  fields: SummaryFields;
  now?: number;
}) => (
  <RawHtml
    html={
      renderSummary(
        {
          calEvent: props.calEvent,
          recipient: props.attendee,
          timeZone: props.attendee.timeZone,
          timeFormat: props.attendee.timeFormat,
          now: props.now,
        },
        props.fields
      ).html
    }
  />
);
