import { describe, expect, it } from "vitest";
import {
  OutcomeManifest,
  NarrativeEventExtractor,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import { ValidationError } from "../../src/domain/errors";

const npcA = "00000000-0000-4000-8000-000000000001";
const npcB = "00000000-0000-4000-8000-000000000002";

function extractFromChanges(
  changes: Parameters<typeof OutcomeManifest.create>[0]["changes"],
) {
  const manifest = OutcomeManifest.create({
    storySessionId: "00000000-0000-4000-8000-000000000010",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    source: "story_session",
    sourceSceneId: "scene-1",
    changes,
  });
  const extractor = new NarrativeEventExtractor();
  return extractor.extract({
    manifest,
    allowedEntityIds: new Set([npcA, npcB]),
  });
}

describe("WorldCommitRuleEngine", () => {
  it("maps narrative events to world changes with default rules", () => {
    const events = extractFromChanges([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "r1",
      },
    ]);

    const engine = new WorldCommitRuleEngine({ rules: defaultOutcomeRules() });
    const changes = engine.apply(events);

    expect(changes).toHaveLength(1);
    expect(changes[0]!.changeKey).toBe("c1");
    expect(changes[0]!.entityId).toBe(npcA);
    expect(changes[0]!.kind).toBe("set");
    expect(changes[0]!.field).toBe("need.hunger");
    expect(changes[0]!.ruleId).toBe("default-npc-state");
    expect(changes[0]!.status).toBe("committed");
  });

  it("resolves a conflict deterministically (highest priority wins)", () => {
    const events = extractFromChanges([
      {
        key: "c-low",
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 10,
        evidenceRef: "r-low",
      },
      {
        key: "c-high",
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 90,
        evidenceRef: "r-high",
      },
    ]);

    const engine = new WorldCommitRuleEngine({ rules: defaultOutcomeRules() });
    const changes = engine.apply(events);

    const committed = changes.filter((c) => c.status === "committed");
    const superseded = changes.filter((c) => c.status === "superseded");
    expect(committed).toHaveLength(1);
    expect(committed[0]!.changeKey).toBe("c-high");
    expect(superseded).toHaveLength(1);
    expect(superseded[0]!.changeKey).toBe("c-low");
  });

  it("throws when no rule is registered for an event type", () => {
    const events = extractFromChanges([
      {
        key: "c1",
        outcomeType: "environment_change",
        entityId: npcA,
        operation: "set",
        field: "weather",
        value: "storm",
        evidenceRef: "r1",
      },
    ]);

    const engine = new WorldCommitRuleEngine({
      rules: defaultOutcomeRules().filter(
        (r) => r.forEventType !== "environment_changed",
      ),
    });

    expect(() => engine.apply(events)).toThrowError(
      "No rule registered for narrative event type: environment_changed",
    );
  });

  it("rejects an engine with no rules", () => {
    expect(() => new WorldCommitRuleEngine({ rules: [] })).toThrowError(
      "World commit rule engine requires at least one rule",
    );
  });

  it("keeps distinct entities/fields independent", () => {
    const events = extractFromChanges([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "r1",
      },
      {
        key: "c2",
        outcomeType: "npc_state_update",
        entityId: npcB,
        operation: "set",
        field: "need.hunger",
        value: 20,
        evidenceRef: "r2",
      },
    ]);

    const engine = new WorldCommitRuleEngine({ rules: defaultOutcomeRules() });
    const changes = engine.apply(events);

    expect(changes).toHaveLength(2);
    expect(changes.every((c) => c.status === "committed")).toBe(true);
  });
});

describe("WorldCommitRuleEngine error code path", () => {
  it("ValidationError subclass carries code", () => {
    const events = extractFromChanges([
      {
        key: "c1",
        outcomeType: "environment_change",
        entityId: npcA,
        operation: "set",
        field: "weather",
        value: "storm",
        evidenceRef: "r1",
      },
    ]);
    const engine = new WorldCommitRuleEngine({
      rules: defaultOutcomeRules().filter(
        (r) => r.forEventType !== "environment_changed",
      ),
    });
    let caught: unknown;
    try {
      engine.apply(events);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ValidationError);
    expect((caught as ValidationError).code).toBe(
      "RULE_ENGINE_UNHANDLED_EVENT",
    );
  });
});
