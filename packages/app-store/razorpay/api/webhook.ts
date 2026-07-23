import { createHmac, timingSafeEqual } from "node:crypto";
import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";
import { getRazorpayServerCredentials } from "../lib/constants";

const webhookPayloadSchema = z
  .object({
    event: z.string(),
    payload: z
      .object({
        payment_link: z
          .object({
            entity: z.object({ id: z.string() }).passthrough(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

function isValidSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const signatureHeader = req.headers["x-razorpay-signature"];
    if (typeof signatureHeader !== "string") {
      throw new HttpCode({ statusCode: 400, message: "Missing signature" });
    }

    const rawBody = await getRawBody(req);
    const { keySecret } = getRazorpayServerCredentials();

    if (!isValidSignature(rawBody, signatureHeader, keySecret)) {
      throw new HttpCode({ statusCode: 400, message: "Invalid signature" });
    }

    const parsed = webhookPayloadSchema.safeParse(JSON.parse(rawBody.toString()));
    if (!parsed.success) {
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { event, payload } = parsed.data;
    if (event !== "payment_link.paid") {
      return res.status(200).json({ message: `Ignoring event ${event}` });
    }

    const paymentLinkId = payload.payment_link?.entity.id;
    if (!paymentLinkId) {
      throw new HttpCode({ statusCode: 400, message: "Missing payment_link in payload" });
    }

    const payment = await prisma.payment.findFirst({
      where: { externalId: paymentLinkId },
      select: { id: true, bookingId: true },
    });

    if (!payment) {
      return res.status(200).json({ message: "Payment not found" });
    }

    const traceContext = distributedTracing.createTrace("razorpay_webhook", {
      meta: { paymentId: payment.id, bookingId: payment.bookingId },
    });

    return await handlePaymentSuccess({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      appSlug: "razorpay",
      traceContext,
    });
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    console.error(`Razorpay webhook error: ${err.message}`);
    return res.status(err.statusCode).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.cause?.stack,
    });
  }
}
