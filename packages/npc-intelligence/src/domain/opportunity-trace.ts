import { hashJson } from "./hash";
import type { InteractionOpportunity } from "./opportunity";
import type { OpportunityType } from "./opportunity";

export const OPPORTUNITY_TRACE_STEPS = [
  "npc_selection",
  "candidate_generation",
  "scoring",
  "safety_filter",
  "ledger_gate",
  "delivery",
] as const;
export type OpportunityTraceStepName = (typeof OPPORTUNITY_TRACE_STEPS)[number];

export interface OpportunityTraceStep {
  step: OpportunityTraceStepName;
  message: string;
  data: Record<string, unknown>;
}

export interface OpportunityTrace {
  traceId: string;
  householdId: string;
  sourceNpcId: string;
  childProfileId: string;
  opportunityType: OpportunityType;
  /** Why this NPC was selected. */
  npcSelectionReason: string;
  /** Which event/belief/relationship/item was used. */
  evidence: Record<string, unknown>;
  /** Which cooldown/novelty/safety gates passed. */
  gates: string[];
  /** Deterministic score produced by the opportunity policy. */
  score: number;
  /** Why it was delivered, blocked, or expired. */
  outcome: "delivered" | "blocked" | "expired";
  outcomeReason: string;
  steps: OpportunityTraceStep[];
  contentHash: string;
  createdAt: Date;
}

export interface OpportunityTraceContext {
  householdId: string;
  sourceNpcId: string;
  childProfileId: string;
  opportunity: InteractionOpportunity | null;
  gates: string[];
  outcome: OpportunityTrace["outcome"];
  outcomeReason: string;
  npcSelectionReason: string;
  seed: string;
}

/** Step data keys allowed in an externally exposed opportunity trace. */
export const SAFE_OPPORTUNITY_STEP_KEYS: Record<
  OpportunityTraceStepName,
  readonly string[]
> = {
  npc_selection: ["npcId", "reason"],
  candidate_generation: ["type", "factId"],
  scoring: ["policyVersion", "total"],
  safety_filter: ["verdict", "reason"],
  ledger_gate: ["allowed", "blockedKeys", "noveltyCount"],
  delivery: ["result", "opportunityId"],
};

export function buildOpportunityTrace(
  context: OpportunityTraceContext,
  steps: OpportunityTraceStep[],
): OpportunityTrace {
  const traceId = crypto.randomUUID();
  const contentHash = hashJson({
    seed: context.seed,
    steps,
    npcId: context.sourceNpcId,
    type: context.opportunity?.opportunityType ?? null,
    gates: context.gates,
    outcome: context.outcome,
    outcomeReason: context.outcomeReason,
  });

  return {
    traceId,
    householdId: context.householdId,
    sourceNpcId: context.sourceNpcId,
    childProfileId: context.childProfileId,
    opportunityType: context.opportunity?.opportunityType ?? "rumor",
    npcSelectionReason: context.npcSelectionReason,
    evidence: context.opportunity?.evidence ?? {},
    gates: [...context.gates],
    score: context.opportunity?.score ?? 0,
    outcome: context.outcome,
    outcomeReason: context.outcomeReason,
    steps,
    contentHash,
    createdAt: new Date(),
  };
}

/** Returns a deep, safelisted copy of an opportunity trace for external use. */
export function sanitizeOpportunityTrace(
  trace: OpportunityTrace,
): OpportunityTrace {
  const sanitizedSteps: OpportunityTraceStep[] = trace.steps.map((step) => {
    const allowed = SAFE_OPPORTUNITY_STEP_KEYS[step.step] ?? [];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in step.data) {
        data[key] = step.data[key];
      }
    }
    return { step: step.step, message: step.message, data };
  });

  return {
    traceId: trace.traceId,
    householdId: trace.householdId,
    sourceNpcId: trace.sourceNpcId,
    childProfileId: trace.childProfileId,
    opportunityType: trace.opportunityType,
    npcSelectionReason: trace.npcSelectionReason,
    evidence: { ...trace.evidence },
    gates: [...trace.gates],
    score: trace.score,
    outcome: trace.outcome,
    outcomeReason: trace.outcomeReason,
    steps: sanitizedSteps,
    contentHash: trace.contentHash,
    createdAt: trace.createdAt,
  };
}
