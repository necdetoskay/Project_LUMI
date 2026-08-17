import { and, eq, sql } from "drizzle-orm";

import {
  characterDomainEvents,
  characterFoundations,
} from "../db/schema/profile";
import {
  validateCharacterFoundation,
  validateSagaProgression,
  type CharacterFoundationRecord,
  type SagaCanon,
  type SagaProgression,
} from "../domain/character-genesis";
import { getProfileDb } from "./db";
import {
  projectSagaForStoryContext,
  validateRevealPolicy,
  validateTruthKnowledgeBeliefInvariant,
  type SagaSafeContextProjection,
} from "./saga-foundation.service";

export const SAGA_PROGRESSION_EVENT_TYPE = "saga_progression_advanced";

export interface SagaProgressionMutation {
  addKnownFacts?: string[];
  addCurrentBeliefs?: string[];
  removeCurrentBeliefs?: string[];
  addRevealedClues?: string[];
  addFalseLeads?: string[];
  addUnresolvedQuestions?: string[];
  resolveQuestions?: string[];
  unlockRevealLayerIds?: string[];
  satisfiedPrerequisites?: string[];
}

export interface StoryLocalConsequence {
  kind: string;
  summary: string;
}

/**
 * Story-local consequences are intentionally separate from the optional saga
 * mutation. A story can commit local/world effects without changing saga canon
 * or progression at all.
 */
export interface SagaAwareStoryCommit {
  storyCommitId: string;
  storyLocalConsequences: StoryLocalConsequence[];
  sagaMutation?: SagaProgressionMutation;
}

export interface SagaProgressionAuditPayload {
  storyCommitId: string;
  previousProgressionVersion: number;
  nextProgressionVersion: number;
  previousRevealStage: number;
  nextRevealStage: number;
  mutation: SagaProgressionMutation;
  storyLocalConsequences: StoryLocalConsequence[];
  appliedAt: string;
}

export interface CommitSagaProgressionInput extends SagaAwareStoryCommit {
  characterId: string;
  householdId: string;
  childProfileId: string;
  actorUserId?: string;
  now?: Date;
}

export type CommitSagaProgressionResult =
  | {
      status: "applied";
      foundation: CharacterFoundationRecord;
      projection: SagaSafeContextProjection;
      audit: SagaProgressionAuditPayload;
    }
  | {
      status: "duplicate";
      foundation: CharacterFoundationRecord;
      projection: SagaSafeContextProjection;
    }
  | {
      status: "story-local-only";
      foundation: CharacterFoundationRecord;
      projection: SagaSafeContextProjection;
    };

export function applySagaProgressionMutation(
  canon: SagaCanon,
  current: SagaProgression,
  mutation: SagaProgressionMutation,
  now = new Date(),
): SagaProgression {
  validateSagaProgression(canon, current);
  validateTruthKnowledgeBeliefInvariant(canon, current);
  validateRevealPolicy(canon, current);

  const next: SagaProgression = {
    ...current,
    version: current.version + 1,
    knownFacts: mergeUnique(current.knownFacts, mutation.addKnownFacts),
    currentBeliefs: mergeUnique(
      current.currentBeliefs.filter(
        (belief) =>
          !normalizedSet(mutation.removeCurrentBeliefs).has(normalize(belief)),
      ),
      mutation.addCurrentBeliefs,
    ),
    revealedClues: mergeUnique(
      current.revealedClues,
      mutation.addRevealedClues,
    ),
    falseLeads: mergeUnique(current.falseLeads, mutation.addFalseLeads),
    unresolvedQuestions: mergeUnique(
      current.unresolvedQuestions.filter(
        (question) =>
          !normalizedSet(mutation.resolveQuestions).has(normalize(question)),
      ),
      mutation.addUnresolvedQuestions,
    ),
    revealStage: current.revealStage,
    updatedAt: now,
  };

  advanceEligibleRevealLayers(canon, next, mutation);
  validateSagaProgression(canon, next);
  validateTruthKnowledgeBeliefInvariant(canon, next);
  validateRevealPolicy(canon, next);
  return next;
}

/**
 * Returns exactly the projection allowed into ordinary provider/story context.
 * Deep truth, hidden forces and future reveal layers never cross this boundary.
 */
export function projectFoundationSagaForStory(
  foundation: CharacterFoundationRecord,
): SagaSafeContextProjection {
  validateCharacterFoundation(foundation);
  return projectSagaForStoryContext(
    foundation.sagaCanon,
    foundation.sagaProgression,
  );
}

export async function commitSagaProgressionFromStory(
  input: CommitSagaProgressionInput,
): Promise<CommitSagaProgressionResult> {
  if (!input.storyCommitId.trim()) {
    throw new Error("SAGA_STORY_COMMIT_ID_REQUIRED");
  }

  const db = getProfileDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        version: characterFoundations.version,
        foundation: characterFoundations.foundation,
      })
      .from(characterFoundations)
      .where(
        and(
          eq(characterFoundations.characterId, input.characterId),
          eq(characterFoundations.householdId, input.householdId),
          eq(characterFoundations.childProfileId, input.childProfileId),
        ),
      )
      .limit(1);
    if (!row) throw new Error("CHARACTER_FOUNDATION_NOT_FOUND");
    validateCharacterFoundation(row.foundation);

    const [priorAudit] = await tx
      .select({ id: characterDomainEvents.id })
      .from(characterDomainEvents)
      .where(
        and(
          eq(characterDomainEvents.characterId, input.characterId),
          eq(characterDomainEvents.actorHouseholdId, input.householdId),
          eq(characterDomainEvents.eventType, SAGA_PROGRESSION_EVENT_TYPE),
          sql`${characterDomainEvents.payload}->>'storyCommitId' = ${input.storyCommitId}`,
        ),
      )
      .limit(1);
    if (priorAudit) {
      return {
        status: "duplicate" as const,
        foundation: row.foundation,
        projection: projectFoundationSagaForStory(row.foundation),
      };
    }

    if (!input.sagaMutation) {
      return {
        status: "story-local-only" as const,
        foundation: row.foundation,
        projection: projectFoundationSagaForStory(row.foundation),
      };
    }

    const now = input.now ?? new Date();
    const nextProgression = applySagaProgressionMutation(
      row.foundation.sagaCanon,
      row.foundation.sagaProgression,
      input.sagaMutation,
      now,
    );
    const nextFoundation: CharacterFoundationRecord = {
      ...row.foundation,
      version: row.foundation.version + 1,
      sagaProgression: nextProgression,
      updatedAt: now,
    };
    validateCharacterFoundation(nextFoundation);

    const updated = await tx
      .update(characterFoundations)
      .set({
        version: row.version + 1,
        foundation: nextFoundation,
        updatedAt: now,
      })
      .where(
        and(
          eq(characterFoundations.characterId, input.characterId),
          eq(characterFoundations.householdId, input.householdId),
          eq(characterFoundations.childProfileId, input.childProfileId),
          eq(characterFoundations.version, row.version),
        ),
      )
      .returning({ characterId: characterFoundations.characterId });
    if (updated.length === 0) {
      throw new Error("SAGA_PROGRESSION_OPTIMISTIC_LOCK_CONFLICT");
    }

    const audit: SagaProgressionAuditPayload = {
      storyCommitId: input.storyCommitId,
      previousProgressionVersion: row.foundation.sagaProgression.version,
      nextProgressionVersion: nextProgression.version,
      previousRevealStage: row.foundation.sagaProgression.revealStage,
      nextRevealStage: nextProgression.revealStage,
      mutation: input.sagaMutation,
      storyLocalConsequences: input.storyLocalConsequences,
      appliedAt: now.toISOString(),
    };
    await tx.insert(characterDomainEvents).values({
      characterId: input.characterId,
      eventType: SAGA_PROGRESSION_EVENT_TYPE,
      eventVersion: 1,
      aggregateVersion: nextFoundation.version,
      actorHouseholdId: input.householdId,
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      payload: audit,
      createdAt: now,
    });

    return {
      status: "applied" as const,
      foundation: nextFoundation,
      projection: projectFoundationSagaForStory(nextFoundation),
      audit,
    };
  });
}

function advanceEligibleRevealLayers(
  canon: SagaCanon,
  progression: SagaProgression,
  mutation: SagaProgressionMutation,
): void {
  const requested = new Set(mutation.unlockRevealLayerIds ?? []);
  if (requested.size === 0) return;
  const satisfied = normalizedSet(mutation.satisfiedPrerequisites);
  const layers = [...canon.revealLayers].sort((a, b) => a.order - b.order);

  for (const layer of layers) {
    if (layer.order <= progression.revealStage) continue;
    if (layer.order !== progression.revealStage + 1) break;
    if (!requested.has(layer.id)) break;
    if (
      !layer.prerequisites.every((prerequisite) =>
        satisfied.has(normalize(prerequisite)),
      )
    ) {
      break;
    }

    progression.revealStage = layer.order;
    if (!isProtectedReveal(canon, layer.reveal)) {
      progression.revealedClues = mergeUnique(progression.revealedClues, [
        layer.reveal,
      ]);
    }
  }
}

function isProtectedReveal(canon: SagaCanon, value: string): boolean {
  const normalized = normalize(value);
  return [canon.deepTruth, ...canon.forbiddenEarlyReveals]
    .map(normalize)
    .some((protectedValue) => protectedValue === normalized);
}

function mergeUnique(current: string[], additions?: string[]): string[] {
  const result = [...current];
  const seen = normalizedSet(result);
  for (const value of additions ?? []) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

function normalizedSet(values?: string[]): Set<string> {
  return new Set((values ?? []).map(normalize).filter(Boolean));
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}
