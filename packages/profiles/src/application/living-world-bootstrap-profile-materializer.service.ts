import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import {
  characterOriginPackages,
  characterRelationships,
  lumiCharacters,
} from "../db/schema/profile";
import type { SocialEcologyRoleType } from "../domain/character-genesis";
import type { BroadCharacterKind, CharacterType } from "../domain/types";
import { getProfileDb } from "./db";
import type { SocialEcologyMaterializationPlan } from "./living-world-bootstrap.service";

export interface EnsureBootstrapNpcIdentityInput {
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  idempotencyKey: string;
  plan: SocialEcologyMaterializationPlan;
}

export interface EnsureBootstrapNpcIdentityResult {
  npcId: string;
  reused: boolean;
}

export interface EnsureBootstrapRelationshipInput {
  householdId: string;
  characterId: string;
  npcId: string;
  roleType: SocialEcologyRoleType;
  relationshipSeed: number;
}

export interface EnsureBootstrapRelationshipResult {
  entityId: string;
  reused: boolean;
}

export function stableBootstrapUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function broadKindForRole(
  roleType: SocialEcologyRoleType,
  fallback: BroadCharacterKind,
): BroadCharacterKind {
  if (roleType === "facility_ai" || roleType === "maintenance_companion") {
    return "robot";
  }
  if (
    roleType === "symbiotic_creature" ||
    roleType === "predator" ||
    roleType === "local_guardian"
  ) {
    return "animal";
  }
  return fallback;
}

function characterTypeForRole(roleType: SocialEcologyRoleType): CharacterType {
  if (
    roleType === "caregiver" ||
    roleType === "rescuer" ||
    roleType === "local_guardian" ||
    roleType === "maintenance_companion"
  ) {
    return "helper";
  }
  if (roleType === "creator" || roleType === "facility_ai") return "inventor";
  if (roleType === "mentor") return "storyteller";
  if (roleType === "unknown_presence" || roleType === "distant_kin_signal") {
    return "dreamer";
  }
  return "explorer";
}

function displayName(plan: SocialEcologyMaterializationPlan): string {
  const label = plan.role.label.trim();
  if (label.length > 0) return label.slice(0, 120);
  return plan.role.roleType.replaceAll("_", " ").slice(0, 120);
}

function relationshipStrength(seed: number): number {
  return Math.max(0, Math.min(1, (seed + 1) / 2));
}

export async function ensureBootstrapNpcIdentity(
  input: EnsureBootstrapNpcIdentityInput,
): Promise<EnsureBootstrapNpcIdentityResult> {
  const db = getProfileDb();
  const npcId = stableBootstrapUuid(
    `${input.idempotencyKey}:npc:${input.plan.role.id}`,
  );
  const firstOriginPackageId = stableBootstrapUuid(
    `${input.idempotencyKey}:origin:${input.plan.role.id}`,
  );

  return db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(lumiCharacters)
      .where(
        and(
          eq(lumiCharacters.id, input.characterId),
          eq(lumiCharacters.householdId, input.householdId),
          eq(lumiCharacters.childProfileId, input.childProfileId),
        ),
      )
      .limit(1);
    if (!source) throw new Error("BOOTSTRAP_SOURCE_CHARACTER_MISSING");

    const broadKind = broadKindForRole(
      input.plan.role.roleType,
      source.broadKind as BroadCharacterKind,
    );
    const characterType = characterTypeForRole(input.plan.role.roleType);
    const subtype = input.plan.identityHint.slice(0, 80);
    const originConcept = input.plan.role.purpose.slice(0, 500);
    const nearbyNpcSeed = input.plan.support.join(" | ").slice(0, 500);

    await tx
      .insert(characterOriginPackages)
      .values({
        id: firstOriginPackageId,
        childProfileId: input.childProfileId,
        householdId: input.householdId,
        broadKind,
        characterType,
        subtype,
        originMode: "auto",
        universeSeed: source.universeSeed,
        createdBy: "system",
        accepted: false,
        payload: {
          originConcept,
          startingRegionArchetype: source.startingRegionArchetype,
          startingLocation: source.startingLocation,
          homeArchetype: source.homeArchetype,
          nearbyNpcSeed,
          firstMysterySeed: source.firstMysterySeed,
          toneVector: [],
          noveltyMarkers: [
            "living_world_bootstrap",
            input.plan.role.roleType,
          ],
          safetyBounds: source.safetyBounds,
        },
        generationSource: "living_world_bootstrap_v1",
      })
      .onConflictDoNothing({ target: characterOriginPackages.id });

    const [originPackage] = await tx
      .select({
        childProfileId: characterOriginPackages.childProfileId,
        householdId: characterOriginPackages.householdId,
      })
      .from(characterOriginPackages)
      .where(eq(characterOriginPackages.id, firstOriginPackageId))
      .limit(1);
    if (
      !originPackage ||
      originPackage.childProfileId !== input.childProfileId ||
      originPackage.householdId !== input.householdId
    ) {
      throw new Error("BOOTSTRAP_NPC_ORIGIN_SCOPE_CONFLICT");
    }

    const inserted = await tx
      .insert(lumiCharacters)
      .values({
        id: npcId,
        childProfileId: input.childProfileId,
        householdId: input.householdId,
        name: displayName(input.plan),
        broadKind,
        characterType,
        subtype,
        originMode: "auto",
        firstOriginPackageId,
        originConcept,
        startingRegionArchetype: source.startingRegionArchetype,
        startingLocation: source.startingLocation,
        homeArchetype: source.homeArchetype,
        nearbyNpcSeed,
        firstMysterySeed: source.firstMysterySeed,
        universeSeed: source.universeSeed,
        safetyBounds: source.safetyBounds,
        characterSubtype: "npc",
        lifecycleStage: "adulthood",
      })
      .onConflictDoNothing({ target: lumiCharacters.id })
      .returning({ id: lumiCharacters.id });

    const reused = inserted.length === 0;
    const [existing] = await tx
      .select({
        householdId: lumiCharacters.householdId,
        childProfileId: lumiCharacters.childProfileId,
        characterSubtype: lumiCharacters.characterSubtype,
        firstOriginPackageId: lumiCharacters.firstOriginPackageId,
      })
      .from(lumiCharacters)
      .where(eq(lumiCharacters.id, npcId))
      .limit(1);
    if (
      !existing ||
      existing.householdId !== input.householdId ||
      existing.childProfileId !== input.childProfileId ||
      existing.characterSubtype !== "npc" ||
      existing.firstOriginPackageId !== firstOriginPackageId
    ) {
      throw new Error("BOOTSTRAP_NPC_IDEMPOTENCY_SCOPE_CONFLICT");
    }

    await tx.execute(sql`
      INSERT INTO profile.world_npcs (
        character_id,
        character_subtype,
        world_id,
        child_profile_id,
        household_id
      ) VALUES (
        ${npcId}::uuid,
        'npc',
        ${input.worldId}::uuid,
        ${input.childProfileId}::uuid,
        ${input.householdId}::uuid
      )
      ON CONFLICT (character_id) DO NOTHING
    `);

    const registryRows = await tx.execute<{
      character_id: string;
      character_subtype: string;
      world_id: string;
      child_profile_id: string;
      household_id: string;
    }>(sql`
      SELECT
        character_id::text,
        character_subtype,
        world_id::text,
        child_profile_id::text,
        household_id::text
      FROM profile.world_npcs
      WHERE character_id = ${npcId}::uuid
      LIMIT 1
    `);
    const registry = registryRows[0];
    if (
      !registry ||
      registry.character_subtype !== "npc" ||
      registry.world_id !== input.worldId ||
      registry.child_profile_id !== input.childProfileId ||
      registry.household_id !== input.householdId
    ) {
      throw new Error("BOOTSTRAP_NPC_WORLD_SCOPE_CONFLICT");
    }

    return { npcId, reused };
  });
}

export async function ensureBootstrapRelationship(
  input: EnsureBootstrapRelationshipInput,
): Promise<EnsureBootstrapRelationshipResult> {
  const db = getProfileDb();
  const [npc] = await db
    .select({
      id: lumiCharacters.id,
      householdId: lumiCharacters.householdId,
      characterSubtype: lumiCharacters.characterSubtype,
    })
    .from(lumiCharacters)
    .where(eq(lumiCharacters.id, input.npcId))
    .limit(1);
  if (
    !npc ||
    npc.householdId !== input.householdId ||
    npc.characterSubtype !== "npc"
  ) {
    throw new Error("BOOTSTRAP_RELATIONSHIP_NPC_SCOPE_CONFLICT");
  }

  const strength = relationshipStrength(input.relationshipSeed);
  const inserted = await db
    .insert(characterRelationships)
    .values({
      characterId: input.characterId,
      targetCharacterId: input.npcId,
      trust: strength,
      affinity: strength,
      familiarity: Math.max(0.1, Math.min(0.7, strength)),
      relationshipType: input.roleType,
      customTypeLabel: `living-world-bootstrap:v1:${input.roleType}`.slice(
        0,
        120,
      ),
    })
    .onConflictDoNothing({
      target: [
        characterRelationships.characterId,
        characterRelationships.targetCharacterId,
      ],
    })
    .returning({ characterId: characterRelationships.characterId });

  return {
    entityId: `${input.characterId}:${input.npcId}`,
    reused: inserted.length === 0,
  };
}
