import sharp from "sharp";
import type { CountdownLayout, CountdownLook } from "./countdownToken";
import { encodeGif } from "./encodeGif";

// Digits are drawn as rounded segments instead of text so the image needs no fonts on the server.
export const GIF_WIDTH = 480;
export const GIF_HEIGHT = 110;
const FRAME_COUNT = 40;
const DIGIT_W = 48;
const DIGIT_H = 84;
const THICK = 12;
const GAP = 10;
// Group centres sit at 1/6, 1/2 and 5/6 of the width so the HTML labels under the image line up.
const CENTRES = [80, 240, 400];

const LOOKS: Record<CountdownLook, { bg: string; ink: string }> = {
  hero: { bg: "#FF006C", ink: "#FFFFFF" },
  paper: { bg: "#FBF9F3", ink: "#161310" },
};

const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

function digit(char: string, x: number, y: number, ink: string): string {
  const on = SEGMENTS[char] ?? "";
  const half = DIGIT_H / 2;
  const rects: Record<string, [number, number, number, number]> = {
    a: [x + THICK / 2 + 1, y, DIGIT_W - THICK - 2, THICK],
    g: [x + THICK / 2 + 1, y + half - THICK / 2, DIGIT_W - THICK - 2, THICK],
    d: [x + THICK / 2 + 1, y + DIGIT_H - THICK, DIGIT_W - THICK - 2, THICK],
    f: [x, y + THICK / 2 + 1, THICK, half - THICK - 2],
    b: [x + DIGIT_W - THICK, y + THICK / 2 + 1, THICK, half - THICK - 2],
    e: [x, y + half + THICK / 2 - 3, THICK, half - THICK - 2],
    c: [x + DIGIT_W - THICK, y + half + THICK / 2 - 3, THICK, half - THICK - 2],
  };
  return Array.from(on)
    .map((s) => {
      const [rx, ry, w, h] = rects[s];
      return `<rect x="${rx}" y="${ry}" width="${w}" height="${h}" rx="${THICK / 2}" fill="${ink}"/>`;
    })
    .join("");
}

export type CountdownParts = [string, string, string];

/** Days:hours:minutes or hours:minutes:seconds, each two digits (days cap at 99). */
export function countdownParts(msLeft: number, layout: CountdownLayout): CountdownParts {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const two = (n: number) => String(Math.min(99, n)).padStart(2, "0");
  if (layout === "dhm") {
    return [
      two(Math.floor(total / 86400)),
      two(Math.floor((total % 86400) / 3600)),
      two(Math.floor((total % 3600) / 60)),
    ];
  }
  return [two(Math.floor(total / 3600)), two(Math.floor((total % 3600) / 60)), two(total % 60)];
}

export function frameSvg(parts: CountdownParts, look: CountdownLook): string {
  const { bg, ink } = LOOKS[look];
  const y = (GIF_HEIGHT - DIGIT_H) / 2;
  const groupW = DIGIT_W * 2 + GAP;
  const body = parts
    .map((part, i) => {
      const x0 = CENTRES[i] - groupW / 2;
      return digit(part[0], x0, y, ink) + digit(part[1], x0 + DIGIT_W + GAP, y, ink);
    })
    .join("");
  const colon = [160, 320]
    .map(
      (cx) =>
        `<circle cx="${cx}" cy="${GIF_HEIGHT / 2 - 14}" r="5" fill="${ink}"/><circle cx="${cx}" cy="${GIF_HEIGHT / 2 + 14}" r="5" fill="${ink}"/>`
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${GIF_WIDTH}" height="${GIF_HEIGHT}"><rect width="100%" height="100%" fill="${bg}"/>${body}${colon}</svg>`;
}

const LEVELS = 8;

const hexToRgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

/** Rasterises the SVG, then maps each pixel to one of 8 blends between background and ink. */
async function frameIndices(svg: string, look: CountdownLook): Promise<Uint8Array> {
  const bg = hexToRgb(LOOKS[look].bg);
  const ink = hexToRgb(LOOKS[look].ink);
  const channel = [0, 1, 2].reduce(
    (best, c) => (Math.abs(ink[c] - bg[c]) > Math.abs(ink[best] - bg[best]) ? c : best),
    0
  );
  const raw = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer();
  const out = new Uint8Array(GIF_WIDTH * GIF_HEIGHT);
  for (let i = 0; i < out.length; i++) {
    const cover = (raw[i * 3 + channel] - bg[channel]) / (ink[channel] - bg[channel]);
    out[i] = Math.max(0, Math.min(LEVELS - 1, Math.round(cover * (LEVELS - 1))));
  }
  return out;
}

const palette = (look: CountdownLook): [number, number, number][] => {
  const bg = hexToRgb(LOOKS[look].bg);
  const ink = hexToRgb(LOOKS[look].ink);
  return Array.from({ length: LEVELS }, (_, i) => {
    const t = i / (LEVELS - 1);
    return [0, 1, 2].map((c) => Math.round(bg[c] + (ink[c] - bg[c]) * t)) as [number, number, number];
  });
};

/**
 * hms plays one second per frame from `now`, then holds the last frame (no loop, so it cannot drift for
 * someone who leaves the email open). dhm changes at most once a minute, so it is a still image.
 */
export async function renderCountdownGif(a: {
  target: number;
  now: number;
  layout: CountdownLayout;
  look: CountdownLook;
}): Promise<Buffer> {
  const count = a.layout === "hms" ? FRAME_COUNT : 1;
  const frames: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(
      await frameIndices(frameSvg(countdownParts(a.target - a.now - i * 1000, a.layout), a.look), a.look)
    );
  }
  return encodeGif({
    width: GIF_WIDTH,
    height: GIF_HEIGHT,
    palette: palette(a.look),
    frames,
    delays: frames.map((_, i) => (i === frames.length - 1 ? 65535 : 100)),
  });
}

// 1x1 transparent GIF: what the route serves when the token is bad or anything fails.
export const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);
