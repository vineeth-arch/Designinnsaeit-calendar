import { eventTypeAppCardZod } from "@calcom/app-store/eventTypeAppCardZod";
import { z } from "zod";

const paymentOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const paymentOptionsSchema = z.array(paymentOptionSchema);

// Razorpay Payment Links have no card-hold/capture-later primitive, so only ON_BOOKING is offered.
export const RazorpayPaymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
];

type PaymentOption = (typeof RazorpayPaymentOptions)[number]["value"];
const VALUES: [PaymentOption, ...PaymentOption[]] = [
  RazorpayPaymentOptions[0].value,
  ...RazorpayPaymentOptions.slice(1).map((option) => option.value),
];
export const paymentOptionEnum = z.enum(VALUES);

export const appDataSchema = eventTypeAppCardZod.merge(
  z.object({
    price: z.number(),
    currency: z.string(),
    paymentOption: z.string().optional(),
    enabled: z.boolean().optional(),
  })
);

// Credential.key is an inert placeholder - real secrets are read from RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET env vars.
export const appKeysSchema = z.object({});
