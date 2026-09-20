export type FollowUpVariant = "followUp" | "noShow";

// The host missing the call makes "here is what happens next" wrong, so nothing is sent. The flag is read
// at send time, so a no-show marked later cannot retract an email that already went out.
export function pickFollowUpVariant(args: {
  noShowHost: boolean | null | undefined;
  attendeeNoShow: boolean | null | undefined;
}): FollowUpVariant | null {
  if (args.noShowHost) return null;
  return args.attendeeNoShow ? "noShow" : "followUp";
}
