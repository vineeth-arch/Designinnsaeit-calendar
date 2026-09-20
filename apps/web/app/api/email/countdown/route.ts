import process from "node:process";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { verifyCountdownQuery } from "@calcom/lib/emailCountdown/countdownToken";
import { renderCountdownGif, TRANSPARENT_GIF } from "@calcom/lib/emailCountdown/renderCountdownGif";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
};
// A minute of slack so a call that has just started still shows 00:00:00 rather than vanishing.
const EXPIRY_GRACE_MS = 60_000;
const CACHE_LIMIT = 200;

// One frame set per (params, second): an inbox that fetches the image several times in the same second
// (proxy prefetch, retries) costs one render.
const cache = new Map<string, Buffer>();

const respond = (body: Buffer) => new Response(new Uint8Array(body), { status: 200, headers: HEADERS });

// Every failure is a 200 with an invisible pixel: an email must never show a broken-image icon.
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return respond(TRANSPARENT_GIF);

    const params = verifyCountdownQuery(secret, request.nextUrl.searchParams);
    const now = Date.now();
    if (!params || params.target < now - EXPIRY_GRACE_MS) return respond(TRANSPARENT_GIF);

    await checkRateLimitAndThrowError({
      rateLimitingType: "common",
      identifier: `emailCountdown:${piiHasher.hash(getIP(request) ?? "unknown")}`,
    });

    const key = `${params.target}.${params.layout}.${params.look}.${Math.floor(now / 1000)}`;
    let gif = cache.get(key);
    if (!gif) {
      gif = await renderCountdownGif({ ...params, now });
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
      cache.set(key, gif);
    }
    return respond(gif);
  } catch {
    return respond(TRANSPARENT_GIF);
  }
}
