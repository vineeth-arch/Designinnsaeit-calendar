export type WebhookSummary = { id: string; url: string; active: boolean; triggers: string[] };

export type BookingWebhookSummary = { id: string; host: string; triggers: string[] };

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
      id: webhook.id,
      host: hostOf(webhook.url),
      triggers: webhook.triggers.filter((trigger) => trigger.startsWith("BOOKING_")),
    }))
    .filter((webhook) => webhook.triggers.length > 0);
}
