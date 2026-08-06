import { ValidationError } from "../errors";
import type {
  OutcomeChange,
  OutcomeManifest,
  OutcomeType,
} from "./outcome-manifest";

export const NARRATIVE_EVENT_TYPES = [
  "npc_state_changed",
  "npc_memory_added",
  "npc_relationship_changed",
  "inventory_item_moved",
  "world_flag_changed",
  "location_condition_changed",
  "environment_changed",
  "scheduled_event_created",
] as const;
export type NarrativeEventType = (typeof NARRATIVE_EVENT_TYPES)[number];

/** A concrete world event extracted from an outcome manifest change. */
export interface NarrativeEvent {
  /** Idempotency key inherited from the source change. */
  eventKey: string;
  /** Semantic event type (parallels OutcomeType). */
  eventType: NarrativeEventType;
  /** Entity the event applies to. */
  entityId: string;
  /** Deterministic ordering within a manifest (0-based). */
  sequence: number;
  /** The field/operation/value that defines what changed. */
  detail: {
    operation: OutcomeChange["operation"];
    field: string;
    value: unknown;
  };
  /** Evidence reference carried through from the manifest. */
  evidenceRef: string;
  /** Manifest + source scene traceability. */
  origin: {
    manifestId: string;
    storySessionId: string;
    sourceSceneId: string;
  };
}

export interface ExtractNarrativeEventsInput {
  manifest: OutcomeManifest;
  /** Restrict extraction to these entity ids (from the context snapshot). */
  allowedEntityIds: ReadonlySet<string>;
}

const OUTCOME_TO_NARRATIVE: Record<OutcomeType, NarrativeEventType> = {
  npc_state_update: "npc_state_changed",
  npc_memory_update: "npc_memory_added",
  npc_relationship_update: "npc_relationship_changed",
  inventory_transaction: "inventory_item_moved",
  world_flag_update: "world_flag_changed",
  location_condition_update: "location_condition_changed",
  environment_change: "environment_changed",
  scheduled_event_trigger: "scheduled_event_created",
};

export class NarrativeEventExtractor {
  extract(input: ExtractNarrativeEventsInput): NarrativeEvent[] {
    const events: NarrativeEvent[] = [];
    for (const [index, change] of input.manifest.changes.entries()) {
      if (!input.allowedEntityIds.has(change.entityId)) {
        throw new ValidationError(
          "EVENT_ENTITY_NOT_IN_SNAPSHOT",
          `Change references entity ${change.entityId} which is not in the story context snapshot`,
        );
      }
      events.push({
        eventKey: change.key,
        eventType: OUTCOME_TO_NARRATIVE[change.outcomeType],
        entityId: change.entityId,
        sequence: index,
        detail: {
          operation: change.operation,
          field: change.field,
          value: change.value,
        },
        evidenceRef: change.evidenceRef,
        origin: {
          manifestId: input.manifest.id,
          storySessionId: input.manifest.storySessionId,
          sourceSceneId: input.manifest.sourceSceneId,
        },
      });
    }
    return events;
  }
}
