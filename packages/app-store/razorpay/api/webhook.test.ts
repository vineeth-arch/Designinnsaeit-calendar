/**
 * @vitest-environment node
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockLogError } = vi.hoisted(() => ({ mockLogError: vi.fn() }));

vi.mock("@calcom/app-store/_utils/payments/handlePaymentSuccess", () => ({ handlePaymentSuccess: vi.fn() }));
vi.mock("@calcom/lib/tracing/factory", () => ({
  distributedTracing: { createTrace: vi.fn(() => ({ traceId: "trace" })) },
}));
vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ error: mockLogError, warn: vi.fn(), debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@calcom/prisma", () => ({
  default: { payment: { findFirst: vi.fn() }, booking: { findUnique: vi.fn() } },
}));
vi.mock("raw-body", () => ({ default: vi.fn(async (req: { __raw: Buffer }) => req.__raw) }));

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import handler from "./webhook";

const KEY_SECRET = "key_secret_value";
const WEBHOOK_SECRET = "whsec_dashboard_value";

type LinkEntity = { id: string; status?: string; amount_paid?: number; currency?: string };
const paidBody = (entity: Partial<LinkEntity> = {}, event = "payment_link.paid") =>
  JSON.stringify({
    event,
    payload: {
      payment_link: {
        entity: { id: "plink_123", status: "paid", amount_paid: 900000, currency: "INR", ...entity },
      },
    },
  });
const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("hex");

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(b: unknown) {
      res.body = b;
      return res;
    },
    send(b: unknown) {
      res.body = b;
      return res;
    },
  };
  return res;
}

async function call(body: string, signature?: string, method = "POST") {
  const req = {
    method,
    headers: signature ? { "x-razorpay-signature": signature } : {},
    __raw: Buffer.from(body),
  };
  const res = mockRes();
  await handler(req as never, res as never);
  return res;
}

const payment = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  bookingId: 42,
  success: false,
  amount: 900000,
  currency: "INR",
  ...overrides,
});

describe("razorpay webhook", () => {
  beforeEach(() => {
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_id");
    vi.stubEnv("RAZORPAY_KEY_SECRET", KEY_SECRET);
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(payment() as never);
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ status: "PENDING" } as never);
    // The real handlePaymentSuccess always finishes by throwing HttpError 200.
    vi.mocked(handlePaymentSuccess).mockRejectedValue(new HttpError({ statusCode: 200, message: "confirmed" }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("rejects an invalid signature with 400 and never confirms", async () => {
      const body = paidBody();
      const res = await call(body, sign(body, "wrong"));
      expect(res.statusCode).toBe(400);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it("rejects a missing signature header with 400", async () => {
      expect((await call(paidBody())).statusCode).toBe(400);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it("rejects non-POST requests with 405", async () => {
      expect((await call(paidBody(), undefined, "GET")).statusCode).toBe(405);
    });

    it("verifies with RAZORPAY_WEBHOOK_SECRET, not the API key secret, when both are set", async () => {
      const body = paidBody();
      expect((await call(body, sign(body, KEY_SECRET))).statusCode).toBe(400);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();

      await call(body, sign(body, WEBHOOK_SECRET));
      expect(handlePaymentSuccess).toHaveBeenCalledTimes(1);
    });

    it("falls back to the API key secret when RAZORPAY_WEBHOOK_SECRET is unset", async () => {
      vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
      const body = paidBody();
      await call(body, sign(body, KEY_SECRET));
      expect(handlePaymentSuccess).toHaveBeenCalledTimes(1);
    });

    it("returns a generic 503 that does not name the missing env vars when Razorpay is not configured", async () => {
      vi.stubEnv("RAZORPAY_KEY_SECRET", "");
      vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
      const res = await call(paidBody(), "deadbeef");
      expect(res.statusCode).toBe(503);
      expect(JSON.stringify(res.body)).not.toMatch(/RAZORPAY_/);
    });

    it("rejects a correctly signed but malformed JSON body with 400", async () => {
      const body = "{not json";
      expect((await call(body, sign(body, WEBHOOK_SECRET))).statusCode).toBe(400);
    });
  });

  describe("event handling", () => {
    it("confirms the matching booking for a valid payment_link.paid", async () => {
      const body = paidBody();
      const res = await call(body, sign(body, WEBHOOK_SECRET));
      expect(handlePaymentSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: 9, bookingId: 42, appSlug: "razorpay" })
      );
      expect(prisma.payment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { externalId: "plink_123" } })
      );
      expect(res.statusCode).toBe(200);
    });

    it("ignores other events with 200", async () => {
      const body = paidBody({}, "payment_link.expired");
      const res = await call(body, sign(body, WEBHOOK_SECRET));
      expect(res.statusCode).toBe(200);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it("returns 200 without confirming when no payment matches the link", async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);
      const body = paidBody();
      const res = await call(body, sign(body, WEBHOOK_SECRET));
      expect(res.statusCode).toBe(200);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });
  });

  describe("idempotency", () => {
    it("does not confirm again when the payment is already successful (webhook retry)", async () => {
      vi.mocked(prisma.payment.findFirst).mockResolvedValue(payment({ success: true }) as never);
      const body = paidBody();
      const res = await call(body, sign(body, WEBHOOK_SECRET));
      expect(res.statusCode).toBe(200);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });
  });

  describe("payload consistency", () => {
    it("rejects an amount that differs from the stored payment", async () => {
      const body = paidBody({ amount_paid: 100 });
      const res = await call(body, sign(body, WEBHOOK_SECRET));
      expect(res.statusCode).toBe(400);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it("rejects a different currency", async () => {
      const body = paidBody({ currency: "USD" });
      expect((await call(body, sign(body, WEBHOOK_SECRET))).statusCode).toBe(400);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it("compares currency case-insensitively", async () => {
      const body = paidBody({ currency: "inr" });
      await call(body, sign(body, WEBHOOK_SECRET));
      expect(handlePaymentSuccess).toHaveBeenCalledTimes(1);
    });

    it("rejects a link whose status is not paid", async () => {
      const body = paidBody({ status: "created" });
      expect((await call(body, sign(body, WEBHOOK_SECRET))).statusCode).toBe(400);
      expect(handlePaymentSuccess).not.toHaveBeenCalled();
    });

    it("still confirms when the payload omits the optional amount, currency and status fields", async () => {
      const body = JSON.stringify({
        event: "payment_link.paid",
        payload: { payment_link: { entity: { id: "plink_123" } } },
      });
      await call(body, sign(body, WEBHOOK_SECRET));
      expect(handlePaymentSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe("late payments", () => {
    it.each(["CANCELLED", "REJECTED"])(
      "does not resurrect a %s booking and logs that a manual refund is needed",
      async (status) => {
        vi.mocked(prisma.booking.findUnique).mockResolvedValue({ status } as never);
        const body = paidBody();
        const res = await call(body, sign(body, WEBHOOK_SECRET));
        expect(res.statusCode).toBe(200);
        expect(handlePaymentSuccess).not.toHaveBeenCalled();
        expect(mockLogError).toHaveBeenCalledWith(expect.stringMatching(/refund/i));
      }
    );
  });
});
