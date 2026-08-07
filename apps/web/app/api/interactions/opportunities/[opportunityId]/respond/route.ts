import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import {
  findChildProfileForUser,
  getOwnedHousehold,
  listCharactersByChildProfile,
} from "@lumi/profiles/application";
import { getWorldForCharacter } from "@lumi/world/application";
import {
  getActiveSessionForChildAndWorld,
  StoryHookService,
} from "@lumi/story/application";
import { OpportunityDeliveryService } from "@lumi/npc-intelligence/application";
import { DrizzleOpportunityInboxRepository } from "@lumi/npc-intelligence/db";
import { getNpcDb } from "@lumi/npc-intelligence/db";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";

const paramsSchema = z.object({
  opportunityId: z.string().uuid(),
});

const bodySchema = z.object({
  householdId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  response: z.enum(["accepted", "declined", "deferred"]),
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

function hookPayloadFromEvidence(
  opportunityType: string,
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
  async (
    request: Request,
    { params }: { params: Promise<{ opportunityId: string }> },
  ) => {
    return withParent(async (parent) => {
      const parsedParams = paramsSchema.safeParse(await params);
      if (!parsedParams.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: parsedParams.error.message },
          { status: 400 },
        );
      }

      let body;
      try {
        body = bodySchema.safeParse(await request.json());
      } catch {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Invalid JSON body" },
          { status: 400 },
        );
      }
      if (!body.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: body.error.message },
          { status: 400 },
        );
      }

      const { opportunityId } = parsedParams.data;
      const { householdId, childProfileId, response } = body.data;

      try {
        const household = await getOwnedHousehold(parent.id);
        if (!household || household.id !== householdId) {
          return NextResponse.json(
            {
              error: "FORBIDDEN",
              message: "User does not have access to this household",
            },
            { status: 403 },
          );
        }

        const childProfile = await findChildProfileForUser(
          childProfileId,
          parent.id,
          householdId,
        );
        if (!childProfile) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Child profile not found" },
            { status: 404 },
          );
        }

        const deliveryService = new OpportunityDeliveryService(
          new DrizzleOpportunityInboxRepository(getNpcDb()),
        );

        if (response !== "accepted") {
          await deliveryService.respond(householdId, opportunityId, response);
          return NextResponse.json({ ok: true });
        }

        // Accepted: transition the opportunity first.
        await deliveryService.respond(householdId, opportunityId, "accepted");

        // Resolve the world + active session for hook creation.
        const characters = await listCharactersByChildProfile(
          parent.id,
          householdId,
          childProfileId,
        );
        const primaryCharacter = characters[0];
        if (!primaryCharacter) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Child has no character" },
            { status: 404 },
          );
        }
        const world = await getWorldForCharacter(primaryCharacter.id);
        if (!world) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Child has no world" },
            { status: 404 },
          );
        }

        const activeSession = await getActiveSessionForChildAndWorld(
          childProfileId,
          world.id,
        );
        if (!activeSession) {
          return NextResponse.json(
            {
              error: "NOT_FOUND",
              message: "Child has no active story session",
            },
            { status: 404 },
          );
        }

        // Load the accepted opportunity to build the hook.
        const inbox = new DrizzleOpportunityInboxRepository(getNpcDb());
        const opportunity = await inbox.findById(householdId, opportunityId);
        if (!opportunity) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Opportunity not found" },
            { status: 404 },
          );
        }
        const state = opportunity.getState();

        const hookService = new StoryHookService();
        const result = await hookService.createHook({
          householdId,
          childProfileId,
          storySessionId: activeSession.id,
          worldId: world.id,
          opportunityId,
          opportunityStatus: "accepted",
          opportunityHouseholdId: householdId,
          sourceNpcId: state.sourceNpcId,
          targetNpcId: null,
          hookType: state.opportunityType as Parameters<
            typeof hookService.createHook
          >[0]["hookType"],
          sceneType: (HOOK_TO_SCENE[state.opportunityType] ??
            "narrative") as Parameters<
            typeof hookService.createHook
          >[0]["sceneType"],
          payload: hookPayloadFromEvidence(
            state.opportunityType,
            state.evidence,
          ),
          constraints: {},
        });

        return NextResponse.json({
          ok: true,
          hook: {
            id: result.hook.id,
            hookType: result.hook.hookType,
            sceneType: result.hook.sceneType,
            status: result.hook.status,
            created: result.created,
          },
        });
      } catch (error) {
        return handleStoryError(error, "Failed to respond to opportunity");
      }
    });
  },
  "/api/interactions/opportunities/{opportunityId}/respond",
);
