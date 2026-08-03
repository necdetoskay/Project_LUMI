import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { getOwnedHousehold, getCharacterById, listOriginPackages } from "@lumi/profiles/application";

const bootstrapBodySchema = z.object({
  characterId: z.string().uuid(),
  idempotencyKey: z.string().optional(),
});

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    try {
      const raw = await readRequestBody(request);
      const parsed = bootstrapBodySchema.safeParse(raw);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: parsed.error.message },
          { status: 400 },
        );
      }

      const { characterId } = parsed.data;

      const household = await getOwnedHousehold(parent.id);
      if (!household) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "User does not own a household" },
          { status: 403 },
        );
      }

      const character = await getCharacterById(parent.id, household.id, characterId);
      if (!character) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Character not found or not accessible" },
          { status: 403 },
        );
      }

      const originPackages = await listOriginPackages(parent.id, household.id, character.childProfileId);
      const acceptedPackage = originPackages.find(
        (p: { accepted: boolean }) => p.accepted === true,
      );
      if (!acceptedPackage) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "No accepted origin package found for this character" },
          { status: 400 },
        );
      }

      const seeds = acceptedPackage.payload as Record<string, unknown>;
      const universeSeed = (seeds.universeSeed as string) ?? `universe-${characterId.slice(0, 8)}`;

      const { createWorldFromOrigin } = await import("@lumi/world");
      const result = await createWorldFromOrigin({
        householdId: household.id,
        childProfileId: character.childProfileId,
        characterId,
        universeSeed,
        originSeed: acceptedPackage.id,
        acceptedCandidateSeed: (seeds.candidateSeed as string) ?? acceptedPackage.id,
        generatorVersion: "v1.0.0",
        vectorVersion: "v1.0.0",
        originPackage: {
          characterType: character.characterType ?? character.broadKind,
          subtype: character.subtype ?? "standard",
          originConcept: character.originConcept ?? "A character exploring their world",
          startingRegionArchetype: character.startingLocation ?? "Starting Area",
          startingLocation: character.startingLocation ?? "Home Base",
          homeArchetype: character.homeArchetype ?? "Home",
          nearbyNpcSeed: (seeds.nearbyNpcSeed as string) ?? "friendly_neighbor",
          firstMysterySeed: (seeds.firstMysterySeed as string) ?? "mystery_seed",
        },
        actorUserId: parent.id,
      });

      return NextResponse.json({ world: result }, { status: 201 });
    } catch (error) {
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      if (err.name === "AuthorizationError" || message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      if (err.name === "NotFoundError") {
        return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
      }
      if (err.name === "ValidationError") {
        return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
      }
      if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
        return NextResponse.json({ error: "VERSION_CONFLICT", message }, { status: 409 });
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to create world" },
        { status: 500 },
      );
    }
  });
}, "/api/world");
