import type { NeedType } from "@lumi/profiles";
import type { TimePhase } from "./time";

export const EFFECT_TYPES = [
  "npc_routine",
  "npc_relationship_change",
  "location_condition_change",
  "environment_change",
  "ecology_change",
  "item_degradation",
  "npc_state_update",
  "scheduled_event_trigger",
] as const;
export type EffectType = (typeof EFFECT_TYPES)[number];

export const EFFECT_SEVERITY = ["low", "moderate", "high"] as const;
export type EffectSeverity = (typeof EFFECT_SEVERITY)[number];

export const EFFECT_STATUS = ["pending", "committed"] as const;
export type EffectStatus = (typeof EFFECT_STATUS)[number];

export interface SimulationEffect {
  id: string;
  runId: string;
  worldId: string;
  householdId: string;
  npcId: string | null;
  entityId: string | null;
  effectType: EffectType;
  severity: EffectSeverity;
  payload: Record<string, unknown>;
  evidence: Record<string, unknown>;
  status: EffectStatus;
  idempotencyKey: string;
  committedAt: Date | null;
  createdAt: Date;
}

export interface CreateEffectInput {
  runId: string;
  worldId: string;
  householdId: string;
  npcId?: string | null;
  entityId?: string | null;
  effectType: EffectType;
  severity?: EffectSeverity;
  payload?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface SimulationEffectEvidence {
  ruleId: string;
  source: string;
  confidence: number;
  /** Traceable to the simulation run + clock state that produced this effect. */
  traceRef: string;
}

export interface EffectRule {
  id: string;
  effectType: EffectType;
  severity: EffectSeverity;
  /**
   * Whether this effect is critical/irreversible and must remain pending
   * or player-preserved until the child returns.
   */
  critical: boolean;
  /** Time phases during which this rule can fire. */
  allowedPhases: TimePhase[];
  /** Builds the concrete effect payload from simulation context. */
  apply: (context: SimulationContext) => SimulationEffect | null;
}

export interface SimulationContext {
  runId: string;
  worldId: string;
  householdId: string;
  timePhase: TimePhase;
  budgetTokens: number;
  now: Date;
}

export interface EntityRelevance {
  entityId: string;
  entityKind: string;
  /** 0..1 score: how relevant to the child's story. */
  score: number;
  /** Why this entity matters. */
  reason: string;
  /** Need types this entity relates to. */
  needTypes: NeedType[];
  /** Last interaction timestamp with the child. */
  lastInteractionAt: Date;
}

export interface RelevanceBubble {
  worldId: string;
  householdId: string;
  entities: EntityRelevance[];
  /** Threshold below which entities are excluded from simulation. */
  threshold: number;
}
