import { readFileSync } from "node:fs";
import process from "node:process";
import { describe, expect, it } from "vitest";

const root = `${process.cwd()}`;
const spec = JSON.parse(readFileSync(`${root}/docs/design/emails/design-spec.json`, "utf8"));
const shell = readFileSync(
  `${root}/packages/emails/src/components/TicketEmailHtml.tsx`,
  "utf8"
).toLowerCase();

describe("email design spec", () => {
  it("keeps the shipped colour tokens in sync with TicketEmailHtml", () => {
    const shipped = ["page", "paper", "brand", "ink", "subtle", "rule", "onBrand", "onBrandMuted"] as const;
    for (const key of shipped) {
      expect(shell, `token ${key}`).toContain(String(spec.tokens.color[key]).toLowerCase());
    }
  });

  it("has a preview file entry for every email", () => {
    expect(spec.emails.map((e: { id: string }) => e.id)).toEqual([
      "confirmation",
      "host-alert",
      "reminder-24h",
      "reminder-1h",
      "follow-up",
    ]);
  });
});
