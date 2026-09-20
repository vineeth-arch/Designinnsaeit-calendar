import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import renderEmail from "../src/renderEmail";
import { renderFollowUp, renderNoShow } from "../src/ticket-v6/templates";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export type FollowUpVariant = "followUp" | "noShow";

export default class AttendeeFollowUpEmail extends AttendeeScheduledEmail {
  variant: FollowUpVariant;

  constructor(calEvent: CalendarEvent, attendee: Person, variant: FollowUpVariant = "followUp") {
    super(calEvent, attendee);
    this.name = "SEND_BOOKING_FOLLOW_UP";
    this.variant = variant;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const payload = await super.getNodeMailerPayload();
    const render = this.variant === "noShow" ? renderNoShow : renderFollowUp;
    return {
      ...payload,
      subject: render({
        calEvent: this.calEvent,
        recipient: this.attendee,
        timeZone: this.attendee.timeZone,
        timeFormat: this.attendee.timeFormat,
      }).subject,
    };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail(
      this.variant === "noShow" ? "AttendeeNoShowV6Email" : "AttendeeFollowUpV6Email",
      {
        calEvent,
        attendee,
      }
    );
  }

  protected getTextBody(): string {
    return super.getTextBody("follow_up_email_title", "follow_up_email_subtitle");
  }
}
