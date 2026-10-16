import { getGoogleAppKeys } from "@calcom/app-store/googlecalendar/lib/getGoogleAppKeys";
import { OAuth2Client } from "googleapis-common";
import { hasContactsScope } from "./contacts";

export type GoogleTokenKey = {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
};

export type IntegrationProbe = {
  result: "ok" | "missing_scope" | "api_disabled" | "error";
  count?: number;
  detail?: string;
};

const PROBE_TIMEOUT_MS = 5000;

export async function getGoogleAccessToken(key: GoogleTokenKey): Promise<string | null> {
  const { client_id, client_secret } = await getGoogleAppKeys();
  const oAuth2Client = new OAuth2Client(client_id, client_secret);
  oAuth2Client.setCredentials(key);
  // getAccessToken refreshes with the stored refresh_token when the access token is expired.
  const { token } = await oAuth2Client.getAccessToken();
  return token ?? null;
}

type GoogleErrorBody = { error?: { status?: string; details?: { reason?: string }[] } };

export async function readGoogleError(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as GoogleErrorBody;
    return body.error?.details?.find((d) => d.reason)?.reason ?? body.error?.status;
  } catch {
    return undefined;
  }
}

async function probeFetch(url: string, token: string): Promise<Response | Error> {
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch (error) {
    return error instanceof Error ? error : new Error("fetch failed");
  }
}

export async function probeCalendar(token: string): Promise<IntegrationProbe> {
  const res = await probeFetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
    token
  );
  if (res instanceof Error) return { result: "error", detail: res.name };
  if (res.ok) return { result: "ok" };
  return { result: "error", detail: (await readGoogleError(res)) ?? String(res.status) };
}

export async function probeContacts(token: string, scope: string | undefined): Promise<IntegrationProbe> {
  if (!hasContactsScope(scope)) return { result: "missing_scope" };

  const res = await probeFetch(
    "https://people.googleapis.com/v1/people/me/connections?personFields=names&pageSize=1",
    token
  );
  if (res instanceof Error) return { result: "error", detail: res.name };
  if (res.ok) {
    const body = (await res.json()) as { totalPeople?: number; totalItems?: number };
    return { result: "ok", count: body.totalPeople ?? body.totalItems ?? 0 };
  }

  const reason = await readGoogleError(res);
  if (res.status === 401) return { result: "missing_scope" };
  if (res.status === 403 && reason === "SERVICE_DISABLED") return { result: "api_disabled" };
  if (res.status === 403 && reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT") return { result: "missing_scope" };
  return { result: "error", detail: reason ?? String(res.status) };
}
