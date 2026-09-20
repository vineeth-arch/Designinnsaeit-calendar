// Fixed, brand-specific copy from the v6 design. English only and first person on purpose: it is bespoke
// studio voice, so it lives here rather than in the i18n json. If anyone else ever takes these calls,
// turn HOST into per-user data (design decision 5).
export const HOST = {
  firstName: "Vineeth",
  studio: "Design Innsæit",
  city: "Mumbai",
  tagline: "Brand Strategy & Packaging Design Studio",
} as const;

export const SUBJECTS = {
  confirmation: (p: { when: string }) => `Booked: brand strategy call, ${p.when}`,
  hostAlert: (p: { name: string; brand: string | null; country: string | null; when: string }) =>
    `New booking: ${p.name}${p.brand ? `, ${p.brand}` : ""}${p.country ? ` (${p.country})` : ""}. ${p.when}`,
  reminder24h: (p: { time: string }) => `Tomorrow, ${p.time}: three things to bring`,
  reminder1h: () => "Starting in 1 hour: your link to join",
  followUp: () => "What happens next, and by when",
  noShow: () => "We missed each other today",
  summary: () => "What I heard, and where I think the brand actually sits",
} as const;

export const PREHEADERS = {
  confirmation: "Add it to your calendar. Here is what the 30 minutes cover.",
  reminder24h: (p: { time: string; zone: string }) => `${p.time} ${p.zone}. Three things to have ready.`,
  reminder1h: (p: { time: string; zone: string }) => `${p.time} ${p.zone}. One button to join.`,
  followUp: (p: { dueDate: string }) => `My read on the brand, by ${p.dueDate}.`,
  summary: (p: { replyBy: string }) => `Correct anything I got wrong, then pick a time before ${p.replyBy}.`,
} as const;

export const WORDMARK_PATH = "/emails/wordmark-mint.png";
