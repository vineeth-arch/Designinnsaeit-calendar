import process from "node:process";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";

export const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export interface RazorpayServerCredentials {
  keyId: string;
  keySecret: string;
}

/**
 * Read lazily (never at module load) so importing this module never throws for servers
 * that haven't configured Razorpay - payment.services.generated.ts imports every payment
 * app's module unconditionally, regardless of whether it's actually in use.
 */
export function getRazorpayServerCredentials(): RazorpayServerCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ErrorWithCode(
      ErrorCode.MissingPaymentCredential,
      "Razorpay: RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are not configured on the server"
    );
  }
  return { keyId, keySecret };
}
