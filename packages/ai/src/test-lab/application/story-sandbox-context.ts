import type { WorkingStoryItem } from "@lumi/context";

import type { JsonObject, JsonValue } from "../domain/test-lab-types";
import { storyNumberFromPhaseId } from "../domain/story-scenario";
import { TestLabInvariantError } from "../domain/test-lab-errors";

export interface StorySandboxScope {
  worldId: string;
  sourceFamily: "world_event" | "rumor" | "inventory_item" | "npc_call";
  sourceTitle: string;
  sourceTeaser: string | null;
  characterId: string | null;
  sourceNpcIds: string[];
  stories: JsonObject[];
}

export function readStorySandboxScope(
  parentState: JsonObject,
  phaseId: string,
): StorySandboxScope {
  const storyNumber = storyNumberFromPhaseId(phaseId);
  if (!storyNumber) {
    throw new TestLabInvariantError(`TEST_LAB_INVALID_STORY_PHASE:${phaseId}`);
  }

  const storyLab = asObject(parentState["storyLab"], "storyLab");
  const stories = asObjectArray(storyLab["stories"] ?? []);
  if (stories.length !== storyNumber - 1) {
    throw new TestLabInvariantError(
      `TEST_LAB_STORY_LINEAGE_MISMATCH:${phaseId}:${stories.length}`,
    );
  }

  return {
    worldId: requiredString(storyLab["worldId"], "storyLab.worldId"),
    sourceFamily: sourceFamily(storyLab["sourceFamily"]),
    sourceTitle: requiredString(
      storyLab["sourceTitle"],
      "storyLab.sourceTitle",
    ),
    sourceTeaser: optionalString(storyLab["sourceTeaser"]),
    characterId: optionalString(storyLab["characterId"]),
    sourceNpcIds: stringArray(storyLab["sourceNpcIds"]),
    stories,
  };
}

export function buildWorkingStoryFromSandboxState(
  parentState: JsonObject,
  scope: StorySandboxScope,
): WorkingStoryItem {
  const storyLab = asObject(parentState["storyLab"], "storyLab");
  const selectedStoryFacts = scope.stories
    .map((story, index) => selectedStoryFact(story, index + 1))
    .filter((value): value is string => Boolean(value));

  return {
    mode: "test_lab",
    sceneGoal: `Continue the selected sandbox lineage with: ${scope.sourceTitle}`,
    worldFacts: [
      ...stringArray(storyLab["worldFacts"]),
      ...stateFacts(parentState["world"], "World"),
    ],
    activeCharacterContexts: scope.characterId
      ? [
          {
            characterId: scope.characterId,
            currentState: stateFacts(parentState["character"], "Character"),
            activeGoal: optionalString(storyLab["activeGoal"]) ?? "",
            relevantMemories: stateFacts(parentState["memories"], "Memory"),
            relationshipNotes: stateFacts(
              parentState["relationships"],
              "Relationship",
            ),
            beliefNotes: stateFacts(parentState["beliefs"], "Belief"),
            behaviorGuidance: stringArray(storyLab["behaviorGuidance"]),
          },
        ]
      : [],
    playerKnownFacts: [
      ...stringArray(storyLab["playerKnownFacts"]),
      ...selectedStoryFacts,
      ...stateFacts(parentState["inventory"], "Inventory"),
      ...stateFacts(parentState["npcs"], "NPC"),
    ],
    hiddenFacts: stringArray(storyLab["hiddenFacts"]),
    pendingEvents: stringArray(storyLab["pendingEvents"]),
    fixedDecisions: stringArray(storyLab["fixedDecisions"]),
    mustInclude: stringArray(storyLab["mustInclude"]),
    mustNotInclude: stringArray(storyLab["mustNotInclude"]),
    tone: optionalString(storyLab["tone"]) ?? "",
    ageGuidance: stringArray(storyLab["ageGuidance"]),
  };
}

export function appendSelectedStoryCandidate(input: {
  parentState: JsonObject;
  phaseId: string;
  story: JsonObject;
}): JsonObject {
  const storyLab = asObject(input.parentState["storyLab"], "storyLab");
  const stories = asObjectArray(storyLab["stories"] ?? []);
  const expectedStoryNumber = storyNumberFromPhaseId(input.phaseId);
  if (!expectedStoryNumber || stories.length !== expectedStoryNumber - 1) {
    throw new TestLabInvariantError(
      `TEST_LAB_STORY_LINEAGE_MISMATCH:${input.phaseId}:${stories.length}`,
    );
  }

  return cloneJson({
    ...input.parentState,
    storyLab: {
      ...storyLab,
      stories: [...stories, input.story],
    },
  });
}

function selectedStoryFact(
  story: JsonObject,
  storyNumber: number,
): string | null {
  const scene = story["scene"];
  if (!scene || typeof scene !== "object" || Array.isArray(scene)) return null;
  const sceneObject = scene as JsonObject;
  const moment = optionalString(sceneObject["moment"]);
  const narrative = optionalString(sceneObject["narrative"]);
  const summary = moment ?? narrative?.slice(0, 360) ?? null;
  return summary ? `Selected Story ${storyNumber}: ${summary}` : null;
}

function stateFacts(value: JsonValue | undefined, label: string): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return [`${label}: ${value}`];
  const serialized = JSON.stringify(value);
  return serialized ? [`${label}: ${serialized.slice(0, 900)}`] : [];
}

function sourceFamily(
  value: JsonValue | undefined,
): StorySandboxScope["sourceFamily"] {
  return value === "rumor" || value === "inventory_item" || value === "npc_call"
    ? value
    : "world_event";
}

function requiredString(value: JsonValue | undefined, field: string): string {
  const result = optionalString(value);
  if (!result)
    throw new TestLabInvariantError(`TEST_LAB_REQUIRED_FIELD:${field}`);
  return result;
}

function optionalString(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asObject(value: JsonValue | undefined, field: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TestLabInvariantError(`TEST_LAB_JSON_OBJECT_REQUIRED:${field}`);
  }
  return value as JsonObject;
}

function asObjectArray(value: JsonValue): JsonObject[] {
  if (!Array.isArray(value)) {
    throw new TestLabInvariantError("TEST_LAB_STORIES_ARRAY_REQUIRED");
  }
  return value.map((entry) => asObject(entry, "storyLab.stories[]"));
}

function cloneJson(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}
