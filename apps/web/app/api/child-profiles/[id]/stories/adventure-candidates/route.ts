import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
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

const paramsSchema = z.object({ id: z.string().uuid() });
const querySchema = z.object({
  householdId: z.string().uuid(),
  page: z.coerce.number().int().min(0).default(0),
});

function rotateCandidates(
  candidates: AdventureHookCandidate[],
  page: number,
): AdventureHookCandidate[] {
  if (candidates.length <= 1) return candidates;
  const offset = page % candidates.length;
  return [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(
    0,
    6,
  );
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
        return NextResponse.json({ candidates: [], page });
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
            type: state.opportunityType,
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

      if (world) {
        const title = currentLocation?.displayName ?? "Dünyada yeni bir iz";
        candidates.push({
          id: `world:${world.id}`,
          sourceFamily: "world_event",
          title,
          teaser: currentLocation
            ? `${currentLocation.displayName} çevresinde yeni ve merak uyandıran bir şey oluyor.`
            : "Dünyada keşfedilmeyi bekleyen yeni bir olay var.",
          ctaKey: "chooseWorldEvent",
          image: currentLocation
            ? { kind: "environment", subjectId: currentLocation.id }
            : null,
        });
      }

      return NextResponse.json({
        candidates: rotateCandidates(candidates, page),
        page,
      });
    }),
  "/api/child-profiles/{id}/stories/adventure-candidates",
);
