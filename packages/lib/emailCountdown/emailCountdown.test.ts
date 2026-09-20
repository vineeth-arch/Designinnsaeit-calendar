import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { countdownQuery, verifyCountdownQuery } from "./countdownToken";
import { countdownParts, renderCountdownGif, TRANSPARENT_GIF } from "./renderCountdownGif";

const p = { target: 1_800_000_000_000, layout: "hms", look: "hero" } as const;

describe("countdown token", () => {
  it("round-trips", () => {
    const q = new URLSearchParams(countdownQuery("secret", p));
    expect(verifyCountdownQuery("secret", q)).toEqual(p);
  });
  it("rejects a wrong secret, tampered target and bad values", () => {
    const q = countdownQuery("secret", p);
    expect(verifyCountdownQuery("other", new URLSearchParams(q))).toBeNull();
    expect(
      verifyCountdownQuery("secret", new URLSearchParams(q.replace("t=1800000000000", "t=1800000000001")))
    ).toBeNull();
    expect(verifyCountdownQuery("secret", new URLSearchParams("t=abc&g=hms&v=hero&s=x"))).toBeNull();
    expect(verifyCountdownQuery("secret", new URLSearchParams(q.replace("g=hms", "g=xyz")))).toBeNull();
  });
});

describe("countdown parts", () => {
  it("hms", () =>
    expect(countdownParts(2 * 3600_000 + 5 * 60_000 + 9_000, "hms")).toEqual(["02", "05", "09"]));
  it("dhm", () =>
    expect(countdownParts(3 * 86400_000 + 4 * 3600_000 + 30 * 60_000, "dhm")).toEqual(["03", "04", "30"]));
  it("clamps past targets to zero", () => expect(countdownParts(-5000, "hms")).toEqual(["00", "00", "00"]));
});

describe("countdown gif", () => {
  it("hms is an animated GIF under 120 KB", async () => {
    const gif = await renderCountdownGif({ ...p, now: p.target - 3_600_000 });
    const meta = await sharp(gif, { animated: true }).metadata();
    expect(meta.format).toBe("gif");
    expect(meta.width).toBe(480);
    expect(meta.pages).toBe(40);
    expect(meta.pageHeight).toBe(110);
    expect(gif.length).toBeLessThan(120 * 1024);
  });
  it("dhm is a single frame", async () => {
    const gif = await renderCountdownGif({
      target: p.target,
      now: p.target - 3 * 86400_000,
      layout: "dhm",
      look: "paper",
    });
    expect((await sharp(gif).metadata()).pages ?? 1).toBe(1);
  });
  it("fallback gif is a valid 1x1 image", async () => {
    const meta = await sharp(TRANSPARENT_GIF).metadata();
    expect([meta.width, meta.height]).toEqual([1, 1]);
  });
});
