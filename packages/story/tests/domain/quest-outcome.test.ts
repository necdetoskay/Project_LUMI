import { describe, expect, it } from "vitest";
import {
  OutcomeManifest,
  NarrativeEventExtractor,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
  assertKnownOutcomeType,
  EvidenceValidator,
  StoryContextSnapshot,
} from "../../src/domain/outcome";
import { ValidationError } from "../../src/domain/errors";

const SESSION_QUEST =
  "00000000-0000-4000-8000-000000000040";
const OTHER = "00000000-0000-4000-8000-000000000041";

describe("quest_state_update outcome type", () => {
  it("accepts quest_state_update as a valid outcome type", () => {
    expect(() => assertKnownOutcomeType("quest_state_update")).not.toThrow();
    expect(() => assertKnownOutcomeType("quest_state_")).toThrow(
      ValidationError,
    );
  });
});

describe("quest_objective_progressed narrative event", () => {
  it("extracts a quest_objective_progressed event from a quest_state_update change", () => {
    const manifest = OutcomeManifest.create({
      storySessionId: "00000000-0000-4000-8000-000000000010",
      householdId: "00000000-0000-4000-8000-000000000020",
      worldId: "00000000-0000-4000-8000-000000000030",
      source: "story_session",
      sourceSceneId: "scene-1",
      changes: [
        {
          key: "q1",
          outcomeType: "quest_state_update",
          entityId: SESSION_QUEST,
          operation: "set",
          field: "objectives.0.status",
          value: "completed",
          evidenceRef: "r1",
        },
      ],
    });

    const extractor = new NarrativeEventExtractor();
    const events = extractor.extract({
      manifest,
      allowedEntityIds: new Set([SESSION_QUEST]),
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe("quest_objective_progressed");
    expect(events[0]!.entityId).toBe(SESSION_QUEST);
    expect(events[0]!.detail).toMatchObject({
      operation: "set",
      field: "objectives.0.status",
      value: "completed",
    });
    expect(events[0]!.evidenceRef).toBe("r1");
  });

  it("rejects a quest change whose entity is missing from the snapshot", () => {
    const manifest = OutcomeManifest.create({
      storySessionId: "00000000-0000-4000-8000-000000000010",
      householdId: "00000000-0000-4000-8000-000000000020",
      worldId: "00000000-0000-4000-8000-000000000030",
      source: "story_session",
      sourceSceneId: "scene-1",
      changes: [
        {
          key: "q1",
          outcomeType: "quest_state_update",
          entityId: SESSION_QUEST,
          operation: "set",
          field: "objectives.0.status",
          value: "completed",
          evidenceRef: "r1",
        },
      ],
    });

    const extractor = new NarrativeEventExtractor();
    expect(() =>
      extractor.extract({
        manifest,
        allowedEntityIds: new Set([OTHER]),
      }),
    ).toThrow(ValidationError);
  });
});

describe("default quest rule", () => {
  it("maps quest_objective_progressed to a set world change", () => {
    const events = extractQuestEvents();
    const engine = new WorldCommitRuleEngine({ rules: defaultOutcomeRules() });
    const { direct } = engine.apply(events);

    expect(direct).toHaveLength(1);
    expect(direct[0]!.changeKey).toBe("q1");
    expect(direct[0]!.entityId).toBe(SESSION_QUEST);
    expect(direct[0]!.kind).toBe("set");
    expect(direct[0]!.field).toBe("objectives.0.status");
    expect(direct[0]!.value).toBe("completed");
    expect(direct[0]!.ruleId).toBe("default-quest-objective-progress");
    expect(direct[0]!.status).toBe("committed");
  });

  it("produces no indirect intents for quest progression", () => {
    const events = extractQuestEvents();
    const engine = new WorldCommitRuleEngine({ rules: defaultOutcomeRules() });
    const { indirect } = engine.apply(events);
    expect(indirect).toHaveLength(0);
  });
});

describe("Quest evidence validation (snapshot scope)", () => {
  const validator = new EvidenceValidator();

  function makeManifest() {
    return OutcomeManifest.create({
      storySessionId: "00000000-0000-4000-8000-000000000010",
      householdId: "00000000-0000-4000-8000-000000000020",
      worldId: "00000000-0000-4000-8000-000000000030",
      source: "story_session",
      sourceSceneId: "scene-1",
      changes: [
        {
          key: "q1",
          outcomeType: "quest_state_update",
          entityId: SESSION_QUEST,
          operation: "set",
          field: "objectives.0.status",
          value: "completed",
          evidenceRef: "r1",
        },
      ],
    });
  }

  function makeSnapshot(entities: {
    entityId: string;
    entityKind: string;
    state: Record<string, unknown>;
    stateHash: string;
  }[]) {
    return StoryContextSnapshot.create({
      storySessionId: "00000000-0000-4000-8000-000000000010",
      householdId: "00000000-0000-4000-8000-000000000020",
      worldId: "00000000-0000-4000-8000-000000000030",
      worldStateHash: "world-hash",
      entities,
    });
  }

  it("accepts a quest change whose entity is in the snapshot", () => {
    const manifest = makeManifest();
    const snapshot = makeSnapshot([
      {
        entityId: SESSION_QUEST,
        entityKind: "quest",
        state: { status: "active", objectives: [{ status: "locked" }] },
        stateHash: "h1",
      },
    ]);

    expect(validator.validate(manifest, snapshot)).toEqual([]);
  });

  it("rejects a quest change whose entity is missing from the snapshot", () => {
    const manifest = makeManifest();
    const snapshot = makeSnapshot([
      {
        entityId: OTHER,
        entityKind: "quest",
        state: { status: "active" },
        stateHash: "h1",
      },
    ]);

    const errors = validator.validate(manifest, snapshot);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain(SESSION_QUEST);
  });

  it("rejects a quest change missing an evidence reference", () => {
    const manifest = OutcomeManifest.create({
      storySessionId: "00000000-0000-4000-8000-000000000010",
      householdId: "00000000-0000-4000-8000-000000000020",
      worldId: "00000000-0000-4000-8000-000000000030",
      source: "story_session",
      sourceSceneId: "scene-1",
      changes: [
        {
          key: "q1",
          outcomeType: "quest_state_update",
          entityId: SESSION_QUEST,
          operation: "set",
          field: "objectives.0.status",
          value: "completed",
          evidenceRef: "",
        },
      ],
    });
    const snapshot = makeSnapshot([
      {
        entityId: SESSION_QUEST,
        entityKind: "quest",
        state: { status: "active" },
        stateHash: "h1",
      },
    ]);

    const errors = validator.validate(manifest, snapshot);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("evidenceRef");
  });
});

function extractQuestEvents() {
  const manifest = OutcomeManifest.create({
    storySessionId: "00000000-0000-4000-8000-000000000010",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    source: "story_session",
    sourceSceneId: "scene-1",
    changes: [
      {
        key: "q1",
        outcomeType: "quest_state_update",
        entityId: SESSION_QUEST,
        operation: "set",
        field: "objectives.0.status",
        value: "completed",
        evidenceRef: "r1",
      },
    ],
  });
  const extractor = new NarrativeEventExtractor();
  return extractor.extract({
    manifest,
    allowedEntityIds: new Set([SESSION_QUEST]),
  });
}