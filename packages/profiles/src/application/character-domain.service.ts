import crypto from "node:crypto";
import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { DrizzleCharacterRepository } from "../db/repositories/drizzle/drizzle-character.repository";
import { DrizzleCharacterDomainRepository } from "../db/repositories/drizzle/drizzle-character-domain.repository";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  LumiCharacter,
  validateInfluenceVector,
  DEFAULT_CHILD_AVATAR_TRAITS,
  DEFAULT_NPC_TRAITS,
  TRAIT_DIMENSIONS,
  type CharacterState,
  type TraitVector,
  type EmotionVector,
  type NeedState,
  type GoalState,
  type InfluenceVector,
  type DirectionalRelationship,
  type TraitDeltaEntry,
  type CharacterSubtype,
} from "../domain";
import { createCharacterEvent } from "../domain/events";
import type { CharacterEventType } from "../domain/events";
import type {
  LumiCharacterRecord,
  CharacterTraitStateRecord,
  CharacterEmotionStateRecord,
  CharacterNeedRecord,
  CharacterGoalRecord,
  CharacterInfluenceRecord,
  CharacterRelationshipRecord,
  CharacterDomainEventRecord,
} from "../db";
import type { Database } from "../db/client";

/** @internal test-only */
let _testDb: Database | undefined;
export function __setTestDb(db: Database | undefined): void {
  _testDb = db;
}
function resolveDb(): Database {
  return _testDb ?? getProfileDb();
}

function getRepos(db: unknown = resolveDb()) {
  const database = db as ReturnType<typeof getProfileDb>;
  return {
    householdRepo: new DrizzleHouseholdRepository(database),
    childRepo: new DrizzleChildProfileRepository(database),
    characterRepo: new DrizzleCharacterRepository(database),
    domainRepo: new DrizzleCharacterDomainRepository(database),
    db: database,
  };
}

async function assertScope(
  householdId: string,
  userId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<{ householdId: string }> {
  const household = await repos.householdRepo.findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
  return { householdId: household.id };
}

async function assertCharacterScope(
  characterId: string,
  householdId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<LumiCharacterRecord> {
  const record = await repos.characterRepo.findById(characterId, householdId);
  if (!record) {
    throw new NotFoundError("Character", characterId);
  }
  return record;
}

function toCharacterSubtype(v: unknown): "child_avatar" | "npc" {
  if (v === "child_avatar" || v === "npc") return v;
  return "child_avatar";
}

function toLifecycleStage(
  v: unknown,
): "newborn" | "childhood" | "adolescence" | "adulthood" | "elder" {
  if (
    typeof v === "string" &&
    (v === "newborn" ||
      v === "childhood" ||
      v === "adolescence" ||
      v === "adulthood" ||
      v === "elder")
  ) {
    return v;
  }
  return "childhood";
}

function recordToCharacterState(record: LumiCharacterRecord): CharacterState {
  const rec = record as unknown as Record<string, unknown>;
  const state: CharacterState = {
    id: record.id,
    childProfileId: record.childProfileId,
    householdId: record.householdId,
    name: record.name,
    broadKind: record.broadKind as CharacterState["broadKind"],
    characterType: record.characterType as CharacterState["characterType"],
    subtype: record.subtype,
    originMode: record.originMode as CharacterState["originMode"],
    firstOriginPackageId: record.firstOriginPackageId,
    originConcept: record.originConcept,
    startingRegionArchetype: record.startingRegionArchetype,
    startingLocation: record.startingLocation,
    homeArchetype: record.homeArchetype,
    nearbyNpcSeed: record.nearbyNpcSeed,
    firstMysterySeed: record.firstMysterySeed,
    universeSeed: record.universeSeed,
    safetyBounds: record.safetyBounds as CharacterState["safetyBounds"],
    characterSubtype: toCharacterSubtype(rec.characterSubtype),
    lifecycleStage: toLifecycleStage(rec.lifecycleStage),
    activeLocationId:
      typeof rec.activeLocationId === "string" ? rec.activeLocationId : null,
    activeLocationType:
      typeof rec.activeLocationType === "string"
        ? rec.activeLocationType
        : null,
    version: typeof rec.version === "number" ? rec.version : 1,
    traits: {} as TraitVector,
    emotions: {} as EmotionVector,
    needs: [],
    goals: [],
    influence: {
      emotional: 0,
      social: 0,
      cultural: 0,
      educational: 0,
      political: 0,
      environmental: 0,
      familial: 0,
      spiritual: 0,
      historical: 0,
    },
    relationships: [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
  return state;
}

async function loadCharacterDomain(
  characterId: string,
  repos: ReturnType<typeof getRepos>,
): Promise<{
  traits: CharacterTraitStateRecord[];
  emotions: CharacterEmotionStateRecord[];
  needs: CharacterNeedRecord[];
  goals: CharacterGoalRecord[];
  influence: CharacterInfluenceRecord | null;
  relationships: CharacterRelationshipRecord[];
}> {
  const [traits, emotions, needs, goals, influence, relationships] =
    await Promise.all([
      repos.domainRepo.getTraitStates(characterId),
      repos.domainRepo.getEmotionStates(characterId),
      repos.domainRepo.getNeeds(characterId),
      repos.domainRepo.getGoals(characterId),
      repos.domainRepo.getInfluence(characterId),
      repos.domainRepo.getRelationships(characterId),
    ]);
  return { traits, emotions, needs, goals, influence, relationships };
}

function pickTraitDefaults(subtype: CharacterSubtype): TraitVector {
  return subtype === "npc"
    ? { ...DEFAULT_NPC_TRAITS }
    : { ...DEFAULT_CHILD_AVATAR_TRAITS };
}

function combineState(
  base: CharacterState,
  domain: {
    traits: CharacterTraitStateRecord[];
    emotions: CharacterEmotionStateRecord[];
    needs: CharacterNeedRecord[];
    goals: CharacterGoalRecord[];
    influence: CharacterInfluenceRecord | null;
    relationships: CharacterRelationshipRecord[];
  },
): CharacterState {
  const traits: TraitVector = {};
  for (const t of domain.traits) {
    traits[t.dimension] = t.value;
  }
  const traitDefaults = pickTraitDefaults(base.characterSubtype);
  for (const dim of TRAIT_DIMENSIONS) {
    if (typeof traits[dim] !== "number") {
      const fallback = traitDefaults[dim];
      if (typeof fallback === "number") {
        traits[dim] = fallback;
      }
    }
  }
  const emotions: EmotionVector = {};
  for (const e of domain.emotions) {
    emotions[e.dimension] = e.value;
  }
  const needs: NeedState[] = domain.needs.map((n) => ({
    needType: n.needType as NeedState["needType"],
    value: n.value,
    decay: n.decay,
  }));
  const goals: GoalState[] = domain.goals.map((g) => ({
    id: g.id,
    needType: g.needType as GoalState["needType"],
    description: g.description,
    priority: g.priority,
    status: g.status as GoalState["status"],
    createdAt: g.createdAt,
    completedAt: g.completedAt,
  }));
  const influence: InfluenceVector = domain.influence
    ? {
        emotional: domain.influence.emotional,
        social: domain.influence.social,
        cultural: domain.influence.cultural,
        educational: domain.influence.educational,
        political: domain.influence.political,
        environmental: domain.influence.environmental,
        familial: domain.influence.familial,
        spiritual: domain.influence.spiritual,
        historical: domain.influence.historical,
      }
    : {
        emotional: 0,
        social: 0,
        cultural: 0,
        educational: 0,
        political: 0,
        environmental: 0,
        familial: 0,
        spiritual: 0,
        historical: 0,
      };
  const relationships: DirectionalRelationship[] = domain.relationships.map(
    (r) => {
      const rel: DirectionalRelationship = {
        targetCharacterId: r.targetCharacterId,
        trust: r.trust,
        affinity: r.affinity,
        familiarity: r.familiarity,
        relationshipType:
          r.relationshipType as DirectionalRelationship["relationshipType"],
      };
      if (r.customTypeLabel) {
        rel.customTypeLabel = r.customTypeLabel;
      }
      return rel;
    },
  );
  return { ...base, traits, emotions, needs, goals, influence, relationships };
}

async function emitEvent(
  repo: DrizzleCharacterDomainRepository,
  eventType: CharacterEventType,
  characterState: CharacterState,
  actorHouseholdId: string,
  actorUserId: string | null,
  additionalPayload: Record<string, unknown> = {},
): Promise<void> {
  const event = createCharacterEvent(
    eventType,
    characterState,
    actorHouseholdId,
    actorUserId,
    additionalPayload,
  );
  await repo.createDomainEvent({
    id: event.id,
    characterId: event.characterId,
    eventType: event.eventType,
    eventVersion: event.eventVersion,
    aggregateVersion: event.aggregateVersion,
    actorHouseholdId: event.actorHouseholdId,
    actorUserId: event.actorUserId,
    payload: event.payload,
  });
}

export interface CharacterDomainSummary {
  id: string;
  childProfileId: string;
  householdId: string;
  name: string;
  characterSubtype: string;
  lifecycleStage: string;
  broadKind: string;
  characterType: string;
  subtype: string;
  version: number;
  activeLocationId: string | null;
  activeLocationType: string | null;
  traits: Record<string, number>;
  emotions: Record<string, number>;
  needs: NeedState[];
  goals: GoalState[];
  influence: InfluenceVector;
  relationships: DirectionalRelationship[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getCharacterDomain(
  userId: string,
  householdId: string,
  characterId: string,
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  return {
    id: full.id,
    childProfileId: full.childProfileId,
    householdId: full.householdId,
    name: full.name,
    characterSubtype: full.characterSubtype,
    lifecycleStage: full.lifecycleStage,
    broadKind: full.broadKind,
    characterType: full.characterType,
    subtype: full.subtype,
    version: full.version,
    activeLocationId: full.activeLocationId,
    activeLocationType: full.activeLocationType,
    traits: full.traits,
    emotions: full.emotions,
    needs: full.needs,
    goals: full.goals,
    influence: full.influence,
    relationships: full.relationships,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
  };
}

export async function applyTraitDeltas(
  userId: string,
  householdId: string,
  characterId: string,
  deltas: TraitDeltaEntry[],
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  if (character.isNpc()) {
    throw new ValidationError(
      "NPC_TRAIT_CHANGE_DISALLOWED",
      "NPC trait changes are out of scope",
      "characterSubtype",
    );
  }

  const resolvedDeltas = character.applyTraitDeltas(deltas);

  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    for (const resolved of resolvedDeltas) {
      await txRepos.upsertTraitState({
        characterId,
        dimension: resolved.dimension,
        value: resolved.newValue,
      });
      await txRepos.createTraitHistory({
        id: crypto.randomUUID(),
        characterId,
        dimension: resolved.dimension,
        oldValue: resolved.oldValue,
        newValue: resolved.newValue,
        evidence: resolved.evidence,
        deltaMagnitude: resolved.deltaMagnitude,
        actorHouseholdId: householdId,
        actorUserId: userId,
      });
    }

    await emitEvent(
      txRepos,
      "CHARACTER_TRAIT_CHANGED",
      updatedState,
      householdId,
      userId,
      {
        deltas: resolvedDeltas.map((d) => ({
          dimension: d.dimension,
          oldValue: d.oldValue,
          newValue: d.newValue,
          deltaMagnitude: d.deltaMagnitude,
        })),
      },
    );
  });

  const reloadedRecord = await repos.characterRepo.findById(
    characterId,
    householdId,
  );
  const reloaded = await loadCharacterDomain(characterId, repos);
  const finalState = combineState(
    recordToCharacterState(reloadedRecord!),
    reloaded,
  );
  return summaryFromState(finalState);
}

export async function updateEmotions(
  userId: string,
  householdId: string,
  characterId: string,
  emotions: EmotionVector,
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  character.updateEmotions(emotions);
  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await txRepos.deleteEmotionStates(characterId);
    for (const [dimension, value] of Object.entries(emotions)) {
      await txRepos.upsertEmotionState({
        characterId,
        dimension,
        value,
      });
    }

    await emitEvent(
      txRepos,
      "CHARACTER_EMOTION_UPDATED",
      updatedState,
      householdId,
      userId,
      { emotions },
    );
  });

  const reloadedRecord = await repos.characterRepo.findById(
    characterId,
    householdId,
  );
  const reloaded = await loadCharacterDomain(characterId, repos);
  const finalState = combineState(
    recordToCharacterState(reloadedRecord!),
    reloaded,
  );
  return summaryFromState(finalState);
}

export async function updateNeeds(
  userId: string,
  householdId: string,
  characterId: string,
  needs: NeedState[],
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  character.updateNeeds(needs);
  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await txRepos.deleteNeeds(characterId);
    for (const need of needs) {
      await txRepos.upsertNeed({
        characterId,
        needType: need.needType,
        value: need.value,
        decay: need.decay,
      });
    }

    await emitEvent(
      txRepos,
      "CHARACTER_NEEDS_UPDATED",
      updatedState,
      householdId,
      userId,
      { needs },
    );
  });

  const reloadedRecord = await repos.characterRepo.findById(
    characterId,
    householdId,
  );
  const reloaded = await loadCharacterDomain(characterId, repos);
  const finalState = combineState(
    recordToCharacterState(reloadedRecord!),
    reloaded,
  );
  return summaryFromState(finalState);
}

export async function addGoal(
  userId: string,
  householdId: string,
  characterId: string,
  goal: { needType: string; description: string; priority: number },
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  const newGoal: GoalState = {
    id: crypto.randomUUID(),
    needType: goal.needType as GoalState["needType"],
    description: goal.description,
    priority: goal.priority,
    status: "active",
    createdAt: new Date(),
    completedAt: null,
  };
  character.addGoal(newGoal);
  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await txRepos.createGoal({
      id: newGoal.id,
      characterId,
      needType: newGoal.needType,
      description: newGoal.description,
      priority: newGoal.priority,
      status: "active",
    });

    await emitEvent(
      txRepos,
      "CHARACTER_GOAL_ADDED",
      updatedState,
      householdId,
      userId,
      { goalId: newGoal.id, description: newGoal.description },
    );
  });

  return getCharacterDomain(userId, householdId, characterId);
}

export async function completeGoal(
  userId: string,
  householdId: string,
  characterId: string,
  goalId: string,
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  character.completeGoal(goalId);
  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await txRepos.updateGoal(goalId, characterId, {
      status: "completed",
      completedAt: new Date(),
    });

    await emitEvent(
      txRepos,
      "CHARACTER_GOAL_COMPLETED",
      updatedState,
      householdId,
      userId,
      { goalId },
    );
  });

  return getCharacterDomain(userId, householdId, characterId);
}

export async function upsertInfluence(
  userId: string,
  householdId: string,
  characterId: string,
  influence: Partial<InfluenceVector>,
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);

  const existingInfluence = await repos.domainRepo.getInfluence(characterId);
  const merged: InfluenceVector = {
    emotional: influence.emotional ?? existingInfluence?.emotional ?? 0,
    social: influence.social ?? existingInfluence?.social ?? 0,
    cultural: influence.cultural ?? existingInfluence?.cultural ?? 0,
    educational: influence.educational ?? existingInfluence?.educational ?? 0,
    political: influence.political ?? existingInfluence?.political ?? 0,
    environmental:
      influence.environmental ?? existingInfluence?.environmental ?? 0,
    familial: influence.familial ?? existingInfluence?.familial ?? 0,
    spiritual: influence.spiritual ?? existingInfluence?.spiritual ?? 0,
    historical: influence.historical ?? existingInfluence?.historical ?? 0,
  };
  validateInfluenceVector(merged);

  const updatedState: CharacterState = {
    ...base,
    influence: merged,
    version: base.version + 1,
  };

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await txRepos.upsertInfluence(characterId, merged);

    await emitEvent(
      txRepos,
      "CHARACTER_INFLUENCE_UPDATED",
      updatedState,
      householdId,
      userId,
      { influence: merged },
    );
  });

  return getCharacterDomain(userId, householdId, characterId);
}

export async function addRelationship(
  userId: string,
  householdId: string,
  characterId: string,
  relationship: DirectionalRelationship,
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  character.addRelationship(relationship);
  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await txRepos.createRelationship({
      characterId,
      targetCharacterId: relationship.targetCharacterId,
      trust: relationship.trust,
      affinity: relationship.affinity,
      familiarity: relationship.familiarity,
      relationshipType: relationship.relationshipType,
      customTypeLabel: relationship.customTypeLabel ?? null,
    });

    await emitEvent(
      txRepos,
      "CHARACTER_RELATIONSHIP_ADDED",
      updatedState,
      householdId,
      userId,
      {
        targetCharacterId: relationship.targetCharacterId,
        relationshipType: relationship.relationshipType,
      },
    );
  });

  return getCharacterDomain(userId, householdId, characterId);
}

export async function updateLocation(
  userId: string,
  householdId: string,
  characterId: string,
  locationId: string,
  locationType: string,
): Promise<CharacterDomainSummary> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  const record = await assertCharacterScope(characterId, householdId, repos);
  const base = recordToCharacterState(record);
  const domain = await loadCharacterDomain(characterId, repos);
  const full = combineState(base, domain);
  const character = LumiCharacter.fromState(full);

  character.setActiveLocation(locationId, locationType);
  const updatedState = character.getState();

  const rawDb = resolveDb();
  await rawDb.transaction(async (tx) => {
    const txRepos = new DrizzleCharacterDomainRepository(tx as never);

    const txCharacterRepo = new DrizzleCharacterRepository(tx as never);
    await txCharacterRepo.update(characterId, householdId, {
      activeLocationId: locationId,
      activeLocationType: locationType,
      version: updatedState.version,
      expectedVersion: base.version,
    });

    await emitEvent(
      txRepos,
      "CHARACTER_LOCATION_CHANGED",
      updatedState,
      householdId,
      userId,
      {
        locationId,
        locationType,
      },
    );
  });

  return getCharacterDomain(userId, householdId, characterId);
}

export async function getCharacterEvents(
  userId: string,
  householdId: string,
  characterId: string,
): Promise<CharacterDomainEventRecord[]> {
  const repos = getRepos();
  await assertScope(householdId, userId, repos);
  await assertCharacterScope(characterId, householdId, repos);
  return repos.domainRepo.getDomainEvents(characterId);
}

function summaryFromState(state: CharacterState): CharacterDomainSummary {
  return {
    id: state.id,
    childProfileId: state.childProfileId,
    householdId: state.householdId,
    name: state.name,
    characterSubtype: state.characterSubtype,
    lifecycleStage: state.lifecycleStage,
    broadKind: state.broadKind,
    characterType: state.characterType,
    subtype: state.subtype,
    version: state.version,
    activeLocationId: state.activeLocationId,
    activeLocationType: state.activeLocationType,
    traits: state.traits,
    emotions: state.emotions,
    needs: state.needs,
    goals: state.goals,
    influence: state.influence,
    relationships: state.relationships,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}
