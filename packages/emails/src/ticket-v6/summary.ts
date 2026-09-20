import dayjs from "@calcom/dayjs";
import {
  bodyRow,
  bookingStrip,
  cardGrid,
  emailDocument,
  esc,
  footer,
  frame,
  header,
  paragraph,
  preheader,
  spacer,
  tracker,
} from "./blocks";
import { buildContext } from "./context";
import { HOST, PREHEADERS, SUBJECTS } from "./copy";
import { S } from "./styles";
import type { V6Input, V6Rendered } from "./templates";

// Email 6: the host-written summary. Everything the host types arrives as `SummaryFields`; the positioning
// map and the brand stack are drawn from values, never from hand-written HTML.

const T0 = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
const NBSP = "&nbsp;";

export type MapPoint = { premium: boolean; distinctive: boolean };
export type Quadrant = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export type StackLayer = { settled: boolean; note: string };

export const STACK_LAYERS = ["Position", "Story and message", "Identity", "Packaging and site"] as const;

export type SummaryFields = {
  quotes: string[];
  /** Noun for the bottom axis: "Reads like every other candle on the shelf". */
  categoryNoun: string;
  today: MapPoint;
  target: MapPoint;
  /** What the target position is for: "Where the listing needs you". */
  goal: string;
  captions?: Partial<Record<Quadrant, string>>;
  problem: string;
  stack: [StackLayer, StackLayer, StackLayer, StackLayer];
  riding: { title: string; text: string }[];
  fit: { yes: boolean; why: string };
  nextTitle: string;
  nextBody: string;
  /** Date-only, YYYY-MM-DD. */
  deadline: string;
  slots: number;
  bookingLink: string;
};

const DEFAULT_CAPTIONS: Record<Quadrant, string> = {
  topLeft: "Distinctive, but priced like\nan everyday brand",
  topRight: "Premium price and\nunmistakably itself",
  bottomLeft: "Sells on discount\nand stays there",
  bottomRight: "Premium price, ordinary story",
};

const quadrantOf = (p: MapPoint): Quadrant =>
  p.distinctive ? (p.premium ? "topRight" : "topLeft") : p.premium ? "bottomRight" : "bottomLeft";

const withBreaks = (text: string) => esc(text).replace(/\n/g, "<br>");
const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five"];
const count = (n: number) => (n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n));

function mapCell(
  quadrant: Quadrant,
  a: { today: Quadrant; target: Quadrant; brand: string; goal: string; captions: Record<Quadrant, string> }
) {
  const hasToday = a.today === quadrant;
  const hasTarget = a.target === quadrant;
  const bg = hasToday ? "#FFE3EE" : hasTarget ? "#F1EEE5" : "#FBF9F3";
  const top = quadrant === "bottomLeft" || quadrant === "bottomRight" ? "border-top:2px solid #161310;" : "";
  const left = quadrant === "topRight" || quadrant === "bottomRight" ? "border-left:2px solid #161310;" : "";
  const style = `width:50%;height:104px;background:${bg};border:1px solid #D6D1C4;${top}${left}padding:10px 12px;`;
  const marker = (filled: boolean, label: string) =>
    `<div style="${filled ? S.S154 : S.S150}">${NBSP}</div><p style="${S.S151}">${esc(label)}</p>`;
  const content =
    hasToday || hasTarget
      ? (hasTarget ? marker(false, `Where ${a.goal} needs you`) : "") +
        (hasToday ? marker(true, `${a.brand} today`) : "")
      : `<p style="${S.S148}">${withBreaks(a.captions[quadrant])}</p>`;
  return `<td width="50%" height="104" valign="middle" align="center" bgcolor="${bg}" style="${style}">${content}</td>`;
}

function positioningMap(f: SummaryFields, brand: string) {
  const a = {
    today: quadrantOf(f.today),
    target: quadrantOf(f.target),
    brand,
    goal: f.goal,
    captions: { ...DEFAULT_CAPTIONS, ...f.captions },
  };
  const grid = `<table ${T0} width="100%" style="${S.S35}"><tr>${mapCell("topLeft", a)}${mapCell("topRight", a)}</tr><tr>${mapCell("bottomLeft", a)}${mapCell("bottomRight", a)}</tr></table>`;
  const xAxis = `<table ${T0} width="100%" style="${S.S2}"><tr><td width="50%" style="${S.S155}">Everyday price</td><td width="50%" align="right" style="${S.S155}">Premium price</td></tr></table>`;
  return `<table ${T0} width="100%" style="${S.S2}"><tr><td bgcolor="#EDEAE2" style="${S.S145}">${paragraph(S.S143, esc(`Where I think ${brand} sits`))}${spacer.s12}${paragraph(S.S146, esc(`Reads unmistakably like ${brand}`))}${spacer.s6}${grid}${spacer.s6}${xAxis}${paragraph(S.S156, esc(`Reads like every other ${f.categoryNoun} on the shelf`))}</td></tr></table>`;
}

function brandStack(layers: SummaryFields["stack"]) {
  const rows = STACK_LAYERS.map((name, i) => {
    const { settled, note } = layers[i];
    const [cell, nameStyle, noteStyle, bg] = settled
      ? [S.S161, S.S162, S.S163, "#161310"]
      : [S.S158, S.S159, S.S160, "#FBF9F3"];
    const noteText = note.trim() || (settled ? "settled" : "never settled");
    return `<tr><td style="${S.S157}"><table ${T0} width="100%" style="${S.S2}"><tr><td bgcolor="${bg}" style="${cell}"><table ${T0} width="100%" style="${S.S2}"><tr><td valign="middle" style="${nameStyle}">${esc(name)}</td><td valign="middle" align="right" style="${noteStyle}">${esc(noteText)}</td></tr></table></td></tr></table></td></tr>`;
  }).join("");
  return `<table ${T0} width="100%" style="${S.S2}">${rows}</table>`;
}

function quotes(list: string[]) {
  const rows = list
    .filter((q) => q.trim())
    .map((q) => `<tr><td style="${S.S96}">${paragraph(S.S144, `&ldquo;${esc(q.trim())}&rdquo;`)}</td></tr>`)
    .join(`<tr><td style="${S.S34}">${NBSP}</td></tr>`);
  return rows ? `<table ${T0} width="100%" style="${S.S2}">${rows}</table>` : "";
}

export function renderSummary(input: V6Input, f: SummaryFields): V6Rendered {
  const c = buildContext({
    calEvent: input.calEvent,
    recipient: input.recipient,
    timeZone: input.timeZone,
    now: input.now ?? Date.now(),
    timeFormat: input.timeFormat,
  });
  const subject = SUBJECTS.summary();
  const brand = c.brandShort;
  const deadline = dayjs.utc(f.deadline);
  const deadlineText = deadline.format("dddd D MMMM");
  const quoteBlock = quotes(f.quotes);

  const letter = [
    paragraph(S.S16, esc(`${c.first}, here is what I heard.`)),
    paragraph(
      S.S17.replace("margin:4px", "margin:6px"),
      "Correct anything that is wrong. I would rather be corrected now than build on a wrong reading."
    ),
    quoteBlock ? spacer.s22 + paragraph(S.S143, "Your words") + spacer.s10 + quoteBlock : "",
    spacer.s24,
    positioningMap(f, brand),
    spacer.s22,
    paragraph(S.S144, esc(f.problem)),
    spacer.s18,
    brandStack(f.stack),
    f.riding.length
      ? spacer.s24 +
        paragraph(S.S33, "What is riding on it") +
        spacer.s12 +
        cardGrid(f.riding.map((r) => ({ title: r.title, text: r.text })))
      : "",
    spacer.s22,
    paragraph(
      S.S164,
      esc(
        f.fit.yes ? "Yes, this is work I am the right fit for." : "No, and here is who I would send you to."
      )
    ),
    paragraph(S.S165, esc(f.fit.why)),
  ].join("");

  const next = `<tr><td bgcolor="#161310" style="${S.S82}">${paragraph(S.S166, "The next 45 minutes")}${paragraph(S.S167, esc(f.nextTitle))}${paragraph(S.S168, esc(f.nextBody))}${spacer.s18}<table ${T0} width="100%" style="${S.S28}"><tr><td align="center" bgcolor="#FF006C" style="${S.S29}"><a href="${esc(f.bookingLink)}" style="${S.S169}">${esc(`Pick a time before ${deadlineText}`)}</a></td></tr></table>${paragraph(S.S170, esc(`I hold ${count(f.slots)} ${f.slots === 1 ? "slot" : "slots"} that week. After ${deadline.format("dddd")} I release them.`))}</td></tr>`;

  const torn = `<tr><td bgcolor="#FBF9F3" style="${S.S135}"><table ${T0} width="100%" style="${S.S35}"><tr>${`<td style="${S.S136}"><div style="${S.S137}">${NBSP}</div></td>`.repeat(26)}</tr></table></td></tr>`;
  const range = `${c.leaf.weekday.slice(0, 3)} ${c.leaf.day} ${c.leaf.month} ${dayjs(c.startIso).tz(c.tz).format("YYYY")}, ${c.time.start.replace(/(am|pm)$/, "")} to ${c.time.end} ${c.attendeeZoneAbbr}`;
  const stub = `<tr><td bgcolor="#FBF9F3" style="${S.S56}"><table ${T0} width="100%" style="${S.S2}"><tr><td valign="top">${paragraph(S.S138, "Follows the brand strategy call")}${paragraph(S.S27, esc(range))}${spacer.s14}${bookingStrip("BOOKING", c.reference)}</td></tr></table></td></tr>`;
  const callDay = dayjs(c.startIso).tz(c.tz).format("dddd D MMMM");

  const fragment =
    preheader(PREHEADERS.summary({ replyBy: deadlineText })) +
    frame(
      header("WHAT I HEARD") +
        tracker(4) +
        bodyRow(letter) +
        next +
        torn +
        stub +
        footer(`Sent by ${HOST.firstName} after our call on ${callDay}.`)
    );
  return { subject, html: emailDocument(subject, fragment) };
}
