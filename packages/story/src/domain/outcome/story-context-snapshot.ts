import { ValidationError } from "../errors";

export const CONTEXT_SNAPSHOT_SCHEMA_VERSION = 1;

/** A pre-story read-only capture of the world entities a commit may touch. */
export interface SnapshotEntityEntry {
  entityId: string;
  entityKind: string;
  /** Canonical field values the commit rule engine validates against. */
  state: Record<string, unknown>;
  /** Deterministic hash of the entity state at capture time. */
  stateHash: string;
}

export interface CreateStoryContextSnapshotInput {
  storySessionId: string;
  householdId: string;
  worldId: string;
  /** Hash of the full pre-story world state (world version anchor). */
  worldStateHash: string;
  /** Entities relevant to the upcoming outcome manifest. */
  entities: SnapshotEntityEntry[];
}

export interface StoryContextSnapshotState {
  id: string;
  schemaVersion: number;
  storySessionId: string;
  householdId: string;
  worldId: string;
  worldStateHash: string;
  entities: SnapshotEntityEntry[];
  createdAt: Date;
}

export class StoryContextSnapshot {
  private constructor(private readonly state: StoryContextSnapshotState) {}

  static create(input: CreateStoryContextSnapshotInput): StoryContextSnapshot {
    if (!input.storySessionId || !input.householdId || !input.worldId) {
      throw new ValidationError(
        "SNAPSHOT_MISSING_SCOPE",
        "Story context snapshot requires storySessionId, householdId and worldId",
      );
    }
    if (!input.worldStateHash) {
      throw new ValidationError(
        "SNAPSHOT_MISSING_WORLD_HASH",
        "Story context snapshot requires a worldStateHash",
      );
    }
    const seen = new Set<string>();
    for (const e of input.entities) {
      if (!e.entityId || !e.stateHash) {
        throw new ValidationError(
          "SNAPSHOT_INVALID_ENTITY",
          "Snapshot entities require entityId and stateHash",
        );
      }
      if (seen.has(e.entityId)) {
        throw new ValidationError(
          "SNAPSHOT_DUPLICATE_ENTITY",
          `Duplicate snapshot entity: ${e.entityId}`,
        );
      }
      seen.add(e.entityId);
    }

    return new StoryContextSnapshot({
      id: crypto.randomUUID(),
      schemaVersion: CONTEXT_SNAPSHOT_SCHEMA_VERSION,
      storySessionId: input.storySessionId,
      householdId: input.householdId,
      worldId: input.worldId,
      worldStateHash: input.worldStateHash,
      entities: input.entities.map((e) => ({
        ...e,
        state: { ...e.state },
      })),
      createdAt: new Date(),
    });
  }

  static fromState(state: StoryContextSnapshotState): StoryContextSnapshot {
    return new StoryContextSnapshot(state);
  }

  get id(): string {
    return this.state.id;
  }

  get schemaVersion(): number {
    return this.state.schemaVersion;
  }

  get storySessionId(): string {
    return this.state.storySessionId;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get worldId(): string {
    return this.state.worldId;
  }

  get worldStateHash(): string {
    return this.state.worldStateHash;
  }

  get entities(): ReadonlyArray<SnapshotEntityEntry> {
    return this.state.entities;
  }

  getState(): StoryContextSnapshotState {
    return {
      ...this.state,
      entities: this.state.entities.map((e) => ({
        ...e,
        state: { ...e.state },
      })),
    };
  }
}
