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
  const person = (name: string, email: string): Person => ({
    name,
    email,
    timeZone: "Europe/London",
    language: { translate: t, locale: "en" },
  });
  const attendee = person("Jordan Lee", "jordan@acme.studio");
  const intake = {
    brand: { label: "Brand", value: "Acme Studio" },
    website: { label: "Website", value: "acme.studio" },
    country: { label: "Country", value: "United Kingdom" },
  };
  const calEvent: CalendarEvent = {
    type: "Discovery Call",
    title: "Discovery Call between Design Innsæit and Jordan Lee",
    startTime: "2026-07-15T09:30:00.000Z",
    endTime: "2026-07-15T10:00:00.000Z",
    organizer: person("Design Innsæit", "hello@designinnsaeit.com"),
    attendees: [attendee],
    location: "https://meet.google.com/abc-defg-hij",
    description: "Intro call to scope your project.",
    uid: "preview-sample",
    responses: intake,
    userFieldsResponses: intake,
  };

  const [confirmation, newBooking, reminder24h, reminder1h, followUp] = await Promise.all([
    renderEmail("AttendeeScheduledEmail", { calEvent, attendee }),
    renderEmail("OrganizerScheduledEmail", { calEvent, attendee }),
    renderEmail("AttendeeReminderEmail", { calEvent, attendee, reminderLabel: "24h" }),
    renderEmail("AttendeeReminderEmail", { calEvent, attendee, reminderLabel: "1h" }),
    renderEmail("AttendeeFollowUpEmail", { calEvent, attendee }),
  ]);

  return [
    { title: t("booking_confirmation"), caption: t("email_preview_confirmation_caption"), html: confirmation },
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
      recallAiConnected={!!process.env.RECALL_AI_API_KEY}
      webhooks={webhooks}
      emailPreviews={emailPreviews}
    />
  );
};

export default Page;
