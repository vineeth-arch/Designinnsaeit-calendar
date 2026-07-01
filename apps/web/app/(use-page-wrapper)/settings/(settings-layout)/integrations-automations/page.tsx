import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import IntegrationsAutomationsView from "~/settings/integrations-automations/integrations-automations-view";

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
    />
  );
};

export default Page;
