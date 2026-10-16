"use server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { testTriggerHandler } from "@calcom/trpc/server/routers/viewer/webhook/testTrigger.handler";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";

export type PingResult = { ok: boolean; status: number; message?: string };

export async function pingWebhook(webhookId: string): Promise<PingResult> {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) return { ok: false, status: 401 };
  if (session.user.role !== "ADMIN") return { ok: false, status: 403 };

  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId: session.user.id },
    select: { subscriberUrl: true, secret: true, payloadTemplate: true },
  });
  if (!webhook) return { ok: false, status: 404 };

  const result = await testTriggerHandler({
    ctx: {},
    input: {
      url: webhook.subscriberUrl,
      secret: webhook.secret ?? undefined,
      type: "PING",
      payloadTemplate: webhook.payloadTemplate,
    },
  });
  // Only the outcome goes back: the URL and secret must not reach the client.
  return { ok: result.ok, status: result.status, message: "message" in result ? result.message : undefined };
}
