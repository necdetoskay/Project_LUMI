import {
  EMOTION_DIMENSIONS,
  type EmotionDimension,
  type EmotionVector,
} from "../domain";
import {
  getCharacterDomain,
  updateEmotions,
  type CharacterDomainSummary,
} from "./character-domain.service";

export const EMOTION_RULE_VERSION = "emotion-rules-v1" as const;

export type EmotionEventKind =
  | "reassuring_success"
  | "social_support"
  | "unexpected_threat"
  | "meaningful_loss";

export interface EmotionEventInput {
  kind: EmotionEventKind;
  evidence: string;
  intensity?: number;
}

export interface ResolvedEmotionDelta {
  dimension: EmotionDimension;
  before: number;
  delta: number;
  after: number;
  evidence: string;
}

export interface EmotionEventApplicationResult {
  ruleVersion: typeof EMOTION_RULE_VERSION;
  event: EmotionEventInput;
  before: EmotionVector;
  after: EmotionVector;
  deltas: ResolvedEmotionDelta[];
  unchangedDimensions: EmotionDimension[];
  character: CharacterDomainSummary;
}

const EVENT_RULES: Record<
  EmotionEventKind,
  Partial<Record<EmotionDimension, number>>
> = {
  reassuring_success: {
    joy: 0.18,
    fear: -0.2,
    trust: 0.1,
  },
  social_support: {
    joy: 0.1,
    sadness: -0.08,
    trust: 0.2,
  },
  unexpected_threat: {
    fear: 0.25,
    surprise: 0.15,
    joy: -0.08,
  },
  meaningful_loss: {
    sadness: 0.25,
    joy: -0.15,
    trust: -0.05,
  },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeIntensity(value: number | undefined): number {
  if (value === undefined) return 1;
  if (!Number.isFinite(value)) return 1;
  return clamp01(value);
}

export function evaluateEmotionEvent(
  current: EmotionVector,
  event: EmotionEventInput,
): Omit<EmotionEventApplicationResult, "character"> {
  const rule = EVENT_RULES[event.kind];
  const intensity = normalizeIntensity(event.intensity);
  const before: EmotionVector = { ...current };
  const after: EmotionVector = { ...current };
  const deltas: ResolvedEmotionDelta[] = [];
  const touched = new Set<EmotionDimension>();

  for (const dimension of EMOTION_DIMENSIONS) {
    const baseDelta = rule[dimension];
    if (typeof baseDelta !== "number") continue;

    const oldValue = current[dimension] ?? 0;
    const requestedDelta = baseDelta * intensity;
    const newValue = clamp01(oldValue + requestedDelta);
    const appliedDelta = Number((newValue - oldValue).toFixed(6));

    after[dimension] = Number(newValue.toFixed(6));
    touched.add(dimension);
    deltas.push({
      dimension,
      before: oldValue,
      delta: appliedDelta,
      after: after[dimension]!,
      evidence: event.evidence,
    });
  }

  const unchangedDimensions = EMOTION_DIMENSIONS.filter(
    (dimension) => !touched.has(dimension),
  );

  return {
    ruleVersion: EMOTION_RULE_VERSION,
    event: { ...event, intensity },
    before,
    after,
    deltas,
    unchangedDimensions,
  };
}

/**
 * Production orchestration for explainable event-driven emotion updates.
 *
 * The rule evaluation is deterministic and versioned. Persistence stays behind
 * the existing profile domain service so household ownership, validation,
 * optimistic character versioning, transactional writes and domain-event audit
 * semantics remain authoritative.
 */
export async function applyEmotionEvent(
  userId: string,
  householdId: string,
  characterId: string,
  event: EmotionEventInput,
): Promise<EmotionEventApplicationResult> {
  const beforeCharacter = await getCharacterDomain(
    userId,
    householdId,
    characterId,
  );
  const evaluation = evaluateEmotionEvent(beforeCharacter.emotions, event);
  const character = await updateEmotions(
    userId,
    householdId,
    characterId,
    evaluation.after,
  );

  return {
    ...evaluation,
    character,
  };
}
