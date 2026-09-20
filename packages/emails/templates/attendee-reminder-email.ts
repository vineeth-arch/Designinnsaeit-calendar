import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import { renderReminder1h, renderReminder24h } from "../src/ticket-v6/templates";
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
      subject: this.getReminderSubject(),
    };
  }

  private getReminderSubject(): string {
    const render = this.reminderLabel === "1h" ? renderReminder1h : renderReminder24h;
    return render({
      calEvent: this.calEvent,
      recipient: this.attendee,
      timeZone: this.attendee.timeZone,
      timeFormat: this.attendee.timeFormat,
    }).subject;
  }

  async getHtml(calEvent: CalendarEvent, attendee: Person) {
    return await renderEmail(
      this.reminderLabel === "1h" ? "AttendeeReminder1hV6Email" : "AttendeeReminder24hV6Email",
      { calEvent, attendee }
    );
  }

  protected getTextBody(): string {
    return super.getTextBody(
      this.reminderLabel === "1h" ? "reminder_1h_title" : "reminder_24h_title",
      "reminder_email_subtitle"
    );
  }
}
