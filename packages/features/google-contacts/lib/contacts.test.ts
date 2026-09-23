import { describe, expect, it } from "vitest";

import { filterContacts, hasContactsScope, mapPeopleToContacts } from "./contacts";

describe("mapPeopleToContacts", () => {
  it("lowercases, dedupes by email, prefers saved contact names, sorts by name then email", () => {
    const saved = [
      { names: [{ displayName: "Zara Client" }], emailAddresses: [{ value: "Zara@Acme.com" }] },
      { names: [{ displayName: "Amit" }], emailAddresses: [{ value: "amit@x.com" }, { value: "amit.work@x.com" }] },
    ];
    const other = [
      { names: [{ displayName: "zara (other)" }], emailAddresses: [{ value: "zara@acme.com" }] },
      { names: null, emailAddresses: [{ value: "noname@y.com" }] },
      { names: [{ displayName: "No Email" }], emailAddresses: [] },
    ];
    expect(mapPeopleToContacts(saved, other)).toEqual([
      { email: "amit.work@x.com", name: "Amit" },
      { email: "amit@x.com", name: "Amit" },
      { email: "zara@acme.com", name: "Zara Client" },
      { email: "noname@y.com", name: null },
    ]);
  });

  it("skips values without an @", () => {
    expect(mapPeopleToContacts([{ emailAddresses: [{ value: "not-an-email" }] }], [])).toEqual([]);
  });
});

describe("filterContacts", () => {
  const contacts = [
    { email: "amit@x.com", name: "Amit Shah" },
    { email: "priya@studio.in", name: "Priya Nair" },
    { email: "billing@shah.co", name: null },
  ];

  it("returns [] for empty/whitespace query", () => {
    expect(filterContacts(contacts, "  ", 8)).toEqual([]);
  });

  it("matches case-insensitively on name or email, prefix matches first", () => {
    expect(filterContacts(contacts, "SHAH", 8).map((c) => c.email)).toEqual(["amit@x.com", "billing@shah.co"]);
    expect(filterContacts(contacts, "pri", 8).map((c) => c.email)).toEqual(["priya@studio.in"]);
    expect(filterContacts(contacts, "bil", 8).map((c) => c.email)).toEqual(["billing@shah.co"]);
  });

  it("respects limit", () => {
    expect(filterContacts(contacts, "a", 1)).toHaveLength(1);
  });
});

describe("hasContactsScope", () => {
  it("detects either contacts scope in a space-separated scope string", () => {
    expect(hasContactsScope("a https://www.googleapis.com/auth/contacts.other.readonly b")).toBe(true);
    expect(hasContactsScope("https://www.googleapis.com/auth/contacts.readonly")).toBe(true);
    expect(hasContactsScope("https://www.googleapis.com/auth/calendar.events")).toBe(false);
    expect(hasContactsScope(undefined)).toBe(false);
  });
});
