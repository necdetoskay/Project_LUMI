import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import {
  findChildProfileForUser,
  getCharacterContinuitySnapshot,
  getHouseholdForUser,
  listCharactersByChildProfile,
} from "@lumi/profiles/application";
import { OpportunityDeliveryService } from "@lumi/npc-intelligence/application";
import {
  DrizzleOpportunityInboxRepository,
  getNpcDb,
} from "@lumi/npc-intelligence/db";
import {
  ensureStarterStoriesForHousehold,
  getActiveSessionForChildAndWorld,
  startSession,
  StoryHookService,
} from "@lumi/story/application";
import { getWorldForCharacter } from "@lumi/world/application";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  householdId: z.string().uuid(),
  candidateId: z.string().min(1),
  idempotencyKey: z.string().min(1),
});

const HOOK_TO_SCENE: Record<string, string> = {
  rumor: "narrative",
  gift: "choice",
  warning: "narrative",
  invitation: "transition",
  quest_seed: "narrative",
  social_visit: "transition",
  information_share: "narrative",
};

type OpportunityState = {
  id: string;
  householdId: string;
  childProfileId: string;
  sourceNpcId: string;
  opportunityType: string;
  message: string;
  evidence: Record<string, unknown>;
  status: string;
};

function hookPayloadFromEvidence(
  evidence: Record<string, unknown>,
): Record<string, unknown> {
  return {
    claim: evidence["claim"],
    itemId: evidence["itemId"],
    factId: evidence["factId"],
    conditionId: evidence["conditionId"],
    placeClaim: evidence["placeClaim"] ?? evidence["placeFactId"],
    ...evidence,
  };
}

export const POST = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
    withParent(async (parent) => {
      const parsedParams = paramsSchema.safeParse(await params);
      const parsedBody = bodySchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsedParams.success || !parsedBody.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "Invalid adventure start request",
          },
          { status: 400 },
        );
      }

      const childProfileId = parsedParams.data.id;
      const { householdId, candidateId, idempotencyKey } = parsedBody.data;
      const household = await getHouseholdForUser(householdId, parent.id);
      const childProfile = await findChildProfileForUser(
        childProfileId,
        parent.id,
        householdId,
      );
      if (!household || !childProfile) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Profile is not accessible" },
          { status: 403 },
        );
      }

      const characters = await listCharactersByChildProfile(
        parent.id,
        householdId,
        childProfileId,
      );
      const character = characters[0];
      if (!character) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Character not found" },
          { status: 404 },
        );
      }

      const world = await getWorldForCharacter(character.id);
      if (!world) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "World not found" },
          { status: 404 },
        );
      }

      let candidateTitle = "Yeni macera";
      let candidateFamily:
        | "world_event"
        | "rumor"
        | "inventory_item"
        | "npc_call" = "world_event";
      let opportunityState: OpportunityState | null = null;

      if (candidateId.startsWith("opportunity:")) {
        const opportunityId = candidateId.slice("opportunity:".length);
        const inbox = new DrizzleOpportunityInboxRepository(getNpcDb());
        const opportunity = await inbox.findById(householdId, opportunityId);
        if (!opportunity) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Adventure candidate not found" },
            { status: 404 },
          );
        }
        opportunityState = opportunity.getState();
        candidateTitle = opportunityState.message;
        candidateFamily =
          opportunityState.opportunityType === "rumor"
            ? "rumor"
            : ["invitation", "social_visit", "gift"].includes(
                  opportunityState.opportunityType,
                )
              ? "npc_call"
              : "world_event";
      } else if (candidateId.startsWith("inventory:")) {
        const itemId = candidateId.slice("inventory:".length);
        const continuity = await getCharacterContinuitySnapshot(
          householdId,
          childProfileId,
          character.id,
        );
        const item = continuity?.inventory.find(
          (entry) => entry.itemInstanceId === itemId,
        );
        if (!item) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Adventure item not found" },
            { status: 404 },
          );
        }
        candidateTitle = item.displayName;
        candidateFamily = "inventory_item";
      } else if (candidateId !== `world:${world.id}`) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Adventure candidate not found" },
          { status: 404 },
        );
      }

      let activeSession = await getActiveSessionForChildAndWorld(
        childProfileId,
        world.id,
      );
      let startedNewSession = false;

      if (!activeSession) {
        const catalog = await ensureStarterStoriesForHousehold(householdId);
        const preferred =
          catalog.find(
            (entry) => entry.definition.storyType === candidateFamily,
          ) ?? catalog[0];
        if (!preferred?.version) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "No published story is ready" },
            { status: 404 },
          );
        }

        const result = await startSession({
          householdId,
          childProfileId,
          worldId: world.id,
          storyDefinitionId: preferred.definition.id,
          storyVersionId: preferred.version.id,
          characterId: character.id,
          playbackMode: "reading",
          idempotencyKey,
          actorUserId: parent.id,
          contextSnapshot: {
            adventureStart: {
              candidateId,
              candidateFamily,
              candidateTitle,
            },
          },
        });
        activeSession = result.session;
        startedNewSession = true;
      }

      let hookId: string | null = null;
      if (opportunityState) {
        const opportunityId = opportunityState.id;
        const deliveryService = new OpportunityDeliveryService(
          new DrizzleOpportunityInboxRepository(getNpcDb()),
        );
        if (opportunityState.status === "proposed") {
          await deliveryService.respond(householdId, opportunityId, "accepted");
        }
        const hookService = new StoryHookService();
        const hook = await hookService.createHook({
          householdId,
          childProfileId,
          storySessionId: activeSession.id,
          worldId: world.id,
          opportunityId,
          opportunityStatus: "accepted",
          opportunityHouseholdId: householdId,
          sourceNpcId: opportunityState.sourceNpcId,
          targetNpcId: null,
          hookType: opportunityState.opportunityType as Parameters<
            StoryHookService["createHook"]
          >[0]["hookType"],
          sceneType: (HOOK_TO_SCENE[opportunityState.opportunityType] ??
            "narrative") as Parameters<
            StoryHookService["createHook"]
          >[0]["sceneType"],
          payload: hookPayloadFromEvidence(opportunityState.evidence),
          constraints: {},
        });
        hookId = hook.hook.id;
      }

      return NextResponse.json(
        {
          sessionId: activeSession.id,
          startedNewSession,
          attachedCandidateId: candidateId,
          hookId,
        },
        { status: startedNewSession ? 201 : 200 },
      );
    }),
  "/api/child-profiles/{id}/stories/start-adventure",
);
