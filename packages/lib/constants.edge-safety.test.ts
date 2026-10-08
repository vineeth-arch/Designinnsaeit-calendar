import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// apps/web/app/api/social/og/image/route.tsx runs on the edge runtime and imports this file. Edge has no
// `node:` modules, so a single `import ... from "node:process"` here breaks the whole production build
// ("Failed to load external module node:process"). The global `process` is available everywhere.
describe("packages/lib/constants.ts", () => {
  it("does not import any node: built-in, so edge routes can use it", () => {
    const source = readFileSync(resolve(__dirname, "constants.ts"), "utf8");

    expect(source).not.toMatch(/from\s+["']node:/);
  });
});
