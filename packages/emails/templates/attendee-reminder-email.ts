import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import AttendeeScheduledEmail from "./attendee-scheduled-email";

export type ReminderLabel = "24h" | "1h";

export default class AttendeeReminderEmail extends AttendeeScheduledEmail {
  reminderLabel: ReminderLabel;

  constructor(calEvent: CalendarEvent, attendee: Person, reminderLabel: ReminderLabel) {
    super(calEvent, attendee);
    this.name = "SEND_BOOKING_REMINDER";
    this.reminderLabel = reminderLabel;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const payload = await super.getNodeMailerPayload();
    return {
      ...payload,
      subject: this.t("reminder_email_subject", { title: this.calEvent.title }),
    };
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail("AttendeeReminderEmail", {
      calEvent,
      attendee,
      reminderLabel: this.reminderLabel,
    });
  }

  protected getTextBody(): string {
    return super.getTextBody(
      this.reminderLabel === "1h" ? "reminder_1h_title" : "reminder_24h_title",
      "reminder_email_subtitle"
    );
  }
}
