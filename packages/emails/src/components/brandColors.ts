// Design Innsæit email palette. Kept here so every transactional email can share
// one source of truth for the brand header/accent without re-hardcoding hexes.
// Bodies stay on a light background with dark text for deliverability/readability;
// the brand shows in the header band, accents (CTA/divider/links) and footer.
export const EMAIL_BRAND = {
  mint: "#00FFCF",
  indigo: "#2C0098",
  ink: "#0D0035",
  text: "#EDEAFB",
  // Email-safe neutrals reused from the existing layout.
  pageBg: "#F3F4F6",
  cardBg: "#FFFFFF",
  bodyText: "#101010",
} as const;

export const EMAIL_BRAND_NAME = "Design Innsæit";
