import type { IntegrationProbe } from "@calcom/features/google-contacts/lib/googleStatus";
import {
  getGoogleAccessToken,
  probeCalendar,
  probeContacts,
} from "@calcom/features/google-contacts/lib/googleStatus";
import { z } from "zod";
import type { IntegrationStatus } from "./status";

const tokenSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expiry_date: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});

export type GoogleCredentialRow = { id: number; type: string; invalid: boolean | null; key: unknown };

export type GoogleStatuses = {
  calendar: IntegrationStatus;
  contacts: IntegrationStatus;
  meet: IntegrationStatus;
};

const CONNECT_FIX = { fixHref: "/apps/google-calendar", fixLabelKey: "connect" };
const RECONNECT_FIX = { fixHref: "/apps/installed/calendar", fixLabelKey: "reconnect" };

const contactsStatus = (probe: IntegrationProbe): IntegrationStatus => {
  switch (probe.result) {
    case "ok":
      return { state: "ok", reasonKey: "status_contacts_ok", reasonParams: { count: probe.count ?? 0 } };
    case "missing_scope":
      return { state: "warn", reasonKey: "status_contacts_missing_scope", ...RECONNECT_FIX };
    case "api_disabled":
      return {
        state: "warn",
        reasonKey: "status_contacts_api_disabled",
        fixHref: "https://console.cloud.google.com/apis/library/people.googleapis.com",
        fixLabelKey: "open_google_cloud",
      };
    case "error":
      return {
        state: "warn",
        reasonKey: "status_contacts_error",
        reasonParams: { detail: probe.detail ?? "unknown" },
      };
  }
};

export async function getGoogleStatuses(credentials: GoogleCredentialRow[]): Promise<GoogleStatuses> {
  const hasMeetApp = credentials.some((c) => c.type === "google_video");
  const calendarCreds = credentials.filter((c) => c.type === "google_calendar");
  const meetOff: IntegrationStatus = hasMeetApp
    ? { state: "off", reasonKey: "status_meet_needs_calendar" }
    : {
        state: "off",
        reasonKey: "status_meet_not_installed",
        fixHref: "/apps/google-meet",
        fixLabelKey: "connect",
      };

  try {
    if (calendarCreds.length === 0) {
      const off: IntegrationStatus = {
        state: "off",
        reasonKey: "status_google_not_connected",
        ...CONNECT_FIX,
      };
      return { calendar: off, contacts: off, meet: hasMeetApp ? meetOff : off };
    }

    const reconnect: IntegrationStatus = {
      state: "warn",
      reasonKey: "status_google_reconnect",
      ...RECONNECT_FIX,
    };
    const needsCalendar: IntegrationStatus = { state: "warn", reasonKey: "status_meet_needs_calendar" };

    // Use the first valid credential whose token still refreshes; an old revoked row must not hide a working one.
    for (const credential of calendarCreds.filter((c) => !c.invalid)) {
      const parsed = tokenSchema.safeParse(credential.key);
      if (!parsed.success) continue;
      let token: string | null;
      try {
        token = await getGoogleAccessToken(parsed.data);
      } catch {
        continue;
      }
      if (!token) continue;

      const [calendarProbe, contactsProbe] = await Promise.all([
        probeCalendar(token),
        probeContacts(token, parsed.data.scope),
      ]);
      const calendarOk = calendarProbe.result === "ok";
      return {
        calendar: calendarOk
          ? { state: "ok", reasonKey: "status_calendar_ok" }
          : {
              state: "warn",
              reasonKey: "status_calendar_error",
              reasonParams: { detail: calendarProbe.detail ?? "unknown" },
            },
        contacts: contactsStatus(contactsProbe),
        meet: !calendarOk
          ? needsCalendar
          : hasMeetApp
            ? { state: "ok", reasonKey: "status_meet_ok" }
            : meetOff,
      };
    }

    return { calendar: reconnect, contacts: reconnect, meet: needsCalendar };
  } catch {
    const failed: IntegrationStatus = { state: "warn", reasonKey: "status_check_failed" };
    return { calendar: failed, contacts: failed, meet: failed };
  }
}
