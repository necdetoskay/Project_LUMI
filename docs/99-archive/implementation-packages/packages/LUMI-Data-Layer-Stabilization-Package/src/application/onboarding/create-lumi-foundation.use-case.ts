import { eq } from "drizzle-orm";

import { DrizzleAuditRepository } from "../../db/repositories/audit/drizzle-audit.repository";
import { DrizzleCharacterRepository } from "../../db/repositories/character/drizzle-character.repository";
import { DrizzleInventoryRepository } from "../../db/repositories/inventory/drizzle-inventory.repository";
import { DrizzleOutboxRepository } from "../../db/repositories/system/drizzle-outbox.repository";
import { DrizzleUserRepository } from "../../db/repositories/identity/drizzle-user.repository";
import { DrizzleHouseholdRepository } from "../../db/repositories/profile/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../../db/repositories/profile/drizzle-child-profile.repository";
import { DrizzleWorldRepository } from "../../db/repositories/world/drizzle-world.repository";
import { DrizzleLocationRepository } from "../../db/repositories/world/drizzle-location.repository";

import {
  parentalSettings,
  householdMembers,
  traitDefinitions,
  worldCalendars,
  worldStates,
  simulationPolicies,
} from "../../db/schema";

import { withSerializableTransaction } from "../../db/transaction";

export type CreateLumiFoundationInput = {
  email: string;
  displayName: string;
  householdName: string;
  householdSlug: string;
  childName: string;
  childBirthYear?: number;
  universeName: string;
  universeSlug: string;
  worldName: string;
  worldSlug: string;
  regionName: string;
  regionSlug: string;
  locationName: string;
  locationSlug: string;
  avatarName: string;
  avatarSlug: string;
};

export async function createLumiFoundation(
  input: CreateLumiFoundationInput,
) {
  return withSerializableTransaction(async (tx) => {
    const userRepository = new DrizzleUserRepository(tx);
    const householdRepository = new DrizzleHouseholdRepository(tx);
    const childRepository = new DrizzleChildProfileRepository(tx);
    const worldRepository = new DrizzleWorldRepository(tx);
    const locationRepository = new DrizzleLocationRepository(tx);
    const characterRepository = new DrizzleCharacterRepository(tx);
    const inventoryRepository = new DrizzleInventoryRepository(tx);
    const outboxRepository = new DrizzleOutboxRepository(tx);
    const auditRepository = new DrizzleAuditRepository(tx);

    const user = await userRepository.create({
      email: input.email,
      displayName: input.displayName,
    });

    const household = await householdRepository.create({
      ownerUserId: user.id,
      name: input.householdName,
      slug: input.householdSlug,
    });

    await tx.insert(householdMembers).values({
      householdId: household.id,
      userId: user.id,
      membershipRole: "owner",
    });

    await tx.insert(parentalSettings).values({
      householdId: household.id,
      contentSafetyLevel: "strict",
      allowImageGeneration: false,
      allowVoiceGeneration: false,
      enableBackgroundSimulation: false,
    });

    const child = await childRepository.create({
      householdId: household.id,
      name: input.childName,
      birthYear: input.childBirthYear,
    });

    const universe = await worldRepository.createUniverse({
      householdId: household.id,
      name: input.universeName,
      slug: input.universeSlug,
    });

    const world = await worldRepository.createWorld({
      universeId: universe.id,
      name: input.worldName,
      slug: input.worldSlug,
      status: "active",
    });

    const region = await worldRepository.createRegion({
      worldId: world.id,
      name: input.regionName,
      slug: input.regionSlug,
    });

    const location = await locationRepository.create({
      regionId: region.id,
      name: input.locationName,
      slug: input.locationSlug,
      locationType: "starting_point",
    });

    await tx.insert(worldCalendars).values({
      worldId: world.id,
    });

    await tx.insert(worldStates).values({
      worldId: world.id,
      effectiveAt: new Date(),
      payload: {
        season: "spring",
        weather: "clear",
        daylight: 0.5,
      },
    });

    await tx.insert(simulationPolicies).values({
      worldId: world.id,
      maxCatchUpDays: 10,
      fullIntensityDays: 1,
      minimumIntensity: 0.1,
      freezeAfterLimit: true,
    });

    const character = await characterRepository.create({
      worldId: world.id,
      childProfileId: child.id,
      currentLocationId: location.id,
      name: input.avatarName,
      slug: input.avatarSlug,
      characterType: "child_avatar",
    });

    const inventory = await inventoryRepository.createInventory({
      worldId: world.id,
      ownerCharacterId: character.id,
      inventoryType: "personal",
      name: `${input.avatarName} Envanteri`,
    });

    const defaultTraits = await tx.select().from(traitDefinitions);
    for (const trait of defaultTraits) {
      await characterRepository.setTrait({
        characterId: character.id,
        traitDefinitionId: trait.id,
        value: trait.defaultValue,
        confidence: 1,
      });
    }

    await outboxRepository.enqueue({
      aggregateType: "world",
      aggregateId: world.id,
      eventType: "world.foundation.created",
      payload: {
        userId: user.id,
        householdId: household.id,
        childProfileId: child.id,
        universeId: universe.id,
        worldId: world.id,
        regionId: region.id,
        locationId: location.id,
        characterId: character.id,
        inventoryId: inventory.id,
      },
    });

    await auditRepository.append({
      actorType: "user",
      actorId: user.id,
      action: "lumi.foundation.created",
      entityType: "world",
      entityId: world.id,
      afterState: {
        householdId: household.id,
        childProfileId: child.id,
        universeId: universe.id,
        regionId: region.id,
        locationId: location.id,
        characterId: character.id,
        inventoryId: inventory.id,
      },
    });

    return {
      user,
      household,
      child,
      universe,
      world,
      region,
      location,
      character,
      inventory,
    };
  });
}
