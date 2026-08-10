import { and, asc, eq } from "drizzle-orm";
import type {
  CandidateAction,
  DecisionContextVector,
  UtilityWeightPolicy,
} from "../../../domain";
import { validateWeightPolicy } from "../../../domain/utility";
import { getNpcDb, type Database } from "../../client";
import { npcSnapshots } from "../../schema/npc-intelligence/npc-snapshots";

export interface NpcMoveCharacterEffectIntent {
  type: "move_character";
  targetLocationId: string;
}

export type NpcWorldEffectIntent = NpcMoveCharacterEffectIntent;

export interface CanonicalNpcDecisionPayload {
  decisionKey: string;
  candidates: CandidateAction[];
  context: DecisionContextVector;
  policy: UtilityWeightPolicy;
  seed: string;
  effectsByCandidateId?: Record<string, NpcWorldEffectIntent>;
}

interface PersistedNpcDecisionPayload {
  decisionKey: string;
  candidates: CandidateAction[];
  context: DecisionContextVector;
  policy: Omit<UtilityWeightPolicy, "updatedAt"> & { updatedAt: string };
  seed: string;
  effectsByCandidateId?: Record<string, NpcWorldEffectIntent>;
}

export interface CanonicalNpcSnapshot {
  npcId: string;
  householdId: string;
  worldId: string;
  childProfileId: string;
  characterId: string;
  locationId: string | null;
  needTypes: string[];
  relationshipToCharacter: number;
  decisionPayload?: CanonicalNpcDecisionPayload | null;
  lastInteractionAt: Date;
  updatedAt: Date;
}

export type UpsertCanonicalNpcSnapshotInput = CanonicalNpcSnapshot;

function persistDecisionPayload(
  payload: CanonicalNpcDecisionPayload | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  const persisted: PersistedNpcDecisionPayload = {
    decisionKey: payload.decisionKey,
    candidates: payload.candidates.map((candidate) => ({ ...candidate })),
    context: { ...payload.context },
    policy: {
      ...payload.policy,
      weights: { ...payload.policy.weights },
      updatedAt: payload.policy.updatedAt.toISOString(),
    },
    seed: payload.seed,
    ...(payload.effectsByCandidateId
      ? { effectsByCandidateId: { ...payload.effectsByCandidateId } }
      : {}),
  };
  return persisted as unknown as Record<string, unknown>;
}

function validCandidates(value: unknown): value is CandidateAction[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((candidate) => {
      if (!candidate || typeof candidate !== "object") return false;
      const item = candidate as Partial<CandidateAction>;
      return (
        typeof item.id === "string" &&
        item.id.length > 0 &&
        typeof item.kind === "string" &&
        item.kind.length > 0 &&
        typeof item.description === "string" &&
        Array.isArray(item.requiredFactIds) &&
        Array.isArray(item.needTypes) &&
        typeof item.personalityFit === "number" &&
        Number.isFinite(item.personalityFit) &&
        (item.safety === "safe" ||
          item.safety === "conditional" ||
          item.safety === "blocked")
      );
    })
  );
}

function validEffects(
  value: unknown,
  candidateIds: ReadonlySet<string>,
): value is Record<string, NpcWorldEffectIntent> | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([candidateId, effect]) => {
    if (!candidateIds.has(candidateId)) return false;
    if (!effect || typeof effect !== "object" || Array.isArray(effect)) {
      return false;
    }
    const item = effect as Partial<NpcMoveCharacterEffectIntent>;
    return (
      item.type === "move_character" &&
      typeof item.targetLocationId === "string" &&
      item.targetLocationId.length > 0
    );
  });
}

function restoreDecisionPayload(
  value: Record<string, unknown> | null,
): CanonicalNpcDecisionPayload | null {
  if (!value) return null;
  const raw = value as Partial<PersistedNpcDecisionPayload>;
  if (
    typeof raw.decisionKey !== "string" ||
    raw.decisionKey.length === 0 ||
    typeof raw.seed !== "string" ||
    raw.seed.length === 0 ||
    !validCandidates(raw.candidates) ||
    !raw.context ||
    typeof raw.context !== "object" ||
    !raw.policy ||
    typeof raw.policy !== "object" ||
    typeof raw.policy.updatedAt !== "string"
  ) {
    return null;
  }

  const candidateIds = new Set(raw.candidates.map((candidate) => candidate.id));
  if (!validEffects(raw.effectsByCandidateId, candidateIds)) return null;

  const context = raw.context as DecisionContextVector;
  if (
    typeof context.npcId !== "string" ||
    typeof context.householdId !== "string" ||
    !Array.isArray(context.relationships) ||
    !Array.isArray(context.needs) ||
    !Array.isArray(context.goals) ||
    !context.influence ||
    typeof context.influence !== "object"
  ) {
    return null;
  }

  const updatedAt = new Date(raw.policy.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return null;
  const policy = {
    ...raw.policy,
    weights: { ...raw.policy.weights },
    updatedAt,
  } as UtilityWeightPolicy;
  try {
    validateWeightPolicy(policy);
  } catch {
    return null;
  }

  return {
    decisionKey: raw.decisionKey,
    candidates: raw.candidates.map((candidate) => ({ ...candidate })),
    context: { ...context },
    policy,
    seed: raw.seed,
    ...(raw.effectsByCandidateId
      ? { effectsByCandidateId: { ...raw.effectsByCandidateId } }
      : {}),
  };
}

function mapSnapshot(
  row: typeof npcSnapshots.$inferSelect,
): CanonicalNpcSnapshot {
  return {
    npcId: row.npcId,
    householdId: row.householdId,
    worldId: row.worldId,
    childProfileId: row.childProfileId,
    characterId: row.characterId,
    locationId: row.locationId,
    needTypes: row.needTypes ?? [],
    relationshipToCharacter: Number(row.relationshipToCharacter),
    decisionPayload: restoreDecisionPayload(row.decisionPayload),
    lastInteractionAt: row.lastInteractionAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleNpcSnapshotRepository {
  constructor(private readonly db: Database = getNpcDb()) {}

  async upsert(input: UpsertCanonicalNpcSnapshotInput): Promise<void> {
    const persistedDecisionPayload = persistDecisionPayload(
      input.decisionPayload,
    );
    await this.db
      .insert(npcSnapshots)
      .values({
        id: crypto.randomUUID(),
        npcId: input.npcId,
        householdId: input.householdId,
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        characterId: input.characterId,
        locationId: input.locationId,
        needTypes: [...input.needTypes],
        relationshipToCharacter: String(input.relationshipToCharacter),
        decisionPayload: persistedDecisionPayload,
        lastInteractionAt: input.lastInteractionAt,
        updatedAt: input.updatedAt,
      })
      .onConflictDoUpdate({
        target: [
          npcSnapshots.householdId,
          npcSnapshots.worldId,
          npcSnapshots.childProfileId,
          npcSnapshots.npcId,
        ],
        set: {
          characterId: input.characterId,
          locationId: input.locationId,
          needTypes: [...input.needTypes],
          relationshipToCharacter: String(input.relationshipToCharacter),
          ...(input.decisionPayload !== undefined
            ? { decisionPayload: persistedDecisionPayload }
            : {}),
          lastInteractionAt: input.lastInteractionAt,
          updatedAt: input.updatedAt,
        },
      });
  }

  async listForWorker(
    householdId: string,
    worldId: string,
    limit = 64,
  ): Promise<CanonicalNpcSnapshot[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 64));
    const rows = await this.db
      .select()
      .from(npcSnapshots)
      .where(
        and(
          eq(npcSnapshots.householdId, householdId),
          eq(npcSnapshots.worldId, worldId),
        ),
      )
      .orderBy(asc(npcSnapshots.npcId), asc(npcSnapshots.childProfileId))
      .limit(boundedLimit);

    return rows.map(mapSnapshot);
  }

  async listDecisionReady(
    householdId: string,
    worldId: string,
    childProfileId: string,
    limit = 64,
  ): Promise<CanonicalNpcSnapshot[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 64));
    const rows = await this.db
      .select()
      .from(npcSnapshots)
      .where(
        and(
          eq(npcSnapshots.householdId, householdId),
          eq(npcSnapshots.worldId, worldId),
          eq(npcSnapshots.childProfileId, childProfileId),
        ),
      )
      .orderBy(asc(npcSnapshots.npcId))
      .limit(boundedLimit);

    return rows.map(mapSnapshot).filter((snapshot) => snapshot.decisionPayload);
  }
}
