import { OAuth2Client } from "googleapis-common";
import { z } from "zod";

import { getGoogleAppKeys } from "@calcom/app-store/googlecalendar/lib/getGoogleAppKeys";
import type { GoogleContact, PeoplePerson } from "@calcom/features/google-contacts/lib/contacts";
import { hasContactsScope, mapPeopleToContacts } from "@calcom/features/google-contacts/lib/contacts";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

const log = logger.getSubLogger({ prefix: ["googleContacts.list"] });

const tokenSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  expiry_date: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});

// 10 pages x 1000 per source caps a single call at 20k contacts so a huge address book can't stall the booking page.
const MAX_PAGES = 10;

class GoogleAuthError extends Error {}

async function fetchAllPages(url: string, listKey: "connections" | "otherContacts", accessToken: string) {
  const people: PeoplePerson[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const pageUrl = new URL(url);
    if (pageToken) pageUrl.searchParams.set("pageToken", pageToken);
    const res = await fetch(pageUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 401 || res.status === 403) throw new GoogleAuthError(`People API ${res.status}`);
    if (!res.ok) throw new Error(`People API ${res.status} for ${listKey}`);
    const body = (await res.json()) as { nextPageToken?: string } & Record<string, PeoplePerson[] | undefined>;
    people.push(...(body[listKey] ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return people;
}

type ListOptions = { ctx: { user: NonNullable<TrpcSessionUser> } };

export const listHandler = async ({
  ctx,
}: ListOptions): Promise<{ contacts: GoogleContact[]; needsGoogleConsent: boolean }> => {
  const credentials = await prisma.credential.findMany({
    where: { userId: ctx.user.id, type: "google_calendar", invalid: { not: true } },
    select: { id: true, key: true },
  });

  const credential = credentials
    .map((c) => ({ id: c.id, key: tokenSchema.safeParse(c.key) }))
    .find((c) => c.key.success && hasContactsScope(c.key.data.scope));

  if (!credential || !credential.key.success) return { contacts: [], needsGoogleConsent: true };

  try {
    const { client_id, client_secret } = await getGoogleAppKeys();
    const oAuth2Client = new OAuth2Client(client_id, client_secret);
    oAuth2Client.setCredentials(credential.key.data);
    // getAccessToken refreshes with the stored refresh_token when the access token is expired.
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) return { contacts: [], needsGoogleConsent: true };

    const [saved, other] = await Promise.all([
      fetchAllPages(
        "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=1000",
        "connections",
        token
      ),
      fetchAllPages(
        "https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses&pageSize=1000",
        "otherContacts",
        token
      ),
    ]);
    return { contacts: mapPeopleToContacts(saved, other), needsGoogleConsent: false };
  } catch (error) {
    if (error instanceof GoogleAuthError) return { contacts: [], needsGoogleConsent: true };
    log.error(`Failed to load Google contacts for user ${ctx.user.id}`, error);
    return { contacts: [], needsGoogleConsent: false };
  }
};
