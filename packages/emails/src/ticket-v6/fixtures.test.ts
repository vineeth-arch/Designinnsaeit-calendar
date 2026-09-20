import { readFileSync } from "node:fs";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { diffHtml } from "./normalize";

const dir = `${process.cwd()}/docs/design/emails/v6/fixtures`;
const names = ["confirmation", "host", "reminder24", "reminder1", "followup", "recap"] as const;

describe("v6 design fixtures", () => {
  for (const name of names) {
    const html = readFileSync(`${dir}/${name}.html`, "utf8");

    it(`${name}: is email-safe and under Gmail's clip size`, () => {
      expect(Buffer.byteLength(html)).toBeLessThan(100 * 1024);
      expect(html).not.toMatch(/display:\s*(flex|grid)/);
      expect(html).not.toMatch(/<script|<svg|<style/i);
      expect(html).not.toMatch(/base64,/);
    });

    it(`${name}: images use the hosted wordmark and carry alt text`, () => {
      for (const img of html.match(/<img[^>]*>/g) ?? []) {
        expect(img).toMatch(/alt=/);
        expect(img).toContain("{{WEBAPP_URL}}/emails/wordmark-mint.png");
      }
    });

    it(`${name}: compares equal to itself`, () => {
      expect(diffHtml(html, html)).toEqual([]);
    });
  }
});
