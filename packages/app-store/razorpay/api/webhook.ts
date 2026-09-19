import { createHmac, timingSafeEqual } from "node:crypto";
import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";
import { getRazorpayServerCredentials } from "../lib/constants";

const log = logger.getSubLogger({ prefix: ["razorpay-webhook"] });

const webhookPayloadSchema = z
  .object({
    event: z.string(),
    payload: z
      .object({
        payment_link: z
          .object({
            entity: z
              .object({
                id: z.string(),
                status: z.string().optional(),
                amount_paid: z.number().optional(),
                currency: z.string().optional(),
              })
              .passthrough(),
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

    let webhookSecret: string;
    try {
      ({ webhookSecret } = getRazorpayServerCredentials());
    } catch {
      // Generic on purpose: unsigned callers must not learn which env vars are missing.
      throw new HttpCode({ statusCode: 503, message: "Razorpay webhook is not configured" });
    }

    if (!isValidSignature(rawBody, signatureHeader, webhookSecret)) {
      throw new HttpCode({ statusCode: 400, message: "Invalid signature" });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody.toString());
    } catch {
      throw new HttpCode({ statusCode: 400, message: "Invalid JSON" });
    }

    const parsed = webhookPayloadSchema.safeParse(json);
    if (!parsed.success) {
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { event, payload } = parsed.data;
    if (event !== "payment_link.paid") {
      return res.status(200).json({ message: `Ignoring event ${event}` });
    }

    const entity = payload.payment_link?.entity;
    if (!entity) {
      throw new HttpCode({ statusCode: 400, message: "Missing payment_link in payload" });
    }

    const payment = await prisma.payment.findFirst({
      where: { externalId: entity.id },
      select: { id: true, bookingId: true, success: true, amount: true, currency: true },
    });

    if (!payment) {
      return res.status(200).json({ message: "Payment not found" });
    }

    // Razorpay retries deliveries; handlePaymentSuccess is not idempotent (it would create a second calendar event and resend emails).
    if (payment.success) {
      return res.status(200).json({ message: "Payment already processed" });
    }

    const amountMismatch = entity.amount_paid !== undefined && entity.amount_paid !== payment.amount;
    const currencyMismatch =
      entity.currency !== undefined && entity.currency.toUpperCase() !== payment.currency.toUpperCase();
    const notPaid = entity.status !== undefined && entity.status !== "paid";
    if (amountMismatch || currencyMismatch || notPaid) {
      log.error(
        `Razorpay payment link ${entity.id} does not match payment ${payment.id}: ` +
          `status=${entity.status} amount_paid=${entity.amount_paid} currency=${entity.currency} ` +
          `expected amount=${payment.amount} currency=${payment.currency}`
      );
      throw new HttpCode({ statusCode: 400, message: "Payment does not match the booking" });
    }

    // handlePaymentSuccess sets the booking to ACCEPTED unconditionally, which would resurrect a booking cancelled while the link was live.
    const booking = await prisma.booking.findUnique({
      where: { id: payment.bookingId },
      select: { status: true },
    });
    if (booking && (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED)) {
      log.error(
        `Payment ${payment.id} (${entity.id}) was paid for ${booking.status} booking ${payment.bookingId}; not confirming. Refund it from the Razorpay dashboard.`
      );
      return res.status(200).json({ message: "Booking is no longer active; the payment needs a manual refund" });
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
