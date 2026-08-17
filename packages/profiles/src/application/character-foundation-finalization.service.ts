import { and, desc, eq } from "drizzle-orm";

import {
  characterCreationCycles,
  characterCreationSelections,
  characterGoals,
  childProfiles,
  lumiCharacters,
  parentalSettings,
} from "../db/schema/profile";
import type {
  AgeBand,
  BroadCharacterKind,
  CharacterType,
} from "../domain/types";
import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";
import type { AcceptedOnboardingFoundationEvidence } from "./onboarding-foundation-commit.service";
import { getProfileDb } from "./db";

function broadKindFromCanonical(value: unknown): BroadCharacterKind {
  const type =
    typeof value === "object" && value
      ? (value as { characterType?: unknown }).characterType
      : value;
  if (type === "human") return "human";
  if (type === "animal") return "animal";
  if (type === "synthetic") return "robot";
  return "fantasy";
}

function roleFromIdentity(identity: { traits?: unknown }): CharacterType {
  const text = JSON.stringify(identity.traits ?? []).toLowerCase();
  if (text.includes("yardım") || text.includes("empati")) return "helper";
  if (text.includes("icat") || text.includes("merak")) return "inventor";
  if (text.includes("hik") || text.includes("anlat")) return "storyteller";
  if (text.includes("hayal") || text.includes("dream")) return "dreamer";
  return "explorer";
}

function readEvidence(
  summary: Record<string, unknown>,
): AcceptedOnboardingFoundationEvidence {
  const identity = summary.characterIdentity as
    | AcceptedOnboardingFoundationEvidence["identity"]
    | undefined;
  const universe = summary.universe as
    | AcceptedOnboardingFoundationEvidence["universe"]
    | undefined;
  const world = summary.world as
    | AcceptedOnboardingFoundationEvidence["world"]
    | undefined;
  const compatibility = summary.compatibility as
    | AcceptedOnboardingFoundationEvidence["compatibility"]
    | undefined;
  const region = summary.region as
    | AcceptedOnboardingFoundationEvidence["region"]
    | undefined;
  const origin = summary.origin as
    | AcceptedOnboardingFoundationEvidence["origin"]
    | undefined;
  const saga = summary.coreSaga as
    | AcceptedOnboardingFoundationEvidence["saga"]
    | undefined;
  if (!identity || !universe || !world || !region || !origin || !saga)
    throw new Error("FOUNDATION_INCOMPLETE");
  return {
    characterType: summary.characterType,
    identity,
    universe,
    world,
    ...(compatibility ? { compatibility } : {}),
    region,
    origin,
    saga,
  };
}

export async function prepareCharacterFoundationCommit(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  const active = await getActiveCharacterCreationCycle(
    userId,
    input.householdId,
    input.childProfileId,
  );
  const db = getProfileDb();
  const [latest] = active
    ? [active]
    : await db
        .select()
        .from(characterCreationCycles)
        .where(
          and(
            eq(characterCreationCycles.householdId, input.householdId),
            eq(characterCreationCycles.childProfileId, input.childProfileId),
          ),
        )
        .orderBy(desc(characterCreationCycles.updatedAt))
        .limit(1);
  const cycle = active ?? latest;
  const resumableCompleted =
    cycle?.status === "completed" && cycle.currentStep === "completed";
  if (!cycle || (!resumableCompleted && cycle.currentStep !== "final_review"))
    throw new Error("FINAL_REVIEW_REQUIRED");

  const summary = (cycle.latestSummary ?? {}) as Record<string, unknown>;
  const evidence = readEvidence(summary);
  const existingCharacterId =
    typeof summary.committedCharacterId === "string"
      ? summary.committedCharacterId
      : null;
  if (existingCharacterId) {
    const [existing] = await db
      .select({ id: lumiCharacters.id })
      .from(lumiCharacters)
      .where(
        and(
          eq(lumiCharacters.id, existingCharacterId),
          eq(lumiCharacters.householdId, input.householdId),
          eq(lumiCharacters.childProfileId, input.childProfileId),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("PREPARED_CHARACTER_MISSING");
    return { characterId: existingCharacterId, cycleId: cycle.id, evidence };
  }
  if (resumableCompleted)
    throw new Error("COMPLETED_FOUNDATION_CHARACTER_MISSING");

  const [child] = await db
    .select({ ageBand: childProfiles.ageBand })
    .from(childProfiles)
    .where(
      and(
        eq(childProfiles.id, input.childProfileId),
        eq(childProfiles.householdId, input.householdId),
      ),
    )
    .limit(1);
  const [policy] = await db
    .select({
      contentBoundary: parentalSettings.contentBoundary,
      requireParentApprovalForAi: parentalSettings.requireParentApprovalForAi,
    })
    .from(parentalSettings)
    .where(eq(parentalSettings.householdId, input.householdId))
    .limit(1);
  if (!child || !policy) throw new Error("FOUNDATION_SCOPE_DATA_REQUIRED");

  const characterId = crypto.randomUUID();
  const role = roleFromIdentity(evidence.identity);
  const broadKind = broadKindFromCanonical(evidence.characterType);
  const latestSummary = {
    ...summary,
    committedCharacterId: characterId,
    foundationCommitState: "prepared",
  };

  await db.transaction(async (tx) => {
    await tx.insert(lumiCharacters).values({
      id: characterId,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      name: evidence.identity.name.slice(0, 120),
      broadKind,
      characterType: role,
      subtype:
        evidence.identity.identity.slice(0, 80) ||
        evidence.identity.name.slice(0, 80),
      originMode: "manual",
      firstOriginPackageId: crypto.randomUUID(),
      originConcept: evidence.origin.origin.slice(0, 500),
      startingRegionArchetype: evidence.region.name.slice(0, 120),
      startingLocation: evidence.region.description.slice(0, 200),
      homeArchetype: evidence.origin.home.slice(0, 120),
      nearbyNpcSeed: evidence.origin.formativeExperience.slice(0, 500),
      firstMysterySeed: evidence.origin.storyHook.slice(0, 500),
      universeSeed: evidence.universe.key.slice(0, 120),
      safetyBounds: {
        ageBand: child.ageBand as AgeBand,
        contentBoundary: policy.contentBoundary as
          | "strict"
          | "moderate"
          | "open",
        requireParentApprovalForAi: policy.requireParentApprovalForAi,
      },
    });
    await tx.insert(characterGoals).values({
      id: crypto.randomUUID(),
      characterId,
      needType: "core_saga",
      description:
        `${evidence.saga.title}: ${evidence.saga.longTermGoal}`.slice(0, 500),
      priority: 1,
      status: "active",
    });
    await tx
      .update(characterCreationCycles)
      .set({ latestSummary, updatedAt: new Date() })
      .where(eq(characterCreationCycles.id, cycle.id));
  });
  return { characterId, cycleId: cycle.id, evidence };
}

export async function completeCharacterFoundationCommit(input: {
  cycleId: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  worldId: string;
  sagaKey: string;
}): Promise<void> {
  const db = getProfileDb();
  const [cycle] = await db
    .select()
    .from(characterCreationCycles)
    .where(
      and(
        eq(characterCreationCycles.id, input.cycleId),
        eq(characterCreationCycles.householdId, input.householdId),
        eq(characterCreationCycles.childProfileId, input.childProfileId),
      ),
    )
    .limit(1);
  if (!cycle) throw new Error("FOUNDATION_CYCLE_MISSING");
  if (cycle.status === "completed") return;
  const summary = (cycle.latestSummary ?? {}) as Record<string, unknown>;
  if (summary.committedCharacterId !== input.characterId)
    throw new Error("FOUNDATION_CHARACTER_MISMATCH");

  await db.transaction(async (tx) => {
    await tx.insert(characterCreationSelections).values({
      id: crypto.randomUUID(),
      cycleId: input.cycleId,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      stepKey: "final_review",
      selectionKey: "commit",
      selectionPayload: {
        characterId: input.characterId,
        worldId: input.worldId,
        sagaKey: input.sagaKey,
      },
      selectedBy: "user",
    });
    await tx
      .update(characterCreationCycles)
      .set({
        status: "completed",
        currentStep: "completed",
        latestSummary: {
          ...summary,
          foundationCommitState: "committed",
          committedWorldId: input.worldId,
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(characterCreationCycles.id, input.cycleId),
          eq(characterCreationCycles.status, "draft"),
        ),
      );
  });
}
