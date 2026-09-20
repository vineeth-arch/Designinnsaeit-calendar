import { describe, expect, it } from "vitest";
import { diffHtml } from "./normalize";

const base = `<table role="presentation" width="100%" style="border-collapse:collapse;"><tr><td bgcolor="#FF006C" style="padding:10px 12px;color:#161310;">Hello&nbsp;there</td></tr></table>`;

describe("diffHtml", () => {
  it("ignores attribute order, style order, semicolons and whitespace", () => {
    const reordered = `<table style="border-collapse: collapse" width="100%" role="presentation"><tr><td style="color:#161310; padding:10px 12px" bgcolor="#ff006c">
      Hello&nbsp;there </td></tr></table>`;
    expect(diffHtml(base, reordered)).toEqual([]);
  });

  it("fails on a changed colour", () => {
    const d = diffHtml(base, base.replace("#161310", "#161311"));
    expect(d.map((x) => x.path.split("@")[1])).toEqual(["style.color"]);
  });

  it("fails on changed padding", () => {
    expect(diffHtml(base, base.replace("10px 12px", "10px 14px"))).toHaveLength(1);
  });

  it("fails on changed text and on a missing element", () => {
    expect(diffHtml(base, base.replace("Hello", "Hullo"))).toHaveLength(1);
    expect(diffHtml(base, base.replace("<tr>", "<tr><td>x</td>"))).not.toEqual([]);
  });

  it("fails on a changed attribute, and can ignore one on request", () => {
    const changed = base.replace('width="100%"', 'width="90%"');
    expect(diffHtml(base, changed)).toHaveLength(1);
    expect(diffHtml(base, changed, (_p, attr) => attr === "width")).toEqual([]);
  });
});
