import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Booking, Payment, PaymentOption, Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";
import { v4 as uuidv4 } from "uuid";
import type z from "zod";
import { appKeysSchema } from "../zod";
import { getRazorpayServerCredentials, RAZORPAY_API_BASE } from "./constants";

const log = logger.getSubLogger({ prefix: ["payment-service:razorpay"] });

interface RazorpayPaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
}

class RazorpayPaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof appKeysSchema> | null;

  constructor(credentials: { key: Prisma.JsonValue }) {
    const keyParsing = appKeysSchema.safeParse(credentials.key);
    this.credentials = keyParsing.success ? keyParsing.data : null;
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    _userId: Booking["userId"],
    _username: string | null,
    bookerName: string | null,
    paymentOption: PaymentOption,
    bookerEmail: string,
    bookerPhoneNumber?: string | null,
    eventTitle?: string,
    bookingTitle?: string
  ) {
    try {
      if (!this.credentials) {
        throw new Error("Razorpay is not installed on this event type");
      }

      const booking = await prisma.booking.findUnique({
        select: { uid: true },
        where: { id: bookingId },
      });
      if (!booking) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      const { keyId, keySecret } = getRazorpayServerCredentials();
      const uid = uuidv4();

      const response = await fetch(`${RAZORPAY_API_BASE}/payment_links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          // Amount is already expressed in the currency's smallest unit (e.g. paise for INR)
          // by the time it reaches here - see convertToSmallestCurrencyUnit in handlePayment.ts.
          amount: payment.amount,
          currency: payment.currency,
          accept_partial: false,
          description: eventTitle || bookingTitle || "Booking payment",
          customer: {
            name: bookerName || undefined,
            email: bookerEmail,
            contact: bookerPhoneNumber || undefined,
          },
          notify: {
            sms: !!bookerPhoneNumber,
            email: true,
          },
          reference_id: uid,
          callback_url: `${WEBAPP_URL}/payment/${uid}`,
          callback_method: "get",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Razorpay API responded with ${response.status}: ${errorBody}`);
      }

      const paymentLink: RazorpayPaymentLinkResponse = await response.json();

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: { slug: "razorpay" },
          },
          booking: {
            connect: { id: bookingId },
          },
          amount: payment.amount,
          currency: payment.currency,
          externalId: paymentLink.id,
          data: {
            id: paymentLink.id,
            short_url: paymentLink.short_url,
            status: paymentLink.status,
          } as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: paymentOption || "ON_BOOKING",
        },
      });

      return paymentData;
    } catch (error) {
      log.error("Razorpay: Payment could not be created for bookingId", bookingId, safeStringify(error));
      throw new ErrorWithCode(
        ErrorCode.PaymentCreationFailure,
        `Razorpay: Payment could not be created for bookingId ${bookingId}`
      );
    }
  }

  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async refund(): Promise<Payment | null> {
    throw new Error("Method not implemented.");
  }

  async collectCard(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async chargeCard(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async afterPayment(
    _event: CalendarEvent,
    _booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    _paymentData: Payment
  ): Promise<void> {
    return Promise.resolve();
  }

  async deletePayment(): Promise<boolean> {
    return Promise.resolve(false);
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}

/**
 * Factory function that creates a Razorpay Payment service instance.
 * This is exported instead of the class to prevent internal types
 * from leaking into the emitted .d.ts file.
 */
export function BuildPaymentService(credentials: { key: Prisma.JsonValue }): IAbstractPaymentService {
  return new RazorpayPaymentService(credentials);
}
