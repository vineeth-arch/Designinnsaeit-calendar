import { describe, expect, it } from "vitest";
import { pickFollowUpVariant } from "./followUpVariant";

describe("pickFollowUpVariant", () => {
  it("sends the follow-up to attendees who showed up", () => {
    expect(pickFollowUpVariant({ noShowHost: false, attendeeNoShow: false })).toBe("followUp");
    expect(pickFollowUpVariant({ noShowHost: null, attendeeNoShow: undefined })).toBe("followUp");
  });
  it("sends the no-show email to flagged attendees", () => {
    expect(pickFollowUpVariant({ noShowHost: false, attendeeNoShow: true })).toBe("noShow");
  });
  it("sends nothing when the host missed the call", () => {
    expect(pickFollowUpVariant({ noShowHost: true, attendeeNoShow: false })).toBeNull();
    expect(pickFollowUpVariant({ noShowHost: true, attendeeNoShow: true })).toBeNull();
  });
});
