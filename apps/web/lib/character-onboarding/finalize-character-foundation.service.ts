import { createWorldFromOrigin } from "@lumi/world/application";
import { finalizeCharacterFoundation } from "../../../../packages/profiles/src/application/character-foundation-onboarding.service";

export async function finalizeCharacterOnboarding(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  const committed = await finalizeCharacterFoundation(userId, input);
  const { foundation } = committed;
  const world = await createWorldFromOrigin({
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    characterId: committed.characterId,
    universeSeed: foundation.universe.key,
    originSeed: foundation.origin.key,
    acceptedCandidateSeed: foundation.world.key,
    generatorVersion: "character-onboarding-v2",
    vectorVersion: "v1",
    actorUserId: userId,
    originPackage: {
      characterType: foundation.role,
      subtype: foundation.identity.identity,
      originConcept: foundation.origin.origin,
      startingRegionArchetype: foundation.region.name,
      startingLocation: foundation.region.description,
      homeArchetype: foundation.origin.home,
      nearbyNpcSeed: foundation.origin.formativeExperience,
      firstMysterySeed: foundation.origin.storyHook,
      noveltyMarkers: [
        foundation.world.key,
        foundation.region.key,
        foundation.saga.key,
      ],
      safetyBounds: {},
    },
  });
  return { ...committed, world };
}
