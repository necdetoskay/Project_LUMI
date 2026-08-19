export const CHARACTER_DNA_AXES = [
  "curiosity",
  "courage",
  "empathy",
  "sociability",
  "patience",
  "imagination",
  "persistence",
  "independence",
  "playfulness",
  "caution",
  "adaptability",
] as const;

export type CharacterDnaAxis = (typeof CHARACTER_DNA_AXES)[number];

export const CHARACTER_DYNAMIC_AXES = [
  "happiness",
  "anxiety",
  "confidence",
  "energy",
  "loneliness",
  "excitement",
] as const;

export type CharacterDynamicAxis = (typeof CHARACTER_DYNAMIC_AXES)[number];
export type CharacterDnaVector = Record<CharacterDnaAxis, number>;
export type CharacterDynamicState = Record<CharacterDynamicAxis, number>;

export type CharacterTraitDirection = "low" | "neutral" | "high";

export interface CharacterTraitEvidence {
  axis: CharacterDnaAxis;
  direction: CharacterTraitDirection;
  strength: number;
  sourceFactIds: string[];
  rationale: string;
}

export interface CharacterContextualTrait {
  id: string;
  kind: "fear" | "comfort" | "sensitivity";
  context: string;
  intensity: number;
  sourceFactIds: string[];
}

export interface CharacterLearnedModifier {
  id: string;
  axis: CharacterDnaAxis;
  delta: number;
  reason: string;
  evidenceFactIds: string[];
  createdAt: string;
}

export interface CharacterTraitDerivationState {
  dna: CharacterDnaVector;
  dynamic: CharacterDynamicState;
  contextual: CharacterContextualTrait[];
  learnedModifiers: CharacterLearnedModifier[];
  evidence: CharacterTraitEvidence[];
  seed: string;
  derivationRevision: string;
}

export interface CharacterTraitValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  axis?: CharacterDnaAxis;
}

export interface CharacterTraitValidationResult {
  valid: boolean;
  issues: CharacterTraitValidationIssue[];
}

const DIRECTION_CENTER: Record<CharacterTraitDirection, number> = {
  low: 0.25,
  neutral: 0.5,
  high: 0.75,
};

const DEFAULT_DYNAMIC_STATE: CharacterDynamicState = {
  happiness: 0.5,
  anxiety: 0.25,
  confidence: 0.5,
  energy: 0.6,
  loneliness: 0.2,
  excitement: 0.5,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

export function deriveCharacterDna(
  evidence: CharacterTraitEvidence[],
  seed: string,
): CharacterDnaVector {
  const dna = {} as CharacterDnaVector;

  for (const axis of CHARACTER_DNA_AXES) {
    const axisEvidence = evidence.filter((item) => item.axis === axis);
    if (axisEvidence.length === 0) {
      dna[axis] = 0.5;
      continue;
    }

    let weighted = 0;
    let totalWeight = 0;
    for (const item of axisEvidence) {
      const weight = clamp01(item.strength);
      weighted += DIRECTION_CENTER[item.direction] * weight;
      totalWeight += weight;
    }

    const semantic = totalWeight === 0 ? 0.5 : weighted / totalWeight;
    const jitter = (seededUnit(`${seed}:${axis}`) - 0.5) * 0.08;
    dna[axis] = round4(clamp01(semantic + jitter));
  }

  return dna;
}

export function createInitialCharacterTraitState(input: {
  evidence: CharacterTraitEvidence[];
  seed: string;
  contextual?: CharacterContextualTrait[];
  derivationRevision?: string;
}): CharacterTraitDerivationState {
  return {
    dna: deriveCharacterDna(input.evidence, input.seed),
    dynamic: structuredClone(DEFAULT_DYNAMIC_STATE),
    contextual: structuredClone(input.contextual ?? []),
    learnedModifiers: [],
    evidence: structuredClone(input.evidence),
    seed: input.seed,
    derivationRevision: input.derivationRevision ?? "character-dna-v1",
  };
}

export function updateDynamicCharacterState(
  state: CharacterTraitDerivationState,
  patch: Partial<CharacterDynamicState>,
): CharacterTraitDerivationState {
  const dynamic = { ...state.dynamic };
  for (const axis of CHARACTER_DYNAMIC_AXES) {
    const value = patch[axis];
    if (value !== undefined) dynamic[axis] = round4(clamp01(value));
  }
  return { ...structuredClone(state), dynamic };
}

export function addLearnedCharacterModifier(
  state: CharacterTraitDerivationState,
  modifier: CharacterLearnedModifier,
): CharacterTraitDerivationState {
  if (modifier.delta < -0.2 || modifier.delta > 0.2) {
    throw new Error("CHARACTER_TRAIT_MODIFIER_DELTA_OUT_OF_RANGE");
  }
  if (state.learnedModifiers.some((item) => item.id === modifier.id)) {
    throw new Error("CHARACTER_TRAIT_MODIFIER_ID_DUPLICATE");
  }
  return {
    ...structuredClone(state),
    learnedModifiers: [...state.learnedModifiers, structuredClone(modifier)],
  };
}

export function getEffectiveCharacterDna(
  state: CharacterTraitDerivationState,
): CharacterDnaVector {
  const effective = { ...state.dna };
  for (const modifier of state.learnedModifiers) {
    effective[modifier.axis] = round4(
      clamp01(effective[modifier.axis] + modifier.delta),
    );
  }
  return effective;
}

export function validateCharacterTraitState(
  state: CharacterTraitDerivationState,
): CharacterTraitValidationResult {
  const issues: CharacterTraitValidationIssue[] = [];

  for (const axis of CHARACTER_DNA_AXES) {
    const value = state.dna[axis];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      issues.push({
        code: "CHARACTER_DNA_AXIS_OUT_OF_RANGE",
        message: `${axis} must be within [0,1]`,
        severity: "error",
        axis,
      });
    }

    const strongLow = state.evidence.some(
      (item) => item.axis === axis && item.direction === "low" && item.strength >= 0.75,
    );
    const strongHigh = state.evidence.some(
      (item) => item.axis === axis && item.direction === "high" && item.strength >= 0.75,
    );
    if (strongLow && strongHigh) {
      issues.push({
        code: "CHARACTER_DNA_CONTRADICTORY_EVIDENCE",
        message: `${axis} has strong low and high evidence`,
        severity: "warning",
        axis,
      });
    }
  }

  for (const contextual of state.contextual) {
    if (contextual.intensity < 0 || contextual.intensity > 1) {
      issues.push({
        code: "CHARACTER_CONTEXTUAL_TRAIT_OUT_OF_RANGE",
        message: `${contextual.id} intensity must be within [0,1]`,
        severity: "error",
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
