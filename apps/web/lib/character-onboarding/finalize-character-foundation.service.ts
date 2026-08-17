import {
  createWorldFromOrigin,
  getWorldForCharacter,
} from "@lumi/world/application";
import {
  completeCharacterFoundationCommit,
  prepareCharacterFoundationCommit,
} from "../../../../packages/profiles/src/application/character-foundation-finalization.service";
import {
  buildOnboardingFoundationRecord,
  getOnboardingFoundationGenerationProvenance,
  projectOnboardingFoundationForFinalReview,
  saveOnboardingFoundationIdempotently,
} from "../../../../packages/profiles/src/application/onboarding-foundation-commit.service";

export async function finalizeCharacterOnboarding(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  const prepared = await prepareCharacterFoundationCommit(userId, input);
  const { evidence } = prepared;

  const existingWorld = await getWorldForCharacter(prepared.characterId);
  const world = existingWorld
    ? { worldId: existingWorld.id }
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
  const review = projectOnboardingFoundationForFinalReview(evidence, foundation);

  await completeCharacterFoundationCommit({
    cycleId: prepared.cycleId,
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: prepared.characterId,
    worldId: world.worldId,
    sagaKey: evidence.saga.key,
  });

  return {
    characterId: prepared.characterId,
    cycleId: prepared.cycleId,
    world,
    foundation,
    review,
    bootstrap: {
      status: foundation.bootstrapManifest?.status ?? "planned",
      idempotencyKey: foundation.bootstrapManifest?.idempotencyKey ?? null,
    },
  };
}
