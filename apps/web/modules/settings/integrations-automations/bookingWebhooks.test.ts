import { describe, expect, it } from "vitest";
import { summarizeBookingWebhooks } from "./bookingWebhooks";

describe("summarizeBookingWebhooks", () => {
  it("lists an active webhook by host with only its BOOKING_ triggers", () => {
    const result = summarizeBookingWebhooks([
      {
        url: "https://handshake.designinnsaeit.com/api/cal/webhook",
        active: true,
        triggers: ["BOOKING_CREATED", "BOOKING_CANCELLED", "MEETING_ENDED"],
      },
    ]);

    expect(result).toEqual([
      { host: "handshake.designinnsaeit.com", triggers: ["BOOKING_CREATED", "BOOKING_CANCELLED"] },
    ]);
  });

  it("ignores inactive webhooks", () => {
    expect(
      summarizeBookingWebhooks([
        { url: "https://a.example/hook", active: false, triggers: ["BOOKING_CREATED"] },
      ])
    ).toEqual([]);
  });

  it("ignores webhooks with no booking trigger", () => {
    expect(
      summarizeBookingWebhooks([{ url: "https://a.example/hook", active: true, triggers: ["MEETING_ENDED"] }])
    ).toEqual([]);
  });

  it("never exposes the path or query string of the subscriber URL", () => {
    const [entry] = summarizeBookingWebhooks([
      {
        url: "https://n8n.example/webhook/secret-path?token=abc123",
        active: true,
        triggers: ["BOOKING_CREATED"],
      },
    ]);

    expect(entry.host).toBe("n8n.example");
    expect(JSON.stringify(entry)).not.toContain("abc123");
    expect(JSON.stringify(entry)).not.toContain("secret-path");
  });

  it("does not throw on an invalid URL and still drops the query string", () => {
    const [entry] = summarizeBookingWebhooks([
      { url: "not a url?token=abc123", active: true, triggers: ["BOOKING_CREATED"] },
    ]);

    expect(entry.host).toBe("not a url");
  });

  it("returns several webhooks in order", () => {
    const result = summarizeBookingWebhooks([
      { url: "https://one.example/x", active: true, triggers: ["BOOKING_CREATED"] },
      { url: "https://two.example/y", active: true, triggers: ["BOOKING_RESCHEDULED"] },
    ]);

    expect(result.map((r) => r.host)).toEqual(["one.example", "two.example"]);
  });
});
