Accept payments for your bookings via [Razorpay](https://razorpay.com) Payment Links. When a booker schedules a paid event type, Cal.diy generates a Razorpay Payment Link and the booker is redirected to Razorpay's hosted checkout page to complete payment.

## Setup

1. Set these environment variables on the server (see `.env.appStore.example`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
2. In the Razorpay dashboard, go to Webhooks and add `https://<your-domain>/api/integrations/razorpay/webhook` for the `payment_link.paid` event. Use the same value for the webhook secret as `RAZORPAY_WEBHOOK_SECRET`. If you leave `RAZORPAY_WEBHOOK_SECRET` empty, the API key secret is used instead.
3. Install the app, then open an event type, go to Apps, enable Razorpay, and set the price and currency.
4. Prices are stored in the currency's smallest unit: 9,000 INR is `900000` paise.
5. Make sure no other payment app is enabled with a price on the same event type.
6. Test with a `rzp_test_` key and a small amount before going live.

## Behaviour and limits

- Only payment on booking is supported (Payment Links cannot hold a card).
- Razorpay notifies the booker by email only.
- A booking is confirmed when Razorpay sends `payment_link.paid`. Repeated deliveries are ignored, and a payment that arrives for a booking that was cancelled or rejected in the meantime is logged and left unconfirmed: refund it from the Razorpay dashboard.
- Refunds are not automated yet. Refund from the Razorpay dashboard when a paid booking is cancelled or rejected.
- Credentials are server-wide environment variables, so every user on the instance who installs this app is paid into the same Razorpay account. Use it on single-owner instances.
