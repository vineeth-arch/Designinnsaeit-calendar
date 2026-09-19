import type { IconName } from "@calcom/ui/components/icon";

export type FlagVerdict = "recommended" | "situational" | "experiment" | "not_needed" | "inactive";

export type FlagGuidance = {
  verdict: FlagVerdict;
  summary: string;
  benefit: string;
  note?: string;
  danger?: boolean;
};

type BadgeVariant = "green" | "orange" | "blue" | "gray";

// Traffic-light signals: colour is never the only cue, each verdict also carries an icon and a label key.
export const VERDICT_STYLE: Record<
  FlagVerdict,
  { variant: BadgeVariant; icon: IconName; labelKey: string; dotClass: string }
> = {
  recommended: {
    variant: "green",
    icon: "circle-check",
    labelKey: "flag_verdict_recommended",
    dotClass: "bg-green-500",
  },
  situational: {
    variant: "orange",
    icon: "clock",
    labelKey: "flag_verdict_situational",
    dotClass: "bg-orange-400",
  },
  experiment: {
    variant: "blue",
    icon: "sparkles",
    labelKey: "flag_verdict_experiment",
    dotClass: "bg-blue-500",
  },
  not_needed: { variant: "gray", icon: "ban", labelKey: "flag_verdict_not_needed", dotClass: "bg-gray-400" },
  inactive: { variant: "gray", icon: "info", labelKey: "flag_verdict_inactive", dotClass: "bg-gray-300" },
};

const INACTIVE_NOTE = "No code in this build reads this flag, so toggling it changes nothing.";

const inactive = (summary: string, benefit: string): FlagGuidance => ({
  verdict: "inactive",
  summary,
  benefit,
  note: INACTIVE_NOTE,
});

// Verdicts were derived by searching this repo for code that reads each slug. "inactive" means zero readers.
export const FLAG_GUIDANCE: Record<string, FlagGuidance> = {
  webhooks: {
    verdict: "recommended",
    summary: "Sends an HTTP call to your endpoint when a booking is created, rescheduled or cancelled.",
    benefit: "Keeps external tools such as Handshake in sync with bookings automatically.",
    note: "Keep on while any webhook subscriber depends on it.",
  },
  "disable-signup": {
    verdict: "recommended",
    summary: "Blocks the public sign-up page. Invite links that carry a token still work.",
    benefit: "Stops strangers from creating accounts on a private instance.",
    note: "Create your own accounts first, then turn this on.",
  },
  "organizer-request-email-v2": {
    verdict: "situational",
    summary: "Confirmation-request email to the organizer includes a built-in reject form.",
    benefit: "Approve or reject a booking straight from the email.",
    note: "Only affects event types that require confirmation.",
  },
  "email-verification": {
    verdict: "situational",
    summary: "New users and changed email addresses must be verified by a code.",
    benefit: "Prevents fake or mistyped email addresses.",
    note: "Needs working outgoing email. Less useful once sign-up is disabled.",
  },
  "calendar-cache": {
    verdict: "situational",
    summary: "Caches third-party calendar availability instead of asking the provider every time.",
    benefit: "Faster availability loading and fewer calendar API calls.",
    note: "Only helps if users connect Google or Outlook calendars.",
  },
  "calendar-subscription-cache": {
    verdict: "situational",
    summary: "Keeps the calendar cache fresh through provider push notifications.",
    benefit: "More up-to-date availability than time-based caching alone.",
    note: "Needs a public webhook URL and a scheduled job.",
  },
  "calendar-subscription-sync": {
    verdict: "situational",
    summary: "Syncs external calendar changes through provider push subscriptions.",
    benefit: "Busy times update quickly when someone edits their calendar.",
    note: "Needs a public webhook URL and a scheduled job.",
  },
  "restriction-schedule": {
    verdict: "situational",
    summary: "Lets an event type be bookable only inside its own restriction schedule.",
    benefit: "Offer a service only on set days, for example Tuesday and Thursday.",
  },
  "booking-audit": {
    verdict: "situational",
    summary: "Records who changed what on each booking and shows the history on the bookings page.",
    benefit: "A trail for disputes and debugging reschedules.",
  },
  "bookings-v3": {
    verdict: "experiment",
    summary: "Redesigned bookings list.",
    benefit: "Preview the new layout before it becomes the default.",
    note: "Try it, and switch back if anything looks off.",
  },
  "onboarding-v3": {
    verdict: "experiment",
    summary: "Redesigned onboarding flow for new users.",
    benefit: "Smoother first-run experience.",
    note: "Only new sign-ups see it, so it matters little with sign-up disabled.",
  },
  emails: {
    verdict: "not_needed",
    summary: "Kill switch. When ON, no email of any kind is sent.",
    benefit: "An emergency brake if emails misbehave or you are testing.",
    note: "Leave OFF in production, otherwise booking confirmations stop.",
    danger: true,
  },
  "signup-watchlist-review": {
    verdict: "not_needed",
    summary: "Adds new sign-ups to a watchlist for manual review.",
    benefit: "Screening when sign-up is open to the public.",
    note: "Irrelevant while sign-up is disabled.",
  },
  "booker-botid": {
    verdict: "not_needed",
    summary: "Bot protection on booking endpoints using Vercel BotID.",
    benefit: "Blocks automated booking spam on Vercel.",
    note: "Vercel-only, and this instance runs on Railway.",
  },
  "sink-shortener": {
    verdict: "not_needed",
    summary: "Uses a Sink URL shortener for links inside SMS messages.",
    benefit: "Shorter SMS links.",
    note: "Needs a Sink deployment and SMS sending.",
  },
  "salesforce-crm-tasker": {
    verdict: "not_needed",
    summary: "Creates Salesforce CRM events through a background task queue.",
    benefit: "Only relevant to Salesforce users.",
  },
  workflows: inactive("Automated reminders and follow-ups around bookings.", "Would reduce no-shows."),
  "workflow-smtp-emails": inactive(
    "Sends workflow emails through SMTP instead of SendGrid.",
    "Would avoid needing SendGrid."
  ),
  insights: inactive("Analytics dashboard for bookings.", "Would show booking volume and cancellations."),
  teams: inactive(
    "Team booking pages and round-robin scheduling.",
    "Would let several people share event types."
  ),
  organizations: inactive("Multi-team organizations.", "Enterprise structure."),
  attributes: inactive("Custom attributes for users and teams.", "Enterprise routing rules."),
  pbac: inactive("Permission-based access control roles.", "Fine-grained team permissions."),
  "active-user-billing": inactive("Active-user billing for teams.", "Cal.com cloud billing."),
  "hwm-seating": inactive("High-water-mark seat billing.", "Cal.com cloud billing."),
  "monthly-proration": inactive("Monthly seat proration for annual plans.", "Cal.com cloud billing."),
  "tiered-support-chat": inactive("Tiered support chat by plan.", "Cal.com cloud support."),
  "cal-ai-voice-agents": inactive("AI voice agents that place phone calls.", "Cal.com cloud add-on."),
  "booking-calendar-view": inactive("Calendar view for bookings.", "Alternative to the list view."),
  "cal-video-log-in-overlay": inactive("Log-in overlay on Cal Video pages.", "Cal.com cloud feature."),
  "calendar-cache-serve": inactive(
    "Chooses who is served from the calendar cache.",
    "Fine control of caching."
  ),
  "team-booking-page-cache": inactive("Caches team booking pages.", "Faster team pages."),
  "delegation-credential": inactive("Google Workspace delegated credentials.", "Enterprise calendar access."),
  "domain-wide-delegation": inactive(
    "Google Workspace domain-wide delegation.",
    "Enterprise calendar access."
  ),
  "google-workspace-directory": inactive(
    "Syncs users and groups from Google Workspace.",
    "Enterprise directory sync."
  ),
  "sidebar-tips": inactive("Tips section in the sidebar.", "Onboarding hints."),
  "use-api-v2-for-team-slots": inactive("Fetches team slots through API v2.", "Internal migration switch."),
};

export const getFlagGuidance = (slug: string): FlagGuidance | undefined => FLAG_GUIDANCE[slug];
