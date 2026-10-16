import { afterEach, describe, expect, it, vi } from "vitest";
import { probeCalendar, probeContacts } from "./googleStatus";

vi.mock("@calcom/app-store/googlecalendar/lib/getGoogleAppKeys", () => ({
  getGoogleAppKeys: vi.fn(async () => ({ client_id: "id", client_secret: "secret" })),
}));

const CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (response: Response) => {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("probeContacts", () => {
  it("returns missing_scope without calling Google when the scope was not granted", async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}));
    expect(await probeContacts("token", "https://www.googleapis.com/auth/calendar")).toEqual({
      result: "missing_scope",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns ok with the saved contact count", async () => {
    stubFetch(jsonResponse(200, { totalPeople: 42 }));
    expect(await probeContacts("token", CONTACTS_SCOPE)).toEqual({ result: "ok", count: 42 });
  });

  it("returns api_disabled when the People API is turned off", async () => {
    stubFetch(
      jsonResponse(403, { error: { status: "PERMISSION_DENIED", details: [{ reason: "SERVICE_DISABLED" }] } })
    );
    expect(await probeContacts("token", CONTACTS_SCOPE)).toEqual({ result: "api_disabled" });
  });

  it("returns missing_scope when Google reports insufficient scope", async () => {
    stubFetch(
      jsonResponse(403, {
        error: { status: "PERMISSION_DENIED", details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] },
      })
    );
    expect(await probeContacts("token", CONTACTS_SCOPE)).toEqual({ result: "missing_scope" });
  });

  it("returns error with the status for other failures", async () => {
    stubFetch(jsonResponse(500, {}));
    expect(await probeContacts("token", CONTACTS_SCOPE)).toEqual({ result: "error", detail: "500" });
  });
});

describe("probeCalendar", () => {
  it("returns ok on 200", async () => {
    stubFetch(jsonResponse(200, { items: [] }));
    expect(await probeCalendar("token")).toEqual({ result: "ok" });
  });

  it("returns error on 401", async () => {
    stubFetch(jsonResponse(401, {}));
    expect(await probeCalendar("token")).toEqual({ result: "error", detail: "401" });
  });
});
