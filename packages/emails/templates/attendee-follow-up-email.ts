import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export default class AttendeeFollowUpEmail extends AttendeeScheduledEmail {
  constructor(calEvent: CalendarEvent, attendee: Person) {
    super(calEvent, attendee);
    this.name = "SEND_BOOKING_FOLLOW_UP";
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const payload = await super.getNodeMailerPayload();
    return {
      ...payload,
      subject: this.t("follow_up_email_subject", { title: this.calEvent.title }),
    };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeFollowUpEmail", {
      calEvent,
      attendee,
    });
  }

  protected getTextBody(): string {
    return super.getTextBody("follow_up_email_title", "follow_up_email_subtitle");
  }
}
