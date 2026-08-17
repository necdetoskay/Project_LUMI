import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { selectAdventureCandidateWindow } from "@/lib/stories/adventure-candidate-policy";
import {
  projectInventoryCandidate,
  projectOpportunityCandidate,
  type AdventureHookCandidate,
} from "@/lib/stories/adventure-presentation";
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
  getCharacterCurrentLocation,
  getWorldForCharacter,
} from "@lumi/world/application";
import {
  DrizzleWorldEventReader,
  getDatabase as getWorldDb,
} from "@lumi/world/db";

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({
  householdId: z.string().uuid(),
  page: z.coerce.number().int().min(0).default(0),
});

function payloadString(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export const GET = observeHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) =>
    withParent(async (parent) => {
      const parsedParams = paramsSchema.safeParse(await params);
      const { searchParams } = new URL(request.url);
      const parsedQuery = querySchema.safeParse({
        householdId: searchParams.get("householdId"),
        page: searchParams.get("page") ?? 0,
      });

      if (!parsedParams.success || !parsedQuery.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "Invalid adventure candidate request",
          },
          { status: 400 },
        );
      }

      const { householdId, page } = parsedQuery.data;
      const childProfileId = parsedParams.data.id;
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
      const character = characters[0] ?? null;
      if (!character) {
        return NextResponse.json({
          candidates: [],
          page,
          hasMoreUnseen: false,
          diagnostics: [
            {
              sourceFamily: "world_event",
              available: false,
              reason:
                "No finalized character is available for world discovery.",
            },
            {
              sourceFamily: "rumor",
              available: false,
              reason:
                "No finalized character is available for rumor discovery.",
            },
            {
              sourceFamily: "npc_call",
              available: false,
              reason: "No finalized character is available for NPC discovery.",
            },
            {
              sourceFamily: "inventory_item",
              available: false,
              reason: "No finalized character inventory is available.",
            },
          ],
        });
      }

      const [continuity, opportunities, world, currentLocation] =
        await Promise.all([
          getCharacterContinuitySnapshot(
            householdId,
            childProfileId,
            character.id,
          ).catch(() => null),
          new OpportunityDeliveryService(
            new DrizzleOpportunityInboxRepository(getNpcDb()),
          )
            .listProposedForChild(householdId, childProfileId)
            .catch(() => []),
          getWorldForCharacter(character.id).catch(() => null),
          getCharacterCurrentLocation(character.id).catch(() => null),
        ]);

      const candidates: AdventureHookCandidate[] = opportunities.map(
        (entry) => {
          const state = entry.getState();
          return projectOpportunityCandidate({
            id: state.id,
            type:
              state.opportunityType === "npc_interaction"
                ? "invitation"
                : state.opportunityType,
            message: state.message,
            sourceNpcId: state.sourceNpcId,
            evidence: state.evidence,
          });
        },
      );

      for (const item of continuity?.inventory ?? []) {
        candidates.push(
          projectInventoryCandidate(
            item,
            `${item.displayName}, yeni bir sırrın ya da keşfin başlangıcı olabilir.`,
          ),
        );
      }

      let worldEventsAvailable = false;
      if (world) {
        const events = await new DrizzleWorldEventReader(getWorldDb())
          .listRecent(world.id, 30)
          .catch(() => []);
        worldEventsAvailable = events.length > 0;

        for (const event of events) {
          const title =
            payloadString(event.payload, "title", "name", "claim", "summary") ??
            currentLocation?.displayName ??
            "Dünyada yeni bir olay";
          const teaser =
            payloadString(
              event.payload,
              "teaser",
              "description",
              "message",
              "summary",
              "claim",
            ) ?? `${title} ile ilgili gerçek bir değişim dünyada iz bırakıyor.`;

          candidates.push({
            id: `world-event:${event.id}`,
            sourceFamily: "world_event",
            title,
            teaser,
            ctaKey: "chooseWorldEvent",
            image: currentLocation
              ? { kind: "environment", subjectId: currentLocation.id }
              : null,
          });
        }
      }

      const selection = selectAdventureCandidateWindow(candidates, {
        page,
        limit: 6,
        unavailableReasons: {
          world_event: world
            ? worldEventsAvailable
              ? ""
              : "The canonical world event store has no event for this world yet. Genesis event materialization may not have completed."
            : "The character is not attached to a canonical world.",
          rumor:
            "No eligible canonical rumor is currently proposed in the Opportunity Inbox.",
          npc_call:
            "No eligible NPC interaction is currently proposed. Sparse Genesis ecologies may legitimately have no NPC call.",
          inventory_item:
            "No story-selectable inventory item is currently available.",
        },
      });

      return NextResponse.json({
        candidates: selection.candidates,
        page,
        hasMoreUnseen: selection.hasMoreUnseen,
        diagnostics: selection.diagnostics,
      });
    }),
  "/api/child-profiles/{id}/stories/adventure-candidates",
);
