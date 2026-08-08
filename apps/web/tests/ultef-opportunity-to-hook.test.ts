import { beforeEach, describe, expect, it, vi } from "vitest";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const enabled = process.env.ULTEF_SCENARIO === "L4-OPPORTUNITY-HOOK-001";
const ultefDescribe = enabled ? describe : describe.skip;

const mockGetOwnedHousehold = vi.fn();
const mockFindChildProfileForUser = vi.fn();
const mockListCharactersByChildProfile = vi.fn();
const mockGetWorldForCharacter = vi.fn();
const mockGetActiveSessionForChildAndWorld = vi.fn();
const mockCreateHook = vi.fn();
const mockFindOpportunityById = vi.fn();
const mockRespond = vi.fn();

vi.mock("@lumi/profiles/application", () => ({
  getOwnedHousehold: (...args: unknown[]) => mockGetOwnedHousehold(...args),
  findChildProfileForUser: (...args: unknown[]) =>
    mockFindChildProfileForUser(...args),
  listCharactersByChildProfile: (...args: unknown[]) =>
    mockListCharactersByChildProfile(...args),
}));

vi.mock("@lumi/world/application", () => ({
  getWorldForCharacter: (...args: unknown[]) =>
    mockGetWorldForCharacter(...args),
}));

vi.mock("@lumi/story/application", () => ({
  getActiveSessionForChildAndWorld: (...args: unknown[]) =>
    mockGetActiveSessionForChildAndWorld(...args),
  StoryHookService: class {
    createHook = mockCreateHook;
  },
}));

vi.mock("@lumi/npc-intelligence/application", () => ({
  OpportunityDeliveryService: class {
    respond = mockRespond;
  },
}));

vi.mock("@lumi/npc-intelligence/db", () => ({
  DrizzleOpportunityInboxRepository: class {
    constructor() {}
    findById = mockFindOpportunityById;
  },
  getNpcDb: () => ({}),
}));

vi.mock("@/lib/auth/with-parent", () => ({
  withParent: (fn: (parent: { id: string }) => Promise<Response>) =>
    fn({ id: "ultef-parent" }),
}));

type Route = (
  request: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

const HOUSEHOLD_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";
const OPPORTUNITY_ID = "33333333-3333-4333-8333-333333333333";
const CHARACTER_ID = "44444444-4444-4444-8444-444444444444";
const WORLD_ID = "55555555-5555-4555-8555-555555555555";
const SESSION_ID = "66666666-6666-4666-8666-666666666666";
const HOOK_ID = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  vi.clearAllMocks();
});

ultefDescribe(
  "ULTEF L4-OPPORTUNITY-HOOK-001 — production composition boundary",
  () => {
    it("accepts an NPC opportunity and carries it through profile/world/session resolution into a story hook", async () => {
      const scenario = createScenario({
        id: "L4-OPPORTUNITY-HOOK-001",
        title: "Accepted NPC opportunity to StoryHook composition",
        level: "L4",
        projectGate: "PX-LUMI-08",
        seed: "deterministic-adapter-fixtures",
      });

      scenario.setup(
        "Execution boundary",
        "real web route composition with test-double package adapters",
      );
      scenario.setup("Household", {
        id: HOUSEHOLD_ID,
        name: "ULTEF Household",
      });
      scenario.setup("Child", { id: CHILD_ID, name: "Deniz", ageBand: "6-8" });
      scenario.setup("Character", { id: CHARACTER_ID, name: "Arin" });
      scenario.setup("World", { id: WORLD_ID, name: "Gunes Vadisi" });
      scenario.setup("Active story session", SESSION_ID);
      scenario.setup("NPC opportunity", {
        id: OPPORTUNITY_ID,
        type: "rumor",
        sourceNpcId: "npc-mira",
        claim: "Eski koprunun isiklari firtinadan once yaniyor.",
      });

      mockGetOwnedHousehold.mockImplementation(async () => {
        scenario.event(
          "profile.household.resolved",
          "Parent ownership resolved to ULTEF Household.",
        );
        return { id: HOUSEHOLD_ID, name: "ULTEF Household" };
      });
      mockFindChildProfileForUser.mockImplementation(async () => {
        scenario.event(
          "profile.child.resolved",
          "Child profile Deniz was resolved inside the household.",
        );
        return { id: CHILD_ID, displayName: "Deniz", ageBand: "6-8" };
      });
      mockRespond.mockImplementation(
        async (
          _householdId: string,
          _opportunityId: string,
          response: string,
        ) => {
          scenario.event(
            "npc.opportunity.responded",
            `Rumor opportunity was marked '${response}'.`,
          );
        },
      );
      mockListCharactersByChildProfile.mockImplementation(async () => {
        scenario.event(
          "profile.character.resolved",
          "Primary character Arin was resolved for Deniz.",
        );
        return [{ id: CHARACTER_ID, name: "Arin" }];
      });
      mockGetWorldForCharacter.mockImplementation(async () => {
        scenario.event(
          "world.resolved",
          "Arin's world Gunes Vadisi was resolved.",
        );
        return { id: WORLD_ID, name: "Gunes Vadisi" };
      });
      mockGetActiveSessionForChildAndWorld.mockImplementation(async () => {
        scenario.event(
          "story.session.resolved",
          "Active story session was resolved for Deniz in Gunes Vadisi.",
        );
        return { id: SESSION_ID };
      });
      mockFindOpportunityById.mockImplementation(async () => {
        scenario.event(
          "npc.opportunity.loaded",
          "Accepted rumor from Mira was reloaded with its evidence payload.",
        );
        return {
          getState: () => ({
            id: OPPORTUNITY_ID,
            householdId: HOUSEHOLD_ID,
            sourceNpcId: "npc-mira",
            childProfileId: CHILD_ID,
            opportunityType: "rumor",
            message: "Mira bir soylenti paylasmak istiyor.",
            evidence: {
              claim: "Eski koprunun isiklari firtinadan once yaniyor.",
              factId: "bridge-lights",
            },
            score: 0.82,
            cooldownKeys: [],
            expiresAt: new Date("2026-08-09T00:00:00Z"),
            status: "accepted",
            respondedAt: new Date("2026-08-08T10:00:00Z"),
            reason: "story relevance",
            createdAt: new Date("2026-08-08T09:00:00Z"),
          }),
        };
      });
      mockCreateHook.mockImplementation(
        async (input: Record<string, unknown>) => {
          scenario.event(
            "story.hook.created",
            "StoryHook was created from Mira's accepted rumor for the active session.",
            { input },
          );
          return {
            hook: {
              id: HOOK_ID,
              hookType: "rumor",
              sceneType: "narrative",
              status: "pending",
            },
            created: true,
          };
        },
      );

      const route = (await import(
        "@/app/api/interactions/opportunities/[opportunityId]/respond/route"
      )) as { POST: Route };

      scenario.event(
        "request.started",
        "Deniz accepted Mira's rumor opportunity.",
      );
      const response = await route.POST(
        new Request(
          `http://localhost/api/interactions/opportunities/${OPPORTUNITY_ID}/respond`,
          {
            method: "POST",
            body: JSON.stringify({
              householdId: HOUSEHOLD_ID,
              childProfileId: CHILD_ID,
              response: "accepted",
            }),
          },
        ),
        { params: Promise.resolve({ opportunityId: OPPORTUNITY_ID }) },
      );

      const body = await response.json();
      const hookInput = mockCreateHook.mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;

      scenario.assert(
        "Route returns success",
        response.status === 200,
        200,
        response.status,
      );
      scenario.assert(
        "Accepted opportunity transition executed",
        mockRespond.mock.calls.length === 1,
        1,
        mockRespond.mock.calls.length,
      );
      scenario.assert(
        "World resolution used Arin",
        mockGetWorldForCharacter.mock.calls[0]?.[0] === CHARACTER_ID,
        CHARACTER_ID,
        mockGetWorldForCharacter.mock.calls[0]?.[0] ?? null,
      );
      scenario.assert(
        "Active session resolution uses Deniz and Gunes Vadisi",
        mockGetActiveSessionForChildAndWorld.mock.calls[0]?.[0] === CHILD_ID &&
          mockGetActiveSessionForChildAndWorld.mock.calls[0]?.[1] === WORLD_ID,
        [CHILD_ID, WORLD_ID],
        mockGetActiveSessionForChildAndWorld.mock.calls[0] ?? null,
      );
      scenario.assert(
        "StoryHook points to active story session",
        hookInput?.storySessionId === SESSION_ID,
        SESSION_ID,
        hookInput?.storySessionId ?? null,
      );
      scenario.assert(
        "StoryHook points to resolved world",
        hookInput?.worldId === WORLD_ID,
        WORLD_ID,
        hookInput?.worldId ?? null,
      );
      scenario.assert(
        "Rumor claim reaches StoryHook payload",
        (hookInput?.payload as Record<string, unknown> | undefined)?.claim ===
          "Eski koprunun isiklari firtinadan once yaniyor.",
        "Eski koprunun isiklari firtinadan once yaniyor.",
        (hookInput?.payload as Record<string, unknown> | undefined)?.claim ??
          null,
      );
      scenario.assert(
        "Response exposes created rumor hook",
        body.hook?.id === HOOK_ID && body.hook?.hookType === "rumor",
        { id: HOOK_ID, hookType: "rumor" },
        body.hook ?? null,
      );

      scenario.delta(
        "opportunity.status",
        "proposed",
        "accepted",
        "parent accepted NPC interaction",
      );
      scenario.delta(
        "story.hooks.count",
        0,
        1,
        "accepted rumor created a pending StoryHook",
      );
      scenario.delta(
        "story.hook.payload.claim",
        null,
        "Eski koprunun isiklari firtinadan once yaniyor.",
        "NPC evidence propagated into story composition",
      );

      const passed =
        response.status === 200 &&
        body.hook?.id === HOOK_ID &&
        hookInput?.storySessionId === SESSION_ID &&
        hookInput?.worldId === WORLD_ID;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "The production web composition carried an accepted NPC rumor through ownership, character, world and session resolution into StoryHook creation. Package adapters were test doubles; persistence/outbox application is not claimed by this scenario."
          : "The accepted-opportunity composition did not reach the expected StoryHook boundary.",
      });

      await writeScenarioArtifacts(report, {
        environment: "integration-composition-test-doubles",
      });
      expect(report.result).toBe("PASS");
    });
  },
);
