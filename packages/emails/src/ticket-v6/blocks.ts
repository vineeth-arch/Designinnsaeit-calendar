import { WEBAPP_URL } from "@calcom/lib/constants";
import { HOST, WORDMARK_PATH } from "./copy";
import { barcodeWidths } from "./derive";
import { S } from "./styles";

// Shared blocks of the v6 design as string builders. The design is already email-safe table markup, so
// each block reproduces it verbatim (styles come from styles.ts, generated from the fixtures) and only
// data is interpolated. Every interpolated value must go through esc().

const T0 = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

export const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nbsp = "&nbsp;";
const p = (style: string, html: string) => `<p style="${style}">${html}</p>`;
export const gap = (style: string) => `<div style="${style}">${nbsp}</div>`;
export const spacer = {
  s22: gap(S.S18),
  s26: gap(S.S32),
  s12: gap(S.S34),
  s20: gap(S.S40),
  s8: gap(S.S45),
  s14: gap(S.S66),
  s10: gap(S.S119),
  s16: gap(S.S129),
  s6: gap(S.S58),
  s18: gap(S.S101),
  s24: gap(S.S107),
};

export function link(href: string, text: string, style: string): string {
  return `<a href="${esc(href)}" style="${style}">${esc(text)}</a>`;
}

/** Hidden inbox preview text. */
export const preheader = (text: string) => `<div style="${S.S1}">${esc(text)}</div>`;

/** Beige page, centred 600px column. `rows` are `<tr>` strings. */
export function frame(rows: string): string {
  return `<table ${T0} width="100%" style="${S.S2}"><tr><td align="center" bgcolor="#EDEAE2" style="${S.S3}"><table ${T0} width="600" align="center" style="${S.S4}">${rows}</table></td></tr></table>`;
}

export function header(status: string): string {
  return `<tr><td bgcolor="#270392" style="${S.S5}"><img src="${WEBAPP_URL}${WORDMARK_PATH}" width="232" height="35" alt="${esc(HOST.studio)}" style="${S.S6}">${p(S.S7, "Brand Strategy &amp; Packaging Design Studio")}${p(S.S8, esc(status))}</td></tr>`;
}

const STEPS = ["Booked", "Prepare", "Call", "Summary", "Decision"] as const;
export type TrackerStep = 0 | 1 | 2 | 3 | 4;

/** Five-step strip: steps before `current` are done (black), `current` is magenta, the rest are grey. */
export function tracker(current: TrackerStep): string {
  const cells = STEPS.map((label, i) => {
    const [bar, text] = i < current ? [S.S102, S.S103] : i === current ? [S.S11, S.S12] : [S.S13, S.S14];
    return `<td width="20%" valign="top" style="${S.S10}">${gap(bar)}${p(text, label)}</td>`;
  }).join("");
  return `<tr><td bgcolor="#FBF9F3" style="${S.S9}"><table ${T0} width="100%" style="${S.S2}"><tr>${cells}</tr></table></td></tr>`;
}

export const bodyRow = (inner: string) => `<tr><td bgcolor="#FBF9F3" style="${S.S15}">${inner}</td></tr>`;
export const stubRow = (inner: string) => `<tr><td bgcolor="#FBF9F3" style="${S.S56}">${inner}</td></tr>`;

/** Punched perforation between the part to act on and the stub to keep. */
export function tear(): string {
  const dots = `<td style="${S.S53}">${gap(S.S54)}</td>`.repeat(20);
  return `<tr><td bgcolor="#FBF9F3" style="${S.S49}"><table ${T0} width="100%" style="${S.S2}"><tr><td width="12" valign="middle" style="${S.S50}">${gap(S.S51)}</td><td valign="middle" style="${S.S52}"><table ${T0} width="100%" style="${S.S35}"><tr>${dots}</tr></table></td><td width="12" valign="middle" style="${S.S50}">${gap(S.S55)}</td></tr></table></td></tr>`;
}

export function footer(note: string): string {
  return `<tr><td style="${S.S79}">${p(S.S80, `${esc(HOST.firstName)}, ${esc(HOST.studio)}. ${esc(HOST.city)}.`)}${p(S.S81, esc(note))}</td></tr>`;
}

export const pageNote = (host: string) => `You are getting this because you booked a call at ${host}.`;

export type KeyValue = { label: string; html: string };

/** Key-value rows of the stub. The first row has no top rule. */
export function keyValueRows(rows: KeyValue[]): string {
  const body = rows
    .map(
      (r, i) =>
        `<tr><td width="34%" valign="top" style="${i === 0 ? S.S59 : S.S61}">${esc(r.label)}</td><td valign="top" style="${i === 0 ? S.S60 : S.S62}">${r.html}</td></tr>`
    )
    .join("");
  return `<table ${T0} width="100%" style="${S.S2}">${body}</table>`;
}

export function dateLeaf(month: string, day: string, weekday: string): string {
  return `<table ${T0} width="84" style="${S.S20}"><tr><td align="center" bgcolor="#FF006C" style="${S.S21}">${esc(month)}</td></tr><tr><td align="center" style="${S.S22}">${esc(day)}</td></tr><tr><td align="center" style="${S.S23}">${esc(weekday)}</td></tr></table>`;
}

/** Leaf on the left, big time and two lines on the right. */
export function whenBlock(a: {
  month: string;
  day: string;
  weekday: string;
  time: string;
  line1: string;
  line2: string;
}): string {
  return `<table ${T0} width="100%" style="${S.S2}"><tr><td width="84" valign="top" style="${S.S19}">${dateLeaf(a.month, a.day, a.weekday)}</td><td width="18" style="${S.S24}">${nbsp}</td><td valign="top">${p(S.S25, esc(a.time))}${p(S.S26, esc(a.line1))}${p(S.S27, esc(a.line2))}</td></tr></table>`;
}

/** Full-width magenta call-to-action. */
export function primaryButton(href: string, text: string): string {
  return `<table ${T0} width="100%" style="${S.S28}"><tr><td align="center" bgcolor="#FF006C" style="${S.S29}">${link(href, text, S.S30)}</td></tr></table>`;
}

export type Card = { title: string; text: string; number?: number; dark?: boolean };

const cardHtml = (c: Card, opts: { colspan?: boolean }) => {
  const cell = c.dark ? S.S108 : S.S36;
  const bg = c.dark ? "#161310" : "#F1EEE5";
  const attrs = opts.colspan ? `colspan="3" width="50%"` : `width="50%"`;
  const num = c.number ? `<div style="${S.S98}">${c.number}</div>` : "";
  const title = c.number
    ? c.dark
      ? p(S.S109, esc(c.title))
      : p(S.S99, esc(c.title))
    : p(S.S37, esc(c.title));
  const text = p(c.dark ? S.S110 : S.S38, esc(c.text));
  return `<td ${attrs} valign="top" bgcolor="${bg}" style="${cell}">${num}${title}${text}</td>`;
};

/** Two-column card grid; an odd last card spans the row. */
export function cardGrid(cards: Card[]): string {
  const rows: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    const pair = cards.slice(i, i + 2);
    if (pair.length === 2) {
      rows.push(
        `<tr>${cardHtml(pair[0], {})}<td width="12" style="${S.S39}">${nbsp}</td>${cardHtml(pair[1], {})}</tr>`
      );
    } else {
      rows.push(`<tr>${cardHtml(pair[0], { colspan: true })}</tr>`);
    }
    if (i + 2 < cards.length) rows.push(`<tr><td colspan="3" style="${S.S34}">${nbsp}</td></tr>`);
  }
  return `<table ${T0} width="100%" style="${S.S35}">${rows.join("")}</table>`;
}

/** The 5 / 20 / 5 bar, drawn to scale, and its captions. */
export function splitBar(): string {
  const bar = `<table ${T0} width="100%" style="${S.S35}"><tr><td width="17%" bgcolor="#161310" style="${S.S41}">${nbsp}</td><td width="2" style="${S.S42}">${nbsp}</td><td width="66%" bgcolor="#FF006C" style="${S.S43}">${nbsp}</td><td width="2" style="${S.S42}">${nbsp}</td><td width="17%" bgcolor="#161310" style="${S.S44}">${nbsp}</td></tr></table>`;
  const cap = (w: string, align: string, strong: string, rest: string) =>
    `<td width="${w}"${align ? ` align="${align}"` : ""} style="${S.S46}"><strong style="${S.S47}">${strong}</strong> ${rest}</td>`;
  return `${bar}${spacer.s8}<table ${T0} width="100%" style="${S.S2}"><tr>${cap("30%", "", "5 min", "you talk")}${cap("40%", "center", "20 min", "I ask")}${cap("30%", "right", "5 min", "we decide")}</tr></table>`;
}

/** Bars for a booking reference: 2 to 5 px wide, 3 px gaps. */
export function barcodeCells(reference: string): string {
  const cells = barcodeWidths(reference)
    .map((w) => {
      const style = w === 5 ? S.S71 : w === 2 ? S.S73 : w === 4 ? S.S74 : S.S75;
      return `<td width="${w}" style="${style}">${nbsp}</td><td width="3" style="${S.S72}">${nbsp}</td>`;
    })
    .join("");
  return `<table ${T0} style="${S.S70}"><tr>${cells}</tr></table>`;
}

export const referenceLine = (label: string, reference: string) => `${esc(label)} ${esc(reference)}`;

export const bookingStrip = (label: string, reference: string) =>
  `<table ${T0} style="${S.S2}"><tr><td style="${S.S69}">${barcodeCells(reference)}</td></tr><tr><td style="${S.S76}">${referenceLine(label, reference)}</td></tr></table>`;

/** Barcode with a "view booking online" link on the right (confirmation). */
export function bookingStripWithLink(reference: string, href: string | null): string {
  const right = href
    ? `<td valign="bottom" align="right" style="${S.S77}">${link(href, "View booking online", S.S78)}</td>`
    : "";
  return `<table ${T0} width="100%" style="${S.S2}"><tr><td valign="bottom">${bookingStrip("BOOKING", reference)}</td>${right}</tr></table>`;
}

/** Complete email document around a fragment. `data-v6` marks it for regression tests. */
export function emailDocument(subject: string, fragment: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(subject)}</title></head><body data-v6="1" style="margin:0;padding:0;background:#EDEAE2;">${fragment}</body></html>`;
}

export { p as paragraph };
