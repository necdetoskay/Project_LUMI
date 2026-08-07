import { ValidationError } from "../errors";
import type {
  NarrativeEvent,
  NarrativeEventType,
} from "./narrative-event-extractor";
import type { OutcomeOperation } from "./outcome-manifest";

export const WORLD_CHANGE_KINDS = [
  "set",
  "increment",
  "remove_field",
  "transfer",
] as const;
export type WorldChangeKind = (typeof WORLD_CHANGE_KINDS)[number];

export const WORLD_CHANGE_STATUSES = [
  "proposed",
  "committed",
  "superseded",
] as const;
export type WorldChangeStatus = (typeof WORLD_CHANGE_STATUSES)[number];

/** A concrete, rule-resolved world mutation ready for the transactional commit. */
export interface WorldChange {
  /** Idempotency key inherited from the source narrative event. */
  changeKey: string;
  entityId: string;
  kind: WorldChangeKind;
  /** Field path within the entity. */
  field: string;
  value: unknown;
  /** Deterministic conflict priority (higher wins when two changes collide). */
  priority: number;
  /** Which rule produced this change (traceability). */
  ruleId: string;
  /** Ordering within the manifest (stable). */
  sequence: number;
  /** Evidence reference carried through. */
  evidenceRef: string;
  status: WorldChangeStatus;
}

export interface WorldCommitRuleContext {
  event: NarrativeEvent;
  /** Priority for conflict resolution (higher wins). */
  priority: number;
}

export const INDIRECT_INTENT_TYPES = [
  "npc_rumor_spread",
  "npc_relationship_shift",
  "location_reputation_change",
  "environment_ripple",
  "community_awareness",
  "scheduled_effect_enqueue",
] as const;
export type IndirectIntentType = (typeof INDIRECT_INTENT_TYPES)[number];

/**
 * A derived (indirect) effect intent. Not applied immediately; enqueued to the
 * outbox in the same transaction as the producing commit, then propagated once.
 */
export interface IndirectIntent {
  /** Idempotency key for the outbox row. */
  intentKey: string;
  intentType: IndirectIntentType;
  /** Entity/region the indirect effect concerns (may differ from the actor). */
  targetEntityId: string;
  /** Bounded derived payload (from concrete events, never free-form). */
  payload: Record<string, unknown>;
  /** Evidence ref to the source event/commit. */
  evidenceRef: string;
  /** Correlation to the producing narrative event. */
  sourceEventKey: string;
}

export interface WorldCommitRuleResult {
  /** Direct changes applied immediately by the commit. */
  direct: WorldChange[];
  /** Indirect intents enqueued to the outbox. */
  indirect: IndirectIntent[];
}

export interface WorldCommitRule {
  /** Semantic event type this rule handles. */
  forEventType: NarrativeEventType;
  /** Deterministic transform: narrative event → direct world change. */
  apply: (ctx: WorldCommitRuleContext) => WorldChange;
  /** Optional deterministic transform: narrative event → indirect intents. */
  applyIndirect?: (ctx: WorldCommitRuleContext) => IndirectIntent[];
}

export interface RuleEngineConfig {
  rules: WorldCommitRule[];
}

/**
 * Applies registered rules to narrative events, producing a deterministic,
 * conflict-resolved list of world changes.
 */
export class WorldCommitRuleEngine {
  private readonly rules: WorldCommitRule[];

  constructor(config: RuleEngineConfig) {
    if (!config.rules.length) {
      throw new ValidationError(
        "RULE_ENGINE_NO_RULES",
        "World commit rule engine requires at least one rule",
      );
    }
    this.rules = config.rules;
  }

  /**
   * Produces a conflict-resolved result from narrative events: direct changes
   * (applied by the commit) + indirect intents (enqueued to the outbox).
   */
  apply(events: NarrativeEvent[]): WorldCommitRuleResult {
    const direct: WorldChange[] = [];
    const indirect: IndirectIntent[] = [];

    for (const event of events) {
      const rule = this.rules.find((r) => r.forEventType === event.eventType);
      if (!rule) {
        throw new ValidationError(
          "RULE_ENGINE_UNHANDLED_EVENT",
          `No rule registered for narrative event type: ${event.eventType}`,
        );
      }
      const ctx = { event, priority: event.sequence + 1 };
      direct.push(rule.apply(ctx));
      if (rule.applyIndirect) {
        indirect.push(...rule.applyIndirect(ctx));
      }
    }

    return {
      direct: this.resolveConflicts(direct),
      indirect,
    };
  }

  /**
   * Deterministic conflict resolution: for each (entityId, field) group, keep
   * the change with the highest priority; equal priorities keep the lowest
   * sequence (stable). Others become superseded.
   */
  private resolveConflicts(changes: WorldChange[]): WorldChange[] {
    const groups = new Map<string, WorldChange[]>();
    for (const change of changes) {
      const key = `${change.entityId}::${change.field}`;
      const list = groups.get(key) ?? [];
      list.push(change);
      groups.set(key, list);
    }

    const output: WorldChange[] = [];
    for (const list of groups.values()) {
      if (list.length === 1) {
        output.push(list[0]!);
        continue;
      }
      const winner = [...list].sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.sequence - b.sequence;
      })[0]!;
      for (const change of list) {
        if (change.changeKey === winner.changeKey) {
          output.push({ ...change, status: "committed" });
        } else {
          output.push({ ...change, status: "superseded" });
        }
      }
    }

    // Stable output ordering: by entity, then field, then sequence.
    return output.sort((a, b) => {
      if (a.entityId !== b.entityId) return a.entityId < b.entityId ? -1 : 1;
      if (a.field !== b.field) return a.field < b.field ? -1 : 1;
      return a.sequence - b.sequence;
    });
  }
}

/** Default rules matching the common OutcomeType → WorldChangeKind mapping. */
export function defaultOutcomeRules(): WorldCommitRule[] {
  const opToKind = (op: OutcomeOperation): WorldChangeKind => {
    switch (op) {
      case "set":
        return "set";
      case "add":
        return "set";
      case "increment":
        return "increment";
      case "remove":
        return "remove_field";
      case "transfer":
        return "transfer";
    }
  };

  return [
    {
      forEventType: "npc_state_changed",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: opToKind(event.detail.operation),
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-npc-state",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
      applyIndirect: ({ event }) => [
        {
          intentKey: `${event.eventKey}:rumor`,
          intentType: "npc_rumor_spread",
          targetEntityId: event.entityId,
          payload: {
            field: event.detail.field,
            value: event.detail.value,
            sourceSceneId: event.origin.sourceSceneId,
          },
          evidenceRef: event.evidenceRef,
          sourceEventKey: event.eventKey,
        },
      ],
    },
    {
      forEventType: "npc_relationship_changed",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: opToKind(event.detail.operation),
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-npc-relationship",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "npc_memory_added",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: "set",
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-npc-memory",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "inventory_item_moved",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: "transfer",
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-inventory",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "world_flag_changed",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: opToKind(event.detail.operation),
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-world-flag",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "location_condition_changed",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: opToKind(event.detail.operation),
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-location-condition",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "environment_changed",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: opToKind(event.detail.operation),
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-environment",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "scheduled_event_created",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: "set",
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-scheduled-event",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
    {
      forEventType: "quest_objective_progressed",
      apply: ({ event, priority }) => ({
        changeKey: event.eventKey,
        entityId: event.entityId,
        kind: "set",
        field: event.detail.field,
        value: event.detail.value,
        priority,
        ruleId: "default-quest-objective-progress",
        sequence: event.sequence,
        evidenceRef: event.evidenceRef,
        status: "committed",
      }),
    },
  ];
}
