/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn() }));

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ error: vi.fn(), warn: mockWarn, debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@calcom/prisma", () => ({
  default: { booking: { findUnique: vi.fn() }, payment: { create: vi.fn() } },
}));

import prisma from "@calcom/prisma";

import { BuildPaymentService } from "./PaymentService";

type CreateArgs = Parameters<ReturnType<typeof BuildPaymentService>["create"]>;
const createArgs = (amount = 900000): CreateArgs => [
  { amount, currency: "INR" },
  42,
  7,
  "vineeth",
  "Booker",
  "ON_BOOKING",
  "booker@example.com",
  "+911234567890",
  "Strategy Intensive",
];

describe("RazorpayPaymentService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_id");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "rzp_test_secret");
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({ uid: "booking_uid" } as never);
    vi.mocked(prisma.payment.create).mockImplementation((async ({ data }: { data: object }) => ({
      id: 1,
      ...data,
    })) as never);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "plink_123", short_url: "https://rzp.io/i/abc", status: "created" }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates a payment link with basic auth and persists an unpaid Payment row for it", async () => {
      const result = await BuildPaymentService({ key: {} }).create(...createArgs());

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
      expect(url).toBe("https://api.razorpay.com/v1/payment_links");
      expect(init.headers.Authorization).toBe(
        `Basic ${Buffer.from("rzp_test_id:rzp_test_secret").toString("base64")}`
      );
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({
        amount: 900000,
        currency: "INR",
        accept_partial: false,
        description: "Strategy Intensive",
        customer: { email: "booker@example.com" },
      });
      expect(body.callback_url).toMatch(/\/payment\/[0-9a-f-]{36}$/);
      expect(body.reference_id).toMatch(/^[0-9a-f-]{36}$/);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            externalId: "plink_123",
            success: false,
            amount: 900000,
            currency: "INR",
            uid: body.reference_id,
          }),
        })
      );
      expect(result).toMatchObject({ externalId: "plink_123" });
    });

    it("notifies by email only, never by SMS to the booker-supplied phone number", async () => {
      await BuildPaymentService({ key: {} }).create(...createArgs());
      const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
      expect(body.notify).toEqual({ sms: false, email: true });
    });

    it("times out the Razorpay request instead of hanging the booking", async () => {
      await BuildPaymentService({ key: {} }).create(...createArgs());
      const init = fetchMock.mock.calls[0][1] as { signal?: AbortSignal };
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("throws PaymentCreationFailure when Razorpay responds non-2xx, without persisting anything", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "bad auth" });
      await expect(BuildPaymentService({ key: {} }).create(...createArgs(100))).rejects.toThrow(
        /Payment could not be created/
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it("throws before calling Razorpay when the server credentials are missing", async () => {
      vi.stubEnv("RAZORPAY_KEY_SECRET", "");
      await expect(BuildPaymentService({ key: {} }).create(...createArgs())).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws when the booking does not exist", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);
      await expect(BuildPaymentService({ key: {} }).create(...createArgs())).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("refund", () => {
    it("returns null and warns instead of throwing, so reject/cancel flows keep working", async () => {
      await expect(BuildPaymentService({ key: {} }).refund(5)).resolves.toBeNull();
      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining("payment 5"));
    });
  });

  describe("isSetupAlready", () => {
    it("is true only when the credential key is an object", () => {
      expect(BuildPaymentService({ key: {} }).isSetupAlready()).toBe(true);
      expect(BuildPaymentService({ key: null }).isSetupAlready()).toBe(false);
    });
  });
});
