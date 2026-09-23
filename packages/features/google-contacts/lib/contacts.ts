export const GOOGLE_CONTACTS_SCOPE_SAVED = "https://www.googleapis.com/auth/contacts.readonly";
export const GOOGLE_CONTACTS_SCOPE_OTHER = "https://www.googleapis.com/auth/contacts.other.readonly";

export type GoogleContact = { email: string; name: string | null };

export type PeoplePerson = {
  names?: { displayName?: string | null }[] | null;
  emailAddresses?: { value?: string | null }[] | null;
};

export function hasContactsScope(scope: string | undefined | null): boolean {
  if (!scope) return false;
  const granted = scope.split(" ");
  return granted.includes(GOOGLE_CONTACTS_SCOPE_SAVED) || granted.includes(GOOGLE_CONTACTS_SCOPE_OTHER);
}

// Saved contacts are processed first so their curated names win over auto-captured "other contacts" names.
export function mapPeopleToContacts(saved: PeoplePerson[], other: PeoplePerson[]): GoogleContact[] {
  const byEmail = new Map<string, GoogleContact>();
  for (const person of [...saved, ...other]) {
    const name = person.names?.[0]?.displayName?.trim() || null;
    for (const address of person.emailAddresses ?? []) {
      const email = address.value?.trim().toLowerCase();
      if (!email || !email.includes("@")) continue;
      const existing = byEmail.get(email);
      if (!existing) byEmail.set(email, { email, name });
      else if (!existing.name && name) existing.name = name;
    }
  }
  return Array.from(byEmail.values()).sort((a, b) => {
    if (a.name && !b.name) return -1;
    if (!a.name && b.name) return 1;
    return (a.name ?? "").localeCompare(b.name ?? "") || a.email.localeCompare(b.email);
  });
}

// ponytail: linear scan per keystroke; fine up to ~20k contacts (server caps there). Add an index if it ever lags.
export function filterContacts(contacts: GoogleContact[], query: string, limit: number): GoogleContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: GoogleContact[] = [];
  const rest: GoogleContact[] = [];
  for (const contact of contacts) {
    const name = contact.name?.toLowerCase() ?? "";
    const nameWords = name.split(/\s+/);
    if (contact.email.startsWith(q) || nameWords.some((w) => w.startsWith(q))) prefix.push(contact);
    else if (contact.email.includes(q) || name.includes(q)) rest.push(contact);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...rest].slice(0, limit);
}
