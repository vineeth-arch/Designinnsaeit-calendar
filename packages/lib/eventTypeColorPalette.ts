/**
 * Curated event-type color palette, harmonized with the Design Innsæit brand.
 * Used both as the color-picker swatches and (via {@link nearestPaletteColor})
 * to snap any stored hex to a disciplined brand color at render time, so the
 * color-blocking stays on-brand without migrating existing data.
 */
export const EVENT_TYPE_COLOR_PALETTE = [
  "#3A14BE", // indigo tint
  "#00C9A3", // teal deep
  "#FF006C", // pink (brand accent)
  "#E8A33D", // amber
  "#7A3E9D", // plum
  "#4A6B8A", // slate
  "#C16E4A", // clay
  "#11003B", // ink
] as const;

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  let h = match[1];
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Snap an arbitrary hex color to the nearest color in {@link EVENT_TYPE_COLOR_PALETTE}
 * (squared RGB distance). Returns undefined for empty input and leaves
 * unparseable values untouched.
 */
export function nearestPaletteColor(hex?: string | null): string | undefined {
  if (!hex) return undefined;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  let best: string = EVENT_TYPE_COLOR_PALETTE[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const candidate of EVENT_TYPE_COLOR_PALETTE) {
    const crgb = hexToRgb(candidate);
    if (!crgb) continue;
    const dist =
      (rgb[0] - crgb[0]) ** 2 + (rgb[1] - crgb[1]) ** 2 + (rgb[2] - crgb[2]) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}
