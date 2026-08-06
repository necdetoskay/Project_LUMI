import { describe, expect, it } from "vitest";
import {
  OutcomeManifest,
  StoryContextSnapshot,
} from "../../src/domain/outcome";
import { ValidationError } from "../../src/domain/errors";

describe("OutcomeManifest", () => {
  const base = {
    storySessionId: crypto.randomUUID(),
    householdId: crypto.randomUUID(),
    worldId: crypto.randomUUID(),
    source: "story_session" as const,
    sourceSceneId: crypto.randomUUID(),
  };

  it("creates a draft manifest with changes", () => {
    const manifest = OutcomeManifest.create({
      ...base,
      changes: [
        {
          key: "c1",
          outcomeType: "npc_state_update",
          entityId: crypto.randomUUID(),
          operation: "set",
          field: "need.hunger",
          value: 80,
          evidenceRef: "scene://s1#line-12",
        },
      ],
    });

    expect(manifest.status).toBe("draft");
    expect(manifest.changes).toHaveLength(1);
    expect(manifest.schemaVersion).toBe(1);
  });

  it("rejects an empty manifest", () => {
    expect(() => OutcomeManifest.create({ ...base, changes: [] })).toThrowError(
      ValidationError,
    );
  });

  it("rejects duplicate change keys", () => {
    expect(() =>
      OutcomeManifest.create({
        ...base,
        changes: [
          {
            key: "dup",
            outcomeType: "npc_state_update",
            entityId: crypto.randomUUID(),
            operation: "set",
            field: "need.hunger",
            value: 80,
            evidenceRef: "r1",
          },
          {
            key: "dup",
            outcomeType: "npc_state_update",
            entityId: crypto.randomUUID(),
            operation: "set",
            field: "need.hunger",
            value: 90,
            evidenceRef: "r2",
          },
        ],
      }),
    ).toThrowError("Duplicate outcome change key: dup");
  });

  it("rejects an unknown outcome type", () => {
    expect(() =>
      OutcomeManifest.create({
        ...base,
        changes: [
          {
            key: "c1",
            outcomeType: "bogus" as never,
            entityId: crypto.randomUUID(),
            operation: "set",
            field: "x",
            value: 1,
            evidenceRef: "r",
          },
        ],
      }),
    ).toThrowError("Invalid outcome type: bogus");
  });

  it("rejects missing scope", () => {
    expect(() =>
      OutcomeManifest.create({
        ...base,
        householdId: "",
        changes: [
          {
            key: "c1",
            outcomeType: "npc_state_update",
            entityId: crypto.randomUUID(),
            operation: "set",
            field: "need.hunger",
            value: 80,
            evidenceRef: "r",
          },
        ],
      }),
    ).toThrowError(
      "Outcome manifest requires storySessionId, householdId and worldId",
    );
  });
});

describe("StoryContextSnapshot", () => {
  const base = {
    storySessionId: crypto.randomUUID(),
    householdId: crypto.randomUUID(),
    worldId: crypto.randomUUID(),
    worldStateHash: "hash-before-story",
  };

  it("captures entities and world hash", () => {
    const snapshot = StoryContextSnapshot.create({
      ...base,
      entities: [
        {
          entityId: crypto.randomUUID(),
          entityKind: "npc",
          state: { need: { hunger: 40 } },
          stateHash: "npc-hash-1",
        },
      ],
    });

    expect(snapshot.worldStateHash).toBe("hash-before-story");
    expect(snapshot.entities).toHaveLength(1);
    expect(snapshot.schemaVersion).toBe(1);
  });

  it("rejects missing world hash", () => {
    expect(() =>
      StoryContextSnapshot.create({
        ...base,
        worldStateHash: "",
        entities: [],
      }),
    ).toThrowError("Story context snapshot requires a worldStateHash");
  });

  it("rejects duplicate entities", () => {
    const id = crypto.randomUUID();
    expect(() =>
      StoryContextSnapshot.create({
        ...base,
        entities: [
          { entityId: id, entityKind: "npc", state: {}, stateHash: "a" },
          { entityId: id, entityKind: "npc", state: {}, stateHash: "b" },
        ],
      }),
    ).toThrowError("Duplicate snapshot entity:");
  });

  it("returns a deep copy of state", () => {
    const snapshot = StoryContextSnapshot.create({
      ...base,
      entities: [
        {
          entityId: crypto.randomUUID(),
          entityKind: "npc",
          state: { score: 5 },
          stateHash: "h1",
        },
      ],
    });
    const state = snapshot.getState();
    state.entities[0]!.state.score = 999;
    expect(snapshot.entities[0]!.state.score).toBe(5);
  });
});
