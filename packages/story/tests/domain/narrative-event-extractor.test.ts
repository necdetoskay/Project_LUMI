import { describe, expect, it } from "vitest";
import {
  NarrativeEventExtractor,
  EvidenceValidator,
  OutcomeManifest,
  StoryContextSnapshot,
} from "../../src/domain/outcome";

const npcId = "00000000-0000-4000-8000-000000000001";
const npc2Id = "00000000-0000-4000-8000-000000000002";

function makeManifest(
  changes: Parameters<typeof OutcomeManifest.create>[0]["changes"],
) {
  return OutcomeManifest.create({
    storySessionId: "00000000-0000-4000-8000-000000000010",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    source: "story_session",
    sourceSceneId: "scene-1",
    changes,
  });
}

function makeSnapshot(
  entities: Parameters<typeof StoryContextSnapshot.create>[0]["entities"],
) {
  return StoryContextSnapshot.create({
    storySessionId: "00000000-0000-4000-8000-000000000010",
    householdId: "00000000-0000-4000-8000-000000000020",
    worldId: "00000000-0000-4000-8000-000000000030",
    worldStateHash: "hash-before",
    entities,
  });
}

describe("NarrativeEventExtractor", () => {
  const extractor = new NarrativeEventExtractor();

  it("maps manifest changes to narrative events with ordering", () => {
    const manifest = makeManifest([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcId,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "scene://s1#1",
      },
      {
        key: "c2",
        outcomeType: "npc_relationship_update",
        entityId: npc2Id,
        operation: "set",
        field: "relationship.trust",
        value: 5,
        evidenceRef: "scene://s1#2",
      },
    ]);

    const events = extractor.extract({
      manifest,
      allowedEntityIds: new Set([npcId, npc2Id]),
    });

    expect(events).toHaveLength(2);
    expect(events[0]!.eventKey).toBe("c1");
    expect(events[0]!.eventType).toBe("npc_state_changed");
    expect(events[0]!.sequence).toBe(0);
    expect(events[1]!.eventType).toBe("npc_relationship_changed");
    expect(events[1]!.sequence).toBe(1);
    expect(events[0]!.origin.manifestId).toBe(manifest.id);
  });

  it("rejects changes referencing entities outside the snapshot", () => {
    const manifest = makeManifest([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: "missing-npc",
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "r",
      },
    ]);

    expect(() =>
      extractor.extract({ manifest, allowedEntityIds: new Set([npcId]) }),
    ).toThrowError("which is not in the story context snapshot");
  });
});

describe("EvidenceValidator", () => {
  const validator = new EvidenceValidator();

  it("accepts a manifest whose entities and fields match the snapshot", () => {
    const manifest = makeManifest([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcId,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "scene://s1#1",
      },
    ]);
    const snapshot = makeSnapshot([
      {
        entityId: npcId,
        entityKind: "npc",
        state: { need: { hunger: 40 } },
        stateHash: "h1",
      },
    ]);

    const errors = validator.validate(manifest, snapshot);
    expect(errors).toEqual([]);
  });

  it("rejects a change missing an evidence reference", () => {
    const manifest = makeManifest([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcId,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "",
      },
    ]);
    const snapshot = makeSnapshot([
      { entityId: npcId, entityKind: "npc", state: {}, stateHash: "h1" },
    ]);

    const errors = validator.validate(manifest, snapshot);
    expect(errors.some((e) => e.includes("missing evidenceRef"))).toBe(true);
  });

  it("rejects an increment on a field absent from the snapshot", () => {
    const manifest = makeManifest([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: npcId,
        operation: "increment",
        field: "inventory.gold",
        value: 5,
        evidenceRef: "r",
      },
    ]);
    const snapshot = makeSnapshot([
      {
        entityId: npcId,
        entityKind: "npc",
        state: { need: { hunger: 40 } },
        stateHash: "h1",
      },
    ]);

    const errors = validator.validate(manifest, snapshot);
    expect(errors.some((e) => e.includes('"inventory.gold" missing'))).toBe(
      true,
    );
  });

  it("rejects a change targeting an entity outside the snapshot", () => {
    const manifest = makeManifest([
      {
        key: "c1",
        outcomeType: "npc_state_update",
        entityId: "outside",
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: "r",
      },
    ]);
    const snapshot = makeSnapshot([
      { entityId: npcId, entityKind: "npc", state: {}, stateHash: "h1" },
    ]);

    const errors = validator.validate(manifest, snapshot);
    expect(
      errors.some((e) => e.includes("not found in pre-story snapshot")),
    ).toBe(true);
  });
});
