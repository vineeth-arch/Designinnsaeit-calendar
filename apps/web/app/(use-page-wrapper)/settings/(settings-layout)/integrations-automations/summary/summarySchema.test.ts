import { describe, expect, it } from "vitest";
import { summaryFieldsSchema } from "./summarySchema";

const valid = {
  quotes: ["one", "", ""],
  categoryNoun: "candle",
  today: { premium: true, distinctive: false },
  target: { premium: true, distinctive: true },
  goal: "the listing",
  problem: "The real problem.",
  stack: [
    { settled: false, note: "" },
    { settled: false, note: "" },
    { settled: true, note: "" },
    { settled: true, note: "" },
  ],
  riding: [{ title: "The listing", text: "A mid-six-figure line." }],
  fit: { yes: true, why: "Because." },
  nextTitle: "What holding the price is worth",
  nextBody: "Before a number, a conversation.",
  deadline: "2026-10-02",
  slots: 2,
  bookingLink: "https://appointments.designinnsaeit.com/vineeth",
};

describe("summaryFieldsSchema", () => {
  it("accepts a complete form", () => expect(summaryFieldsSchema.safeParse(valid).success).toBe(true));
  it("rejects non-http booking links", () =>
    expect(summaryFieldsSchema.safeParse({ ...valid, bookingLink: "javascript:alert(1)" }).success).toBe(
      false
    ));
  it("rejects over-long and missing text", () => {
    expect(summaryFieldsSchema.safeParse({ ...valid, problem: "x".repeat(901) }).success).toBe(false);
    expect(summaryFieldsSchema.safeParse({ ...valid, goal: "" }).success).toBe(false);
  });
  it("rejects more than three quotes, three riding items, or a bad date", () => {
    expect(summaryFieldsSchema.safeParse({ ...valid, quotes: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(summaryFieldsSchema.safeParse({ ...valid, riding: Array(4).fill(valid.riding[0]) }).success).toBe(
      false
    );
    expect(summaryFieldsSchema.safeParse({ ...valid, deadline: "2 October" }).success).toBe(false);
  });
});
