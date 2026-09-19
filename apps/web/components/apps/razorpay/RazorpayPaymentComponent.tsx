"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Link from "next/link";
import z from "zod";

interface IRazorpayPaymentComponentProps {
  payment: {
    // Will be parsed on render
    data: unknown;
  };
}

const PaymentRazorpayDataSchema = z.object({
  id: z.string(),
  short_url: z.string(),
  status: z.string(),
});

export const RazorpayPaymentComponent = (props: IRazorpayPaymentComponentProps) => {
  const { t } = useLocale();
  const { payment } = props;
  const { data } = payment;
  const wrongUrl = (
    <>
      <p className="mt-3 text-center">Couldn&apos;t obtain payment URL</p>
    </>
  );

  const parsedData = PaymentRazorpayDataSchema.safeParse(data);
  if (!parsedData.success || !parsedData.data.short_url) {
    return wrongUrl;
  }

  return (
    <div className="mt-4 flex h-full w-full flex-col items-center justify-center">
      <Link
        href={parsedData.data.short_url}
        className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#0C2451] px-12 py-2 font-medium text-base text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-offset-2">
        {t("pay_with_razorpay")}
      </Link>
    </div>
  );
};
