export type WebhookSummary = { url: string; active: boolean; triggers: string[] };

export type BookingWebhookSummary = { host: string; triggers: string[] };

// Only the host is shown: a subscriber URL can carry a token in its path or query string.
function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

export function summarizeBookingWebhooks(webhooks: WebhookSummary[]): BookingWebhookSummary[] {
  return webhooks
    .filter((webhook) => webhook.active)
    .map((webhook) => ({
      host: hostOf(webhook.url),
      triggers: webhook.triggers.filter((trigger) => trigger.startsWith("BOOKING_")),
    }))
    .filter((webhook) => webhook.triggers.length > 0);
}
