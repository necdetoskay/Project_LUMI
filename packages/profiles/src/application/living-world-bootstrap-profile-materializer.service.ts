import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { lumiCharacters } from "../db/schema/profile";
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

export async function ensureBootstrapNpcIdentity(
  input: EnsureBootstrapNpcIdentityInput,
): Promise<EnsureBootstrapNpcIdentityResult> {
  const db = getProfileDb();
  const npcId = stableBootstrapUuid(
    `${input.idempotencyKey}:npc:${input.plan.role.id}`,
  );
  const [existing] = await db
    .select({
      id: lumiCharacters.id,
      householdId: lumiCharacters.householdId,
      childProfileId: lumiCharacters.childProfileId,
      characterSubtype: lumiCharacters.characterSubtype,
    })
    .from(lumiCharacters)
    .where(eq(lumiCharacters.id, npcId))
    .limit(1);

  if (existing) {
    if (
      existing.householdId !== input.householdId ||
      existing.childProfileId !== input.childProfileId ||
      existing.characterSubtype !== "npc"
    ) {
      throw new Error("BOOTSTRAP_NPC_IDEMPOTENCY_SCOPE_CONFLICT");
    }
    return { npcId, reused: true };
  }

  const [source] = await db
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

  const firstOriginPackageId = stableBootstrapUuid(
    `${input.idempotencyKey}:origin:${input.plan.role.id}`,
  );
  await db.insert(lumiCharacters).values({
    id: npcId,
    childProfileId: input.childProfileId,
    householdId: input.householdId,
    name: displayName(input.plan),
    broadKind: broadKindForRole(
      input.plan.role.roleType,
      source.broadKind as BroadCharacterKind,
    ),
    characterType: characterTypeForRole(input.plan.role.roleType),
    subtype: input.plan.identityHint.slice(0, 80),
    originMode: "auto",
    firstOriginPackageId,
    originConcept: input.plan.role.purpose.slice(0, 500),
    startingRegionArchetype: source.startingRegionArchetype,
    startingLocation: source.startingLocation,
    homeArchetype: source.homeArchetype,
    nearbyNpcSeed: input.plan.support.join(" | ").slice(0, 500),
    firstMysterySeed: source.firstMysterySeed,
    universeSeed: source.universeSeed,
    safetyBounds: source.safetyBounds,
    characterSubtype: "npc",
    lifecycleStage: "adulthood",
  });

  return { npcId, reused: false };
}
