import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "@lumi/story/domain";

const mockGetOwnedHousehold = vi.fn();
const mockGetStorySessionOrForbidden = vi.fn();
const mockPauseSession = vi.fn();
const mockResumeSession = vi.fn();
const mockCompleteSession = vi.fn();
const mockAbandonSession = vi.fn();
const mockAdvanceSession = vi.fn();
const mockRecordStoryEventWithTx = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getOwnedHousehold: (...args: unknown[]) => mockGetOwnedHousehold(...args),
}));

vi.mock("@lumi/story/application", () => ({
  getStorySessionOrForbidden: (...args: unknown[]) =>
    mockGetStorySessionOrForbidden(...args),
  pauseSession: (...args: unknown[]) => mockPauseSession(...args),
  resumeSession: (...args: unknown[]) => mockResumeSession(...args),
  completeSession: (...args: unknown[]) => mockCompleteSession(...args),
  abandonSession: (...args: unknown[]) => mockAbandonSession(...args),
  advanceSession: (...args: unknown[]) => mockAdvanceSession(...args),
  recordStoryEventWithTx: (...args: unknown[]) =>
    mockRecordStoryEventWithTx(...args),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (
    fn: (parent: {
      id: string;
      email: string;
      displayName: string;
    }) => Promise<Response>,
  ) =>
    fn({
      id: "parent-user-id",
      email: "parent@example.com",
      displayName: "Parent",
    }),
}));

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const FOREIGN_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const NEXT_SCENE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type PostRoute = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

async function callPost(
  route: PostRoute,
  sessionId: string,
  body?: Record<string, unknown>,
) {
  const init: RequestInit = body
    ? { method: "POST", body: JSON.stringify(body) }
    : { method: "POST" };
  if (body) init.headers = { "content-type": "application/json" };
  return route(
    new Request(
      `http://localhost/api/stories/sessions/${sessionId}?householdId=${HOUSEHOLD_ID}`,
      init,
    ),
    { params: Promise.resolve({ sessionId }) },
  );
}

describe("story session mutators enforce household ownership (IDOR)", () => {
  it("blocks pause on a session outside the caller's household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockRejectedValueOnce(
      new AuthorizationError("User does not have access to this story session"),
    );

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/pause/route"
    )) as { POST: PostRoute };
    const response = await callPost(route.POST, FOREIGN_SESSION_ID, {
      expectedVersion: 1,
    });

    expect(response.status).toBe(403);
    expect(mockPauseSession).not.toHaveBeenCalled();
  });

  it("blocks resume on a session outside the caller's household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockRejectedValueOnce(
      new AuthorizationError("User does not have access to this story session"),
    );

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/resume/route"
    )) as { POST: PostRoute };
    const response = await callPost(route.POST, FOREIGN_SESSION_ID, {
      expectedVersion: 1,
    });

    expect(response.status).toBe(403);
    expect(mockResumeSession).not.toHaveBeenCalled();
  });

  it("blocks complete on a session outside the caller's household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockRejectedValueOnce(
      new AuthorizationError("User does not have access to this story session"),
    );

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/complete/route"
    )) as { POST: PostRoute };
    const response = await callPost(route.POST, FOREIGN_SESSION_ID, {
      expectedVersion: 1,
    });

    expect(response.status).toBe(403);
    expect(mockCompleteSession).not.toHaveBeenCalled();
  });

  it("blocks abandon on a session outside the caller's household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockRejectedValueOnce(
      new AuthorizationError("User does not have access to this story session"),
    );

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/abandon/route"
    )) as { POST: PostRoute };
    const response = await callPost(route.POST, FOREIGN_SESSION_ID, {
      expectedVersion: 1,
      reason: "cross-family attempt",
    });

    expect(response.status).toBe(403);
    expect(mockAbandonSession).not.toHaveBeenCalled();
  });

  it("blocks advance on a session outside the caller's household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockRejectedValueOnce(
      new AuthorizationError("User does not have access to this story session"),
    );

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/advance/route"
    )) as { POST: PostRoute };
    const response = await callPost(route.POST, FOREIGN_SESSION_ID, {
      expectedVersion: 1,
      nextSceneId: NEXT_SCENE_ID,
    });

    expect(response.status).toBe(403);
    expect(mockAdvanceSession).not.toHaveBeenCalled();
  });

  it("allows mutation when the session belongs to the caller's household", async () => {
    mockGetOwnedHousehold.mockResolvedValueOnce({ id: HOUSEHOLD_ID });
    mockGetStorySessionOrForbidden.mockResolvedValueOnce(undefined);
    mockResumeSession.mockResolvedValueOnce({ ok: true });

    const route = (await import(
      "@/app/api/stories/sessions/[sessionId]/resume/route"
    )) as { POST: PostRoute };
    const response = await callPost(route.POST, FOREIGN_SESSION_ID, {
      expectedVersion: 1,
    });

    expect(response.status).toBe(200);
    expect(mockResumeSession).toHaveBeenCalledTimes(1);
  });
});
