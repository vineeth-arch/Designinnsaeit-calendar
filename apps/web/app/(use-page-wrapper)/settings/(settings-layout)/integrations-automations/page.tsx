import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import renderEmail from "@calcom/emails/src/renderEmail";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getTranslation } from "@calcom/i18n/server";
import prisma from "@calcom/prisma";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import IntegrationsAutomationsView from "~/settings/integrations-automations/integrations-automations-view";

const buildEmailPreviews = async () => {
  const t = await getTranslation("en", "common");
  const person = (name: string, email: string, timeZone: string): Person => ({
    name,
    email,
    timeZone,
    language: { translate: t, locale: "en" },
  });
  const attendee = person("Jordan Lee", "jordan@acme.studio", "Europe/London");
  const intake = {
    brand: { label: "Brand", value: "Acme Studio" },
    category: { label: "Category", value: "home fragrance" },
    website: { label: "Website", value: "acme.studio" },
    country: { label: "Country", value: "United Kingdom" },
  };
  const calEvent: CalendarEvent = {
    type: "Brand strategy call",
    title: "Brand strategy call between Design Innsæit and Jordan Lee",
    startTime: "2026-09-21T09:30:00.000Z",
    endTime: "2026-09-21T10:00:00.000Z",
    organizer: person("Vineeth", "hello@designinnsaeit.com", "Asia/Kolkata"),
    attendees: [attendee],
    location: "https://meet.google.com/abc-defg-hij",
    additionalNotes:
      "We charge premium prices but we read like every other candle brand on the shelf, so we end up discounting to shift stock.",
    minimumRescheduleNotice: 24 * 60,
    uid: "preview-sample",
    responses: intake,
    userFieldsResponses: intake,
  };

  // Fixed clocks so each preview shows its own moment (3 days out, a day out, an hour out).
  const start = new Date(calEvent.startTime).getTime();
  const hour = 3_600_000;
  const [confirmation, newBooking, reminder24h, reminder1h, followUp] = await Promise.all([
    renderEmail("AttendeeConfirmationV6Email", { calEvent, attendee, now: start - 72 * hour }),
    renderEmail("OrganizerNewBookingV6Email", { calEvent, attendee, now: start - 72 * hour }),
    renderEmail("AttendeeReminder24hV6Email", { calEvent, attendee, now: start - 24 * hour }),
    renderEmail("AttendeeReminder1hV6Email", { calEvent, attendee, now: start - hour + 18_000 }),
    renderEmail("AttendeeFollowUpV6Email", { calEvent, attendee }),
  ]);

  return [
    { title: t("booking_confirmation", {
        eventTypeTitle: calEvent.type,
        profileName: calEvent.organizer.name,
      }), caption: t("email_preview_confirmation_caption"), html: confirmation },
    { title: t("new_booking_alert"), caption: t("email_preview_new_booking_caption"), html: newBooking },
    { title: t("reminder_24h_card_title"), caption: t("email_preview_24h_caption"), html: reminder24h },
    { title: t("reminder_1h_card_title"), caption: t("email_preview_1h_caption"), html: reminder1h },
    { title: t("follow_up_card_title"), caption: t("email_preview_follow_up_caption"), html: followUp },
  ];
};

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("integrations_automations"),
    (t) => t("integrations_automations_description"),
    undefined,
    undefined,
    "/settings/integrations-automations"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  const userId = session.user.id;

  const [googleCalendar, googleMeet, webhookData] = await Promise.all([
    prisma.credential.findFirst({ where: { type: "google_calendar", userId }, select: { id: true } }),
    prisma.credential.findFirst({ where: { type: "google_video", userId }, select: { id: true } }),
    (async () => {
      const caller = await createRouterCaller(webhookRouter);
      return caller.getByViewer();
    })(),
  ]);

  const webhooks = webhookData.webhookGroups
    .flatMap((group) => group.webhooks)
    .map((w) => ({ url: w.subscriberUrl, active: w.active, triggers: w.eventTriggers as string[] }));

  const emailPreviews = await buildEmailPreviews();

  return (
    <IntegrationsAutomationsView
      googleCalendarConnected={!!googleCalendar}
      googleMeetConnected={!!googleMeet}
      emailConfigured={
        !!process.env.RESEND_API_KEY || !!process.env.EMAIL_SERVER || !!process.env.EMAIL_SERVER_HOST
      }
      cronConfigured={!!process.env.CRON_API_KEY}
      webhooks={webhooks}
      emailPreviews={emailPreviews}
    />
  );
};

export default Page;
