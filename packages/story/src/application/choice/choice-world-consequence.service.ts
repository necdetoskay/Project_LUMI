import { DrizzleStoryRepository } from "../../db/repositories/drizzle/drizzle-story.repository";
import { ValidationError, NotFoundError } from "../../domain/errors";
import type { ChoiceConsequencePreview } from "../../domain/choice";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
  type OutcomeChange,
  type WorldChange,
} from "../../domain/outcome";
import type { StoryContinuityFact } from "../story-continuity-context";
import { getStoryDb } from "../db";
import { hashObject } from "../hash";
import { WorldCommitService, type CommitResult } from "../world-commit.service";

export const CHOICE_WORLD_HANDOFF_RULE_VERSION = "choice-world-handoff-v1";

export interface CommitPersistedChoiceConsequenceInput {
  storySessionId: string;
  committedChoiceId: string;
  householdId: string;
  worldId: string;
}

export interface CommitPersistedChoiceConsequenceResult {
  ruleVersion: string;
  manifest: OutcomeManifest;
  commit: CommitResult;
  evidenceRef: string;
}

function parseConsequencePreviews(value: unknown): ChoiceConsequencePreview[] {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is ChoiceConsequencePreview => {
    if (!entry || typeof entry !== "object") return false;
    const preview = entry as Record<string, unknown>;
    return (
      typeof preview.consequenceType === "string" &&
      typeof preview.previewText === "string"
    );
  });
}

function toWorldFlagChanges(input: {
  previews: ChoiceConsequencePreview[];
  worldId: string;
  committedChoiceId: string;
  consequenceId: string;
  evidenceSceneId: string;
  optionId: string;
}): OutcomeChange[] {
  const changes: OutcomeChange[] = [];

  for (const [index, preview] of input.previews.entries()) {
    if (
      preview.consequenceType !== "flag_set" &&
      preview.consequenceType !== "flag_remove"
    ) {
      continue;
    }

    const targetKey = preview.targetKey?.trim();
    if (!targetKey) {
      throw new ValidationError(
        "CHOICE_WORLD_FLAG_TARGET_MISSING",
        `Choice consequence preview ${index} requires targetKey`,
      );
    }

    changes.push({
      key: `choice:${input.committedChoiceId}:preview:${index}`,
      outcomeType: "world_flag_update",
      entityId: input.worldId,
      operation: "set",
      field: `flags.${targetKey}`,
      value: preview.consequenceType === "flag_set",
      evidenceRef: [
        `choice:${input.committedChoiceId}`,
        `consequence:${input.consequenceId}`,
        `scene:${input.evidenceSceneId}`,
        `option:${input.optionId}`,
        `rule:${CHOICE_WORLD_HANDOFF_RULE_VERSION}`,
      ].join("|"),
      priority: index + 1,
    });
  }

  return changes;
}

export async function commitPersistedChoiceConsequence(
  input: CommitPersistedChoiceConsequenceInput,
): Promise<CommitPersistedChoiceConsequenceResult> {
  const db = getStoryDb();
  const repo = new DrizzleStoryRepository();

  const session = await repo.findSessionById(db, input.storySessionId);
  if (!session) {
    throw new NotFoundError("StorySession", input.storySessionId);
  }
  if (
    session.householdId !== input.householdId ||
    session.worldId !== input.worldId
  ) {
    throw new ValidationError(
      "CHOICE_WORLD_SCOPE_MISMATCH",
      "Committed choice world handoff must remain in the session household/world scope",
    );
  }

  const committedChoices = await repo.findCommittedChoicesBySession(
    db,
    input.storySessionId,
  );
  const committed = committedChoices.find(
    (choice) => choice.id === input.committedChoiceId,
  );
  if (!committed) {
    throw new NotFoundError("CommittedChoice", input.committedChoiceId);
  }

  const consequences = await repo.findConsequencesBySession(
    db,
    input.storySessionId,
  );
  const persistedConsequence = consequences.find(
    (consequence) => consequence.committedChoiceId === committed.id,
  );
  if (!persistedConsequence) {
    throw new NotFoundError("ChoiceConsequence", committed.id);
  }

  const option = await repo.findChoiceOptionById(db, committed.optionId);
  if (!option || option.choicePointId !== committed.choicePointId) {
    throw new NotFoundError("ChoiceOption", committed.optionId);
  }

  const previews = parseConsequencePreviews(option.consequencePreviews);
  const changes = toWorldFlagChanges({
    previews,
    worldId: session.worldId,
    committedChoiceId: committed.id,
    consequenceId: persistedConsequence.id,
    evidenceSceneId: committed.evidenceSceneId,
    optionId: committed.optionId,
  });
  if (changes.length === 0) {
    throw new ValidationError(
      "CHOICE_WORLD_CONSEQUENCE_UNSUPPORTED",
      "Persisted choice has no supported world consequence preview",
    );
  }

  const worldVersion = await repo.getWorldVersion(
    db,
    session.householdId,
    session.worldId,
  );
  const currentVersion = worldVersion ? Number(worldVersion.currentVersion) : 1;
  const worldStateHash =
    worldVersion?.worldStateHash ??
    (await hashObject({
      householdId: session.householdId,
      worldId: session.worldId,
      version: currentVersion,
    }));

  const manifest = OutcomeManifest.create({
    id: committed.id,
    storySessionId: session.id,
    householdId: session.householdId,
    worldId: session.worldId,
    source: "story_scene",
    sourceSceneId: committed.evidenceSceneId,
    changes,
    status: "validated",
  });
  const snapshot = StoryContextSnapshot.create({
    storySessionId: session.id,
    householdId: session.householdId,
    worldId: session.worldId,
    worldStateHash,
    entities: [
      {
        entityId: session.worldId,
        entityKind: "world",
        state: {
          currentVersion,
          worldStateHash,
        },
        stateHash: worldStateHash,
      },
    ],
  });

  const commit = await new WorldCommitService().commitManifest({
    manifest,
    snapshot,
    extractor: new NarrativeEventExtractor(),
    validator: new EvidenceValidator(),
    ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
  });

  return {
    ruleVersion: CHOICE_WORLD_HANDOFF_RULE_VERSION,
    manifest,
    commit,
    evidenceRef: changes[0]!.evidenceRef,
  };
}

function renderContinuityValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export async function getLatestChoiceWorldContinuityFacts(
  householdId: string,
  worldId: string,
): Promise<StoryContinuityFact[]> {
  const db = getStoryDb();
  const repo = new DrizzleStoryRepository();
  const worldVersion = await repo.getWorldVersion(db, householdId, worldId);
  if (!worldVersion?.lastManifestId) return [];

  const commit = await repo.findCommitByManifest(
    db,
    worldVersion.lastManifestId,
  );
  if (
    !commit ||
    commit.householdId !== householdId ||
    commit.worldId !== worldId
  ) {
    return [];
  }

  const changes = Array.isArray(commit.changes)
    ? (commit.changes as WorldChange[])
    : [];

  return changes
    .filter((change) => change.evidenceRef.startsWith("choice:"))
    .slice(0, 4)
    .map((change) => ({
      key: `choice-world:${commit.id}:${change.changeKey}`,
      summary: `Kalıcı seçim sonucu: ${change.field}=${renderContinuityValue(change.value)}.`,
      source: `choice_world_commit:${commit.id}`,
    }));
}
