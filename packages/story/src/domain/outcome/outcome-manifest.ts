import { ValidationError } from "../errors";

export const OUTCOME_MANIFEST_SCHEMA_VERSION = 1;

export const OUTCOME_TYPES = [
  "npc_state_update",
  "npc_memory_update",
  "npc_relationship_update",
  "inventory_transaction",
  "world_flag_update",
  "location_condition_update",
  "environment_change",
  "scheduled_event_trigger",
] as const;
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const OUTCOME_SOURCES = ["story_session", "story_scene"] as const;
export type OutcomeSource = (typeof OUTCOME_SOURCES)[number];

export const OUTCOME_OPERATIONS = [
  "set",
  "add",
  "remove",
  "increment",
  "transfer",
] as const;
export type OutcomeOperation = (typeof OUTCOME_OPERATIONS)[number];

export const OUTCOME_MANIFEST_STATUSES = [
  "draft",
  "validated",
  "committed",
  "rejected",
  "superseded",
] as const;
export type OutcomeManifestStatus = (typeof OUTCOME_MANIFEST_STATUSES)[number];

/**
 * A single typed change requested by the story engine. Carries evidence so the
 * commit system can validate the claim against the pre-story world snapshot.
 */
export interface OutcomeChange {
  /** Stable idempotency key for this change (retries never double-apply). */
  key: string;
  /** Which kind of world entity this change targets. */
  outcomeType: OutcomeType;
  /** Entity this change applies to (NPC, inventory item, world, location…). */
  entityId: string;
  /** Operation to perform against the target. */
  operation: OutcomeOperation;
  /** Field path within the target entity (e.g. "need.hunger"). */
  field: string;
  /** Value to apply; semantics depend on the operation. */
  value: unknown;
  /** Free-form evidence text/locators that the commit system verifies. */
  evidenceRef: string;
  /** Severity hint used for conflict-resolution priority. */
  priority?: number;
}

export interface CreateOutcomeManifestInput {
  storySessionId: string;
  householdId: string;
  worldId: string;
  source: OutcomeSource;
  /** The source scene that produced this manifest (evidence anchor). */
  sourceSceneId: string;
  changes: OutcomeChange[];
  status?: OutcomeManifestStatus;
  schemaVersion?: number;
}

export interface OutcomeManifestState {
  id: string;
  schemaVersion: number;
  storySessionId: string;
  householdId: string;
  worldId: string;
  source: OutcomeSource;
  sourceSceneId: string;
  changes: OutcomeChange[];
  status: OutcomeManifestStatus;
  createdAt: Date;
}

export class OutcomeManifest {
  private constructor(private readonly state: OutcomeManifestState) {}

  static create(input: CreateOutcomeManifestInput): OutcomeManifest {
    if (
      input.schemaVersion &&
      input.schemaVersion !== OUTCOME_MANIFEST_SCHEMA_VERSION
    ) {
      throw new ValidationError(
        "INVALID_MANIFEST_SCHEMA_VERSION",
        `Outcome manifest schema version must be ${OUTCOME_MANIFEST_SCHEMA_VERSION}`,
      );
    }
    if (!input.storySessionId || !input.householdId || !input.worldId) {
      throw new ValidationError(
        "MANIFEST_MISSING_SCOPE",
        "Outcome manifest requires storySessionId, householdId and worldId",
      );
    }
    if (!input.changes.length) {
      throw new ValidationError(
        "MANIFEST_EMPTY_CHANGES",
        "Outcome manifest must contain at least one change",
      );
    }
    const seenKeys = new Set<string>();
    for (const change of input.changes) {
      if (!change.key) {
        throw new ValidationError(
          "MANIFEST_MISSING_CHANGE_KEY",
          "Each outcome change requires an idempotency key",
        );
      }
      if (seenKeys.has(change.key)) {
        throw new ValidationError(
          "MANIFEST_DUPLICATE_CHANGE_KEY",
          `Duplicate outcome change key: ${change.key}`,
        );
      }
      seenKeys.add(change.key);
      assertKnownOutcomeType(change.outcomeType);
      assertKnownOutcomeOperation(change.operation);
      if (!change.entityId) {
        throw new ValidationError(
          "MANIFEST_MISSING_ENTITY",
          "Each outcome change requires an entityId",
        );
      }
    }

    return new OutcomeManifest({
      id: crypto.randomUUID(),
      schemaVersion: OUTCOME_MANIFEST_SCHEMA_VERSION,
      storySessionId: input.storySessionId,
      householdId: input.householdId,
      worldId: input.worldId,
      source: input.source,
      sourceSceneId: input.sourceSceneId,
      changes: input.changes.map((c) => ({ ...c })),
      status: input.status ?? "draft",
      createdAt: new Date(),
    });
  }

  static fromState(state: OutcomeManifestState): OutcomeManifest {
    assertKnownOutcomeManifestStatus(state.status);
    return new OutcomeManifest(state);
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

  get sourceSceneId(): string {
    return this.state.sourceSceneId;
  }

  get changes(): ReadonlyArray<OutcomeChange> {
    return this.state.changes;
  }

  get status(): OutcomeManifestStatus {
    return this.state.status;
  }

  getState(): OutcomeManifestState {
    return {
      ...this.state,
      changes: this.state.changes.map((c) => ({ ...c })),
    };
  }
}

export function assertKnownOutcomeType(
  value: string,
): asserts value is OutcomeType {
  if (!(OUTCOME_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_OUTCOME_TYPE",
      `Invalid outcome type: ${value}`,
    );
  }
}

export function assertKnownOutcomeOperation(
  value: string,
): asserts value is OutcomeOperation {
  if (!(OUTCOME_OPERATIONS as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_OUTCOME_OPERATION",
      `Invalid outcome operation: ${value}`,
    );
  }
}

export function assertKnownOutcomeManifestStatus(
  value: string,
): asserts value is OutcomeManifestStatus {
  if (!(OUTCOME_MANIFEST_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError(
      "INVALID_OUTCOME_MANIFEST_STATUS",
      `Invalid outcome manifest status: ${value}`,
    );
  }
}
