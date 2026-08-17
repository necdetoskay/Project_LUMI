import {
  createWorldFromOrigin,
  getWorldForCharacter,
} from "@lumi/world/application";
import {
  completeCharacterFoundationCommit,
  prepareCharacterFoundationCommit,
} from "../../../../packages/profiles/src/application/character-foundation-finalization.service";
import {
  activateOnboardingFoundationBootstrap,
  buildOnboardingFoundationRecord,
  getOnboardingFoundationGenerationProvenance,
  projectOnboardingFoundationForFinalReview,
  saveOnboardingFoundationIdempotently,
} from "../../../../packages/profiles/src/application/onboarding-foundation-commit.service";
import { runLivingWorldBootstrapForCharacter } from "./living-world-bootstrap.service";

export async function finalizeCharacterOnboarding(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  const prepared = await prepareCharacterFoundationCommit(userId, input);
  const { evidence } = prepared;

  const existingWorld = await getWorldForCharacter(prepared.characterId);
  const world = existingWorld
    ? ({
        worldId: existingWorld.id,
      } as Awaited<ReturnType<typeof createWorldFromOrigin>>)
    : await createWorldFromOrigin({
        householdId: input.householdId,
        childProfileId: input.childProfileId,
        characterId: prepared.characterId,
        universeSeed: evidence.universe.key,
        originSeed: evidence.origin.key,
        acceptedCandidateSeed: evidence.world.key,
        generatorVersion: "character-onboarding-v2",
        vectorVersion: "v1",
        actorUserId: userId,
        originPackage: {
          characterType: String(evidence.characterType ?? "fantasy"),
          subtype: evidence.identity.identity,
          originConcept: evidence.origin.origin,
          startingRegionArchetype: evidence.region.name,
          startingLocation: evidence.region.description,
          homeArchetype: evidence.origin.home,
          nearbyNpcSeed: evidence.origin.formativeExperience,
          firstMysterySeed: evidence.origin.storyHook,
          noveltyMarkers: [
            evidence.world.key,
            evidence.region.key,
            evidence.saga.key,
          ],
          safetyBounds: {},
        },
      });

  const provenance = await getOnboardingFoundationGenerationProvenance(
    prepared.cycleId,
  );
  const candidate = buildOnboardingFoundationRecord({
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: prepared.characterId,
    worldId: world.worldId,
    cycleId: prepared.cycleId,
    evidence,
    ...(provenance.genesis ? { genesisProvenance: provenance.genesis } : {}),
    ...(provenance.saga ? { sagaProvenance: provenance.saga } : {}),
  });
  const foundation = await saveOnboardingFoundationIdempotently(candidate);
  const review = projectOnboardingFoundationForFinalReview(
    evidence,
    foundation,
  );

  await completeCharacterFoundationCommit({
    cycleId: prepared.cycleId,
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: prepared.characterId,
    worldId: world.worldId,
    sagaKey: evidence.saga.key,
  });

  const idempotencyKey = foundation.bootstrapManifest?.idempotencyKey;
  if (!idempotencyKey) {
    throw new Error("CHARACTER_FOUNDATION_BOOTSTRAP_KEY_MISSING");
  }
  await activateOnboardingFoundationBootstrap(
    prepared.characterId,
    idempotencyKey,
  );

  try {
    const bootstrap = await runLivingWorldBootstrapForCharacter(
      prepared.characterId,
    );
    return {
      characterId: prepared.characterId,
      cycleId: prepared.cycleId,
      world,
      foundation,
      review,
      bootstrap: {
        status: bootstrap.status,
        manifestStatus: bootstrap.manifest.status,
        idempotencyKey,
        materialized: bootstrap.manifest.materialized,
        roleCount: bootstrap.plan.roles.length,
      },
    };
  } catch (error) {
    const failureCode =
      error instanceof Error && error.message
        ? error.message.slice(0, 120)
        : "LIVING_WORLD_BOOTSTRAP_FAILED";
    return {
      characterId: prepared.characterId,
      cycleId: prepared.cycleId,
      world,
      foundation,
      review,
      bootstrap: {
        status: "failed" as const,
        manifestStatus: "failed" as const,
        idempotencyKey,
        materialized: foundation.bootstrapManifest?.materialized ?? [],
        roleCount: 0,
        failureCode,
      },
    };
  }
}
