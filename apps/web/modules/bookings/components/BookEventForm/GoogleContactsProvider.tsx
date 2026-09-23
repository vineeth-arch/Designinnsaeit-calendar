"use client";

import { useSession } from "next-auth/react";
import { createContext, useContext } from "react";

import type { GoogleContact } from "@calcom/features/google-contacts/lib/contacts";
import { trpc } from "@calcom/trpc/react";

type GoogleContactsValue = { contacts: GoogleContact[]; needsGoogleConsent: boolean } | null;

const GoogleContactsContext = createContext<GoogleContactsValue>(null);

export const useGoogleContacts = () => useContext(GoogleContactsContext);

export function GoogleContactsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const { data } = trpc.viewer.googleContacts.list.useQuery(undefined, {
    enabled: isLoggedIn,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const value: GoogleContactsValue = isLoggedIn
    ? { contacts: data?.contacts ?? [], needsGoogleConsent: data?.needsGoogleConsent ?? false }
    : null;

  return <GoogleContactsContext.Provider value={value}>{children}</GoogleContactsContext.Provider>;
}
