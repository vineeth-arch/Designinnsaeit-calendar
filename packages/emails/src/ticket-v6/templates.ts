import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import {
  bodyRow,
  bookingStrip,
  bookingStripWithLink,
  cardGrid,
  emailDocument,
  esc,
  footer,
  frame,
  header,
  keyValueRows,
  dateLeaf as leaf,
  link,
  pageNote,
  paragraph,
  preheader,
  primaryButton,
  spacer,
  splitBar,
  stubRow,
  tear,
  tracker,
  whenBlock,
} from "./blocks";
import { BOOKING_HOST, buildContext, stripProtocol, type V6Context, withProtocol } from "./context";
import { HOST, PREHEADERS, SUBJECTS } from "./copy";
import { addWorkingDays } from "./derive";
import { S } from "./styles";

export type V6Input = {
  calEvent: CalendarEvent;
  recipient: Person;
  timeZone: string;
  timeFormat?: TimeFormat;
  now?: number;
};

export type V6Rendered = { subject: string; html: string };

const ctxOf = (i: V6Input): V6Context =>
  buildContext({
    calEvent: i.calEvent,
    recipient: i.recipient,
    timeZone: i.timeZone,
    now: i.now ?? Date.now(),
    timeFormat: i.timeFormat,
  });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const T0 = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
const sentence = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");

/** "Where to reach the call": the link row when there is a URL, otherwise the plain location. */
function callRow(c: V6Context, note: string) {
  if (c.joinUrl && c.joinDisplay) {
    return {
      label: "Call link",
      html: `${link(c.joinUrl, c.joinDisplay, S.S63)}<br><span style="${S.S64}">${esc(note)}</span>`,
    };
  }
  return c.locationText ? { label: "Where", html: esc(c.locationText) } : null;
}

// ---------------------------------------------------------------------------------------------------
// 1. Confirmation (attendee, on booking)
// ---------------------------------------------------------------------------------------------------
export function renderConfirmation(input: V6Input): V6Rendered {
  const c = ctxOf(input);
  const when = `${c.leaf.weekday.slice(0, 3)} ${c.leaf.day} ${c.leaf.month}, ${c.time.start} ${c.zoneShort}`;
  const subject = SUBJECTS.confirmation({ when });

  const brandRow = { label: "Brand", html: esc(sentence([c.intake.brand, c.intake.category])) };
  const rows = [
    ...(c.intake.brand ? [brandRow] : []),
    ...(c.intake.website
      ? [
          {
            label: "Website",
            html: link(withProtocol(c.intake.website), stripProtocol(c.intake.website), S.S63),
          },
        ]
      : []),
    ...(c.intake.country ? [{ label: "Country", html: esc(c.intake.country) }] : []),
    ...(callRow(c, "I send it again 1 hour before.") ? [callRow(c, "I send it again 1 hour before.")!] : []),
  ];
  const first = rows[0] ? rows : [{ label: "Booking", html: esc(c.reference) }];

  const moveSentence =
    c.rescheduleUrl || c.cancelUrl
      ? `Need to move it? ${c.rescheduleUrl ? link(c.rescheduleUrl, "Reschedule", S.S68) : ""}${c.rescheduleUrl && c.cancelUrl ? " or " : ""}${c.cancelUrl ? link(c.cancelUrl, "cancel", S.S68) : ""}${c.cutoffText ? ` by ${esc(c.cutoffText)}, so the slot can go to someone else` : ""}.`
      : "";

  const brand = c.brandShort;
  const body = [
    paragraph(S.S16, `${esc(c.first)}, you are booked.`),
    paragraph(
      S.S17,
      `${c.durationMinutes} minutes with me, ${esc(HOST.firstName)}${esc(c.placePhrase)}. A brand strategy conversation, not a design review.`
    ),
    spacer.s22,
    whenBlock({
      ...c.leaf,
      time: c.time.start,
      line1: `to ${c.time.end}, ${c.zoneLabel}`,
      line2: `${c.hostLineText}. ${cap(c.fromNowText)}.`.replace(/^(\d)/, "$1"),
    }),
    spacer.s22,
    primaryButton(c.gcalUrl, "Add to Google Calendar"),
    paragraph(S.S31, "Outlook or Apple Calendar? Open the invite.ics attached to this email."),
    spacer.s26,
    paragraph(S.S33, "What we cover"),
    spacer.s12,
    cardGrid([
      {
        title: `Where ${brand} sits`,
        text: "The category as a buyer sees it, and which brands you get grouped with.",
      },
      { title: "Who it is for", text: "The customer worth building around, and the one to stop chasing." },
      { title: "Why you, not them", text: `What makes ${brand} hard to swap out. Or what makes it easy.` },
      { title: "What has to be true", text: "The state of the brand in 12 months, in your words." },
    ]),
    spacer.s20,
    splitBar(),
    paragraph(
      S.S48,
      "No pitch and no slides. Nothing gets designed until the brand has something to stand for."
    ),
  ].join("");

  const stub = [
    paragraph(S.S57, "Check what you told me"),
    spacer.s6,
    keyValueRows(first),
    paragraph(S.S65, "Anything wrong? Reply and I will correct it."),
    spacer.s14,
    moveSentence ? paragraph(S.S67, moveSentence) : "",
    spacer.s20,
    bookingStripWithLink(c.reference, c.bookingUrl),
  ].join("");

  const fragment =
    preheader(PREHEADERS.confirmation) +
    frame(
      header("BOOKING CONFIRMED") +
        tracker(0) +
        bodyRow(body) +
        tear() +
        stubRow(stub) +
        footer(pageNote(BOOKING_HOST()))
    );
  return { subject, html: emailDocument(subject, fragment) };
}

// ---------------------------------------------------------------------------------------------------
// 2. New-booking alert (host, on booking)
// ---------------------------------------------------------------------------------------------------
const inWhen = (ms: number) => {
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `In ${d} day${d === 1 ? "" : "s"}.`;
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `In ${h} hour${h === 1 ? "" : "s"}.`;
  return "Starting now.";
};

export function renderHostAlert(input: V6Input): V6Rendered {
  // The alert reads in the host's clock and shows the attendee's clock beside it, so context is built
  // in the attendee's zone and the host's fields are used for "Your time".
  const c = ctxOf({ ...input, timeZone: input.calEvent.attendees[0]?.timeZone ?? input.timeZone });
  const i = c.intake;
  const subject = SUBJECTS.hostAlert({
    name: c.attendeeName,
    brand: i.brand,
    country: i.country,
    when: `${c.host.shortDayTime.replace(/^(\w{3}) /, "$1 ").replace(/, /, ", ")} ${c.host.zoneAbbr}`.replace(
      /^(\w{3} \d+ \w{3}), /,
      "$1, "
    ),
  });
  const who = sentence([c.attendeeName, i.country]) + ".";
  const heroLine = i.category ? `${who} ${cap(i.category)}.` : who;

  const buttons = `<table ${T0} width="100%" style="${S.S2}"><tr>${
    i.website
      ? `<td width="58%" valign="top">${primaryButton(withProtocol(i.website), `Open ${stripProtocol(i.website)}`).replace(S.S30, S.S88)}</td><td width="10" style="${S.S89}">&nbsp;</td><td valign="top">`
      : `<td valign="top">`
  }<table ${T0} width="100%" style="${S.S28}"><tr><td align="center" bgcolor="#161310" style="${S.S90}">${link(`mailto:${c.attendeeEmail}`, `Email ${c.first}`, S.S91)}</td></tr></table></td></tr></table>`;

  const hero = `<tr><td bgcolor="#161310" style="${S.S82}">${paragraph(S.S83, "Brand strategy call booked")}${paragraph(S.S84, esc(i.brand ?? c.attendeeName))}${paragraph(S.S85, esc(heroLine))}${paragraph(S.S86, link(`mailto:${c.attendeeEmail}`, c.attendeeEmail, S.S87))}${spacer.s20}${buttons}</td></tr>`;

  const times = `<table ${T0} width="100%" style="${S.S2}"><tr><td width="50%" valign="top" style="${S.S92}">${paragraph(S.S93, "Your time")}${paragraph(S.S94, esc(c.host.shortDayTime))}${paragraph(S.S27, esc(`${c.host.zoneAbbr}. ${c.durationMinutes} min${c.placePhrase ? ` ${c.placePhrase.replace(/^, /, "")}` : ""}.`))}</td><td width="50%" valign="top" style="${S.S95}">${paragraph(S.S93, `${esc(c.first)}'s time`)}${paragraph(S.S94, esc(c.time.start))}${paragraph(S.S27, esc(`${c.attendeeCity} (${c.attendeeZoneAbbr}). ${inWhen(c.msUntilStart)}`))}</td></tr></table>`;

  const why = i.note
    ? `${spacer.s22}<table ${T0} width="100%" style="${S.S2}"><tr><td style="${S.S96}">${paragraph(S.S93, "Why they booked")}${paragraph(S.S97, esc(i.note))}</td></tr></table>`
    : "";

  const prepText = [
    `PREP: ${c.attendeeName}, ${i.brand ?? "no brand given"}${i.website ? ` (${stripProtocol(i.website)})` : ""}${i.category ? `, ${i.category}` : ""}${i.country ? `, ${i.country}` : ""}.`,
    `Brand strategy call ${c.host.shortDayTime.replace(/, .*$/, "")}, ${c.host.time12} ${c.host.zoneAbbr}.`,
    i.note ? `Their words: "${i.note}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = `<tr><td bgcolor="#FBF9F3" style="${S.S15}">${times}${why}${spacer.s26}${paragraph(S.S33, `Before ${esc(c.host.weekdayTime)}`)}${spacer.s12}${cardGrid(
    [
      {
        number: 1,
        title: "Read the site",
        text: "What does the brand claim, and what does it leave unsaid?",
      },
      {
        number: 2,
        title: "Name the three",
        text: "Who does a buyer group them with? Bring the names to the call.",
      },
      {
        number: 3,
        title: "Find who decides",
        text: "Positioning gets signed off by a founder or by nobody.",
      },
    ]
  )}${spacer.s14}<table ${T0} width="100%" style="${S.S2}"><tr><td bgcolor="#EDEAE2" style="${S.S100}">${esc(prepText)}</td></tr></table></td></tr>`;

  const stub = `<tr><td bgcolor="#FBF9F3" style="${S.S56}">${keyValueRows([
    ...(c.joinUrl && c.joinDisplay
      ? [{ label: "Call link", html: link(c.joinUrl, c.joinDisplay, S.S63) }]
      : c.locationText
        ? [{ label: "Where", html: esc(c.locationText) }]
        : []),
    { label: "Booking", html: c.bookingUrl ? link(c.bookingUrl, "Open booking", S.S63) : esc(c.reference) },
    {
      label: "Change it",
      html: `${c.rescheduleUrl ? link(c.rescheduleUrl, "Reschedule", S.S63) : ""}${c.rescheduleUrl && c.cancelUrl ? "&nbsp;&nbsp;&nbsp;" : ""}${c.cancelUrl ? link(c.cancelUrl, "Cancel", S.S63) : ""}`,
    },
  ])}${spacer.s18}${bookingStrip("LEAD", c.reference)}</td></tr>`;

  const fragment =
    preheader(
      `${c.attendeeName}${i.brand ? `, ${i.brand}` : ""}${i.country ? `, ${i.country}` : ""}. ${c.host.shortDayTime.replace(/, .*$/, "")}, ${c.host.time12} ${c.host.zoneAbbr}.`
    ) +
    frame(
      header("NEW BOOKING") + hero + body + tear() + stub + footer("Internal alert. Only you receive this.")
    );
  return { subject, html: emailDocument(subject, fragment) };
}

// ---------------------------------------------------------------------------------------------------
// 3. 24-hour reminder
// ---------------------------------------------------------------------------------------------------
export function renderReminder24h(input: V6Input): V6Rendered {
  const c = ctxOf(input);
  const subject = SUBJECTS.reminder24h({ time: c.time.start });
  const day = c.relativeDay === "today" || c.relativeDay === "tomorrow" ? cap(c.relativeDay) : c.relativeDay;
  const place = c.placePhrase.replace(/^, /, "");

  const move = c.rescheduleUrl
    ? `${spacer.s20}<table ${T0} width="100%" style="${S.S2}"><tr><td style="${S.S111}"><table ${T0} width="100%" style="${S.S2}"><tr><td valign="middle" style="${S.S112}">${paragraph(S.S113, "Time no longer works?")}${paragraph(S.S27, "Move it today so the slot can go to someone else.")}</td><td width="128" valign="middle" style="${S.S114}"><table ${T0} width="100%" style="${S.S28}"><tr><td align="center" bgcolor="#FBF9F3" style="${S.S115}">${link(c.rescheduleUrl, "Reschedule", S.S116)}</td></tr></table></td></tr></table></td></tr></table>`
    : "";

  const body = [
    paragraph(S.S104, esc(day)),
    paragraph(S.S105, esc(`${c.time.start}, ${c.leaf.weekday} ${c.leaf.day} ${leafMonthLong(c)}`)),
    paragraph(
      S.S106,
      esc(`${c.zoneLabel}. ${c.durationMinutes} minutes${place ? ` ${place}` : ""} with ${HOST.firstName}.`)
    ),
    spacer.s24,
    paragraph(S.S33, `${esc(c.first)}, bring three things`),
    spacer.s12,
    cardGrid([
      {
        number: 1,
        dark: true,
        title: "The three you lose to",
        text: "Names, not categories. We look at where a buyer puts you.",
      },
      {
        number: 2,
        title: "One number",
        text: "What this has to move: price held, repeat rate, the listing.",
      },
      {
        number: 3,
        title: "Whoever owns the brand",
        text: "If that is not you alone, forward this so they can join.",
      },
    ]),
    move,
  ].join("");

  const rows = [
    ...(callRow(c, "Arrives again 1 hour before, with one button.")
      ? [callRow(c, "Arrives again 1 hour before, with one button.")!]
      : []),
    { label: "Not in your calendar?", html: link(c.gcalUrl, "Add to Google Calendar", S.S63) },
    {
      label: "Booking",
      html: `${esc(c.reference)}.${c.cancelUrl ? ` ${link(c.cancelUrl, "Cancel", S.S63)}` : ""}`,
    },
  ];

  const fragment =
    preheader(PREHEADERS.reminder24h({ time: c.time.start, zone: c.zoneShort })) +
    frame(
      header("YOUR CALL IS TOMORROW") +
        tracker(1).replace(/^/, "") +
        bodyRow(body) +
        tear() +
        stubRow(keyValueRows(rows)) +
        footer(pageNote(BOOKING_HOST()))
    );
  return { subject, html: emailDocument(subject, fragment) };
}

const leafMonthLong = (c: V6Context) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: c.tz, month: "long" }).format(new Date(c.startIso));

// ---------------------------------------------------------------------------------------------------
// 4. 1-hour reminder
// ---------------------------------------------------------------------------------------------------
const two = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/** Static countdown cells. PR 4 swaps this for the signed GIF, keeping these lines as the fallback. */
export function countdownText(msUntilStart: number): string {
  const total = Math.max(0, Math.floor(msUntilStart / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const cell = (v: number, label: string) =>
    `<td align="center" valign="top" width="30%"><div style="${S.S120}">${two(v)}</div><div style="${S.S121}">${label}</div></td>`;
  const colon = `<td align="center" valign="top" width="5%" style="${S.S122}">:</td>`;
  return `<table ${T0} width="100%" data-slot="countdown-gif" style="${S.S2}"><tr>${cell(h, "hours")}${colon}${cell(m, "minutes")}${colon}${cell(s, "seconds")}</tr></table>`;
}

export function renderReminder1h(input: V6Input): V6Rendered {
  const c = ctxOf(input);
  const subject = SUBJECTS.reminder1h();
  const day = relativeDayForLine(c);

  const hero = `<tr><td bgcolor="#FF006C" style="${S.S117}">${paragraph(S.S118, `${esc(c.first)}, your call starts in`)}${spacer.s10}${countdownText(c.msUntilStart)}${paragraph(S.S123, esc(`${c.time.start} ${c.zoneShort}, ${day}`))}${spacer.s20}${
    c.joinUrl
      ? `<table ${T0} width="100%" style="${S.S28}"><tr><td align="center" bgcolor="#FFFFFF" style="${S.S124}">${link(c.joinUrl, "Join the call", S.S125)}</td></tr></table>`
      : ""
  }</td></tr>`;

  const paste =
    c.joinUrl && c.joinDisplay
      ? `${paragraph(S.S127, "Button not opening? Paste this into your browser:")}${paragraph(S.S128, link(c.joinUrl, c.joinDisplay, S.S68))}${spacer.s16}`
      : "";
  const prep = `<tr><td bgcolor="#FBF9F3" style="${S.S126}">${paste}${paragraph(S.S130, "Have the three brands you lose to in front of you. I will be on the call 2 minutes early.")}</td></tr>`;

  const stub = `${paragraph(
    S.S67,
    `Cannot make it after all? Reply now so I am not left waiting${c.rescheduleUrl || c.cancelUrl ? ", then " : "."}${c.rescheduleUrl ? link(c.rescheduleUrl, "reschedule", S.S63) : ""}${c.rescheduleUrl && c.cancelUrl ? " or " : ""}${c.cancelUrl ? link(c.cancelUrl, "cancel", S.S63) : ""}${c.rescheduleUrl || c.cancelUrl ? "." : ""}`.replace(
      /^(.*)$/,
      (m) => m
    )
  )}${paragraph(S.S131, `Booking ${esc(c.reference)}`)}`;

  const fragment =
    preheader(PREHEADERS.reminder1h({ time: c.time.start, zone: c.zoneShort })) +
    frame(
      header("STARTING IN 1 HOUR") +
        tracker(2) +
        hero +
        prep +
        tear() +
        stubRow(stub) +
        footer(pageNote(BOOKING_HOST()))
    );
  return { subject, html: emailDocument(subject, fragment) };
}

const relativeDayForLine = (c: V6Context) => c.relativeDay;

// ---------------------------------------------------------------------------------------------------
// 5. Follow-up after the call, and the no-show variant (derived: the design only describes it in words)
// ---------------------------------------------------------------------------------------------------
const NBSP = "&nbsp;";

/** Torn paper edge between the letter and the stub. */
const tornEdge = () =>
  `<tr><td bgcolor="#FBF9F3" style="${S.S135}"><table ${T0} width="100%" style="${S.S35}"><tr>${`<td style="${S.S136}"><div style="${S.S137}">${NBSP}</div></td>`.repeat(26)}</tr></table></td></tr>`;

function callStub(c: V6Context, badge: string) {
  const range = `${c.leaf.weekday.slice(0, 3)} ${c.leaf.day} ${c.leaf.month} ${dayjs(c.startIso).tz(c.tz).format("YYYY")}, ${c.time.start.replace(/(am|pm)$/, "")} to ${c.time.end} ${c.attendeeZoneAbbr}`;
  const left = `<td valign="top">${paragraph(S.S138, `Brand strategy call with ${esc(HOST.firstName)}`)}${paragraph(S.S27, esc(range))}${spacer.s14}${bookingStrip("BOOKING", c.reference)}</td>`;
  const right = `<td width="112" valign="top" style="${S.S139}"><table ${T0} align="right" style="${S.S140}"><tr><td style="${S.S141}">${esc(badge)}</td></tr></table></td>`;
  return `<tr><td bgcolor="#FBF9F3" style="${S.S56}"><table ${T0} width="100%" style="${S.S2}"><tr>${left}${right}</tr></table></td></tr>`;
}

/** Summary is due 2 working days after the call and the reply-by is 1 working day after, in the host's zone. */
export function followUpDates(endIso: string, hostTz: string) {
  return {
    due: addWorkingDays(endIso, 2, hostTz),
    replyBy: addWorkingDays(endIso, 1, hostTz),
  };
}

const longDate = (d: dayjs.Dayjs) => d.format("dddd D MMMM");

function followUpFrame(
  c: V6Context,
  status: string,
  tracker_: 2 | 3,
  body: string,
  badge: string,
  note: string
) {
  return frame(
    header(status) + tracker(tracker_) + bodyRow(body) + tornEdge() + callStub(c, badge) + footer(note)
  );
}

export function renderFollowUp(input: V6Input): V6Rendered {
  const c = ctxOf(input);
  const subject = SUBJECTS.followUp();
  const { due, replyBy } = followUpDates(c.endIso, c.hostTz);
  const dueText = longDate(due.tz(c.tz));
  const replyText = longDate(replyBy.tz(c.tz));

  const cards = cardGrid([
    { number: 1, title: "What I heard", text: "Your situation in your own words, so you can correct me." },
    {
      number: 2,
      title: "Where the brand sits",
      text: "The position you hold today, and the gap to the one you want.",
    },
    { number: 3, title: "Whether I am the fit", text: "If I am not, I will say so and point you elsewhere." },
  ]);
  const ask = `<table ${T0} width="100%" style="${S.S2}"><tr><td bgcolor="#FFE3EE" style="${S.S133}">${paragraph(S.S113, "One ask before then")}${paragraph(S.S134, esc(`If something came to mind after we hung up, reply by ${replyText}. It goes into the page.`))}</td></tr></table>`;
  const dueLeaf = dayjs(due.tz(c.tz));
  const when = `<table ${T0} width="100%" style="${S.S2}"><tr><td width="84" valign="top" style="${S.S19}">${dateLeafOf(dueLeaf)}</td><td width="18" style="${S.S24}">${NBSP}</td><td valign="top">${paragraph(S.S132, esc(`By ${dueLeaf.format("dddd")} you get my read on the brand.`))}${paragraph(S.S106, esc(`One page, in your inbox before 6:00pm ${c.zoneShort}.`))}</td></tr></table>`;

  const body = `${paragraph(S.S16, esc(`${c.first}, here is what happens next.`))}${spacer.s20}${when}${spacer.s18}${cards}${spacer.s18}${ask}`;
  const callDay = dayjs(c.startIso).tz(c.tz).format("dddd D MMMM");
  const fragment =
    preheader(PREHEADERS.followUp({ dueDate: dueText })) +
    followUpFrame(
      c,
      "AFTER OUR CALL",
      3,
      body,
      "CALL HELD",
      `You are getting this because we spoke on ${callDay}.`
    );
  return { subject, html: emailDocument(subject, fragment) };
}

function dateLeafOf(d: dayjs.Dayjs) {
  return leaf(d.format("MMM"), d.format("D"), d.format("dddd"));
}

export function renderNoShow(input: V6Input): V6Rendered {
  const c = ctxOf(input);
  const subject = SUBJECTS.noShow();
  const rebook =
    c.rescheduleUrl ??
    (input.calEvent.organizer.username
      ? `${input.calEvent.bookerUrl ?? WEBAPP_URL}/${input.calEvent.organizer.username}`
      : (c.bookingUrl ?? WEBAPP_URL));
  const callDay = dayjs(c.startIso).tz(c.tz).format("dddd D MMMM");
  const body = `${paragraph(S.S16, esc(`${c.first}, we missed each other today.`))}${spacer.s20}${paragraph(S.S17, esc(`I was on the call at ${c.time.start} ${c.zoneShort} and did not see you. It happens. Nothing to apologise for, and nothing you need to prepare.`))}${spacer.s22}${primaryButton(rebook, "Pick a new time")}${paragraph(S.S31, "It takes under a minute. The same 30 minutes, whenever suits you.")}`;
  const fragment =
    preheader("No harm done. Pick a new time whenever suits.") +
    followUpFrame(
      c,
      "MISSED CALL",
      2,
      body,
      "CALL MISSED",
      `You are getting this because you booked a call for ${callDay}.`
    );
  return { subject, html: emailDocument(subject, fragment) };
}
