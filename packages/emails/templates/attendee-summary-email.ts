import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import renderEmail from "../src/renderEmail";
import { renderSummary, type SummaryFields } from "../src/ticket-v6/summary";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

// Email 6: written by the host and sent on demand, never by cron.
export default class AttendeeSummaryEmail extends AttendeeScheduledEmail {
  fields: SummaryFields;

  constructor(calEvent: CalendarEvent, attendee: Person, fields: SummaryFields) {
    super(calEvent, attendee);
    this.name = "SEND_BOOKING_SUMMARY";
    this.fields = fields;
  }

  private render() {
    return renderSummary(
      {
        calEvent: this.calEvent,
        recipient: this.attendee,
        timeZone: this.attendee.timeZone,
        timeFormat: this.attendee.timeFormat,
      },
      this.fields
    );
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const { icalEvent: _icalEvent, ...payload } = await super.getNodeMailerPayload();
    return { ...payload, subject: this.render().subject };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeSummaryV6Email", { calEvent, attendee, fields: this.fields });
  }

  protected getTextBody(): string {
    const f = this.fields;
    return [
      `${this.attendee.name.split(" ")[0]}, here is what I heard.`,
      "",
      f.problem,
      "",
      `${f.fit.yes ? "Yes, this is work I am the right fit for." : "No, and here is who I would send you to."} ${f.fit.why}`,
      "",
      `${f.nextTitle}: ${f.nextBody}`,
      f.bookingLink,
    ].join("\n");
  }
}
