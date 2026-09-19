import { describe, expect, it } from "vitest";
import { FLAG_GUIDANCE, getFlagGuidance, VERDICT_STYLE } from "./flagGuidance";

describe("flagGuidance", () => {
  it("returns undefined for a slug with no guidance", () => {
    expect(getFlagGuidance("some-future-flag")).toBeUndefined();
  });

  it("covers all 37 seeded flags", () => {
    expect(Object.keys(FLAG_GUIDANCE)).toHaveLength(37);
  });

  it("gives every flag a summary, a benefit and a known verdict style", () => {
    for (const [slug, guidance] of Object.entries(FLAG_GUIDANCE)) {
      expect(guidance.summary, slug).not.toBe("");
      expect(guidance.benefit, slug).not.toBe("");
      expect(VERDICT_STYLE[guidance.verdict], slug).toBeDefined();
    }
  });

  it("marks only the emails kill switch as dangerous", () => {
    const dangerous = Object.entries(FLAG_GUIDANCE)
      .filter(([, guidance]) => guidance.danger)
      .map(([slug]) => slug);
    expect(dangerous).toEqual(["emails"]);
  });

  it("flags inactive entries with an explanatory note", () => {
    for (const [slug, guidance] of Object.entries(FLAG_GUIDANCE)) {
      if (guidance.verdict === "inactive") expect(guidance.note, slug).toContain("No code");
    }
  });
});
