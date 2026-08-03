import { hashJson } from "./hash";
import type { CandidateAction } from "./candidate";
import type { UtilityScore } from "./utility";

export const TRACE_STEP_NAMES = [
  "perception",
  "need_evaluation",
  "context_build",
  "candidate_generation",
  "utility_evaluation",
  "selection",
] as const;
export type TraceStepName = (typeof TRACE_STEP_NAMES)[number];

export interface TraceStep {
  step: TraceStepName;
  message: string;
  data: Record<string, unknown>;
}

export interface Elimination {
  candidateId: string;
  reason: string;
}

export interface DecisionTrace {
  traceId: string;
  npcId: string;
  householdId: string;
  decidedAt: Date;
  seed: string;
  steps: TraceStep[];
  candidates: CandidateAction[];
  eliminations: Elimination[];
  scores: UtilityScore[];
  selectedCandidateId: string | null;
  selectionReason: string;
  contentHash: string;
}

export interface NpcDecisionEvent {
  id: string;
  npcId: string;
  householdId: string;
  eventType: "NPC_DECISION_MADE";
  eventVersion: number;
  aggregateVersion: number;
  traceId: string;
  selectedCandidateId: string | null;
  createdAt: Date;
}

/**
 * Step data keys allowed in an externally exposed decision trace.
 * Anything not on this safelist is stripped so secrets and private child
 * data can never leak through a trace.
 */
export const SAFE_STEP_KEYS: Record<TraceStepName, readonly string[]> = {
  perception: ["factCount", "beliefCount", "dominantCategory"],
  need_evaluation: ["dominantNeed", "topPressures", "urgency"],
  context_build: ["vectorHash", "relationshipCount", "goalCount"],
  candidate_generation: ["candidateCount", "generatedKinds"],
  utility_evaluation: ["policyVersion", "topScore"],
  selection: ["selectedKind", "reason"],
};

export function computeTraceHash(trace: {
  seed: string;
  steps: TraceStep[];
  candidates: CandidateAction[];
  eliminations: Elimination[];
  scores: UtilityScore[];
  selectedCandidateId: string | null;
}): string {
  return hashJson({
    seed: trace.seed,
    steps: trace.steps,
    candidates: trace.candidates.map((c) => ({
      id: c.id,
      kind: c.kind,
      targetCharacterId: c.targetCharacterId,
    })),
    eliminations: trace.eliminations,
    scores: trace.scores.map((s) => ({
      candidateId: s.candidateId,
      total: s.total,
      policyVersion: s.policyVersion,
    })),
    selectedCandidateId: trace.selectedCandidateId,
  });
}

/** Returns a deep, safelisted copy of a decision trace for external exposure. */
export function sanitizeTrace(trace: DecisionTrace): DecisionTrace {
  const sanitizedSteps: TraceStep[] = trace.steps.map((step) => {
    const allowed = SAFE_STEP_KEYS[step.step] ?? [];
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
    npcId: trace.npcId,
    householdId: trace.householdId,
    decidedAt: trace.decidedAt,
    seed: trace.seed,
    steps: sanitizedSteps,
    candidates: trace.candidates.map((c) => ({
      id: c.id,
      kind: c.kind,
      description: c.description,
      requiredFactIds: [],
      targetCharacterId: c.targetCharacterId,
      needTypes: c.needTypes,
      personalityFit: c.personalityFit,
      safety: c.safety,
    })),
    eliminations: trace.eliminations.map((e) => ({ ...e })),
    scores: trace.scores.map((s) => ({
      ...s,
      components: { ...s.components },
      reasons: [...s.reasons],
    })),
    selectedCandidateId: trace.selectedCandidateId,
    selectionReason: trace.selectionReason,
    contentHash: trace.contentHash,
  };
}
