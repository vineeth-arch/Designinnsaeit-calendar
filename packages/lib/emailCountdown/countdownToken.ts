import { createHmac, timingSafeEqual } from "node:crypto";

export type CountdownLayout = "hms" | "dhm";
export type CountdownLook = "hero" | "paper";

export type CountdownParams = { target: number; layout: CountdownLayout; look: CountdownLook };

// The signature covers only public booking facts (start time, layout, colours): no PII, and it stops
// anyone from using the route to render arbitrary frames at our cost.
const sign = (secret: string, p: CountdownParams) =>
  createHmac("sha256", secret).update(`${p.target}.${p.layout}.${p.look}`).digest("base64url").slice(0, 22);

export function countdownQuery(secret: string, p: CountdownParams): string {
  return `t=${p.target}&g=${p.layout}&v=${p.look}&s=${sign(secret, p)}`;
}

export function verifyCountdownQuery(secret: string, query: URLSearchParams): CountdownParams | null {
  const target = Number(query.get("t"));
  const layout = query.get("g");
  const look = query.get("v");
  const given = query.get("s") ?? "";
  if (!Number.isSafeInteger(target) || target <= 0) return null;
  if (layout !== "hms" && layout !== "dhm") return null;
  if (look !== "hero" && look !== "paper") return null;
  const params: CountdownParams = { target, layout, look };
  const expected = sign(secret, params);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? params : null;
}
