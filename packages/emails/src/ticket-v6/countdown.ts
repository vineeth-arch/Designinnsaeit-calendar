import process from "node:process";
import { WEBAPP_URL } from "@calcom/lib/constants";
import {
  type CountdownLayout,
  type CountdownLook,
  countdownQuery,
} from "@calcom/lib/emailCountdown/countdownToken";
import { countdownParts } from "@calcom/lib/emailCountdown/renderCountdownGif";
import { esc, link } from "./blocks";
import type { V6Context } from "./context";
import { S } from "./styles";

const T0 = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

const LABELS: Record<CountdownLayout, [string, string, string]> = {
  hms: ["hours", "minutes", "seconds"],
  dhm: ["days", "hours", "minutes"],
};

/**
 * Signed countdown image with the units as HTML underneath. Null when there is no signing secret, so the
 * caller keeps its static text: the image is an upgrade, never the only carrier of the information.
 */
export function countdownImage(c: V6Context, layout: CountdownLayout, look: CountdownLook): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const target = new Date(c.startIso).getTime();
  const src = `${WEBAPP_URL}/api/email/countdown?${countdownQuery(secret, { target, layout, look })}`;
  const parts = countdownParts(c.msUntilStart, layout);
  const labels = LABELS[layout];
  const alt = `Starts in ${parts.map((p, i) => `${Number(p)} ${labels[i]}`).join(", ")}, as of when this email was sent.`;
  const labelStyle = look === "hero" ? S.S121 : S.S155;
  const cells = labels
    .map((l) => `<td width="33%" align="center" valign="top" style="${labelStyle}">${esc(l)}</td>`)
    .join("");
  return `<table ${T0} width="100%" data-slot="countdown-gif" style="${S.S2}"><tr><td align="center"><img src="${esc(src)}" width="480" height="110" alt="${esc(alt)}" style="display:block;border:0;width:100%;max-width:480px;height:auto;"></td></tr></table><table ${T0} width="100%" style="${S.S2}"><tr>${cells}</tr></table>`;
}

/** The image is a snapshot; this link opens the booking page, which ticks live. */
export function liveCountdownLink(c: V6Context): string {
  return c.bookingUrl ? `<p style="${S.S131}">${link(c.bookingUrl, "Open live countdown", S.S68)}</p>` : "";
}
