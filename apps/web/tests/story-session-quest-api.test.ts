import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOwnedHousehold = vi.fn();
const mockGetStorySessionOrForbidden = vi.fn();
const mockGetQuestsBySessionId = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getOwnedHousehold: (...args: unknown[]) => mockGetOwnedHousehold(...args),
}));

vi.mock("@lumi/story/application", () => ({
  getStorySessionOrForbidden: (...args: unknown[]) =>
    mockGetStorySessionOrForbidden(...args),
}));

vi.mock("@lumi/world/application", () => ({
  getQuestsBySessionId: (...args: unknown[]) =>
    mockGetQuestsBySessionId(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "parent-user-id" }),
}));

type GetRoute = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";

function makeQuest(overrides: Record<string, unknown> = {}) {
  return {
    id: "quest-1",
    title: "Kayip Mektup",
    summary: "Mektubun sahibini bul.",
    status: "active",
    objectives: [
      { index: 0, title: "Hanciya sor", status: "completed" },
      { index: 1, title: "Mektubu teslim et", status: "locked" },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("story session quest log route", () => {
  it("returns a localized quest log for the session", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockResolvedValueOnce(undefined);
    mockGetQuestsBySessionId.mockResolvedValueOnce([makeQuest()]);

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/quests/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/stories/sessions/${SESSION_ID}/quests?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ sessionId: SESSION_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(mockGetQuestsBySessionId).toHaveBeenCalledWith(SESSION_ID);
    expect(body.quests).toHaveLength(1);
    expect(body.quests[0].statusLabel).toBe("Devam ediyor");
    expect(body.quests[0].objectives[0].statusLabel).toBe("Tamamlandi");
    expect(body.quests[0].objectives[1].statusLabel).toBe("Kilitli");
  });

  it("rejects a mismatched household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: "other-household" });

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/quests/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/stories/sessions/${SESSION_ID}/quests?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ sessionId: SESSION_ID }) },
    );

    expect(response.status).toBe(403);
    expect(mockGetQuestsBySessionId).not.toHaveBeenCalled();
  });

  it("returns 400 when householdId is missing", async () => {
    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/quests/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(`http://localhost/api/stories/sessions/${SESSION_ID}/quests`),
      { params: Promise.resolve({ sessionId: SESSION_ID }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns empty quest list when the session has no quests", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockResolvedValueOnce(undefined);
    mockGetQuestsBySessionId.mockResolvedValueOnce([]);

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/quests/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/stories/sessions/${SESSION_ID}/quests?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ sessionId: SESSION_ID }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.quests).toEqual([]);
  });

  it("returns 404 when the session is not accessible", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    const notFound = new Error("not found");
    notFound.name = "NotFoundError";
    mockGetStorySessionOrForbidden.mockRejectedValueOnce(notFound);

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/quests/route"
    )) as { GET: GetRoute };
    const response = await route.GET(
      new Request(
        `http://localhost/api/stories/sessions/${SESSION_ID}/quests?householdId=${HOUSEHOLD_ID}`,
      ),
      { params: Promise.resolve({ sessionId: SESSION_ID }) },
    );

    expect(response.status).toBe(404);
    expect(mockGetQuestsBySessionId).not.toHaveBeenCalled();
  });
});
