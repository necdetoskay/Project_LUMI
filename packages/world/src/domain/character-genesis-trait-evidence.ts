import type {
  CharacterContextualTrait,
  CharacterDnaAxis,
  CharacterTraitDirection,
  CharacterTraitEvidence,
  CharacterTraitValidationIssue,
} from "./character-genesis-traits";

export const CHARACTER_TRAIT_STRENGTH_LEVELS = [
  "weak",
  "moderate",
  "strong",
] as const;

export type CharacterTraitStrengthLevel =
  (typeof CHARACTER_TRAIT_STRENGTH_LEVELS)[number];

const STRENGTH_BY_LEVEL: Record<CharacterTraitStrengthLevel, number> = {
  weak: 0.35,
  moderate: 0.6,
  strong: 0.85,
};

export interface SemanticCharacterTraitEvidence {
  axis: CharacterDnaAxis;
  direction: CharacterTraitDirection;
  strength: CharacterTraitStrengthLevel;
  sourceFactIds: string[];
  rationale: string;
}

export function normalizeSemanticCharacterTraitEvidence(
  evidence: SemanticCharacterTraitEvidence,
): CharacterTraitEvidence {
  return {
    axis: evidence.axis,
    direction: evidence.direction,
    strength: STRENGTH_BY_LEVEL[evidence.strength],
    sourceFactIds: [...evidence.sourceFactIds],
    rationale: evidence.rationale,
  };
}

export function validateCharacterTraitEvidenceReferences(input: {
  originFactIds: Iterable<string>;
  evidence: CharacterTraitEvidence[];
  contextual: CharacterContextualTrait[];
}): CharacterTraitValidationIssue[] {
  const known = new Set(input.originFactIds);
  const issues: CharacterTraitValidationIssue[] = [];

  for (const item of input.evidence) {
    for (const factId of item.sourceFactIds) {
      if (!known.has(factId)) {
        issues.push({
          code: "CHARACTER_TRAIT_EVIDENCE_FACT_MISSING",
          message: `${item.axis} evidence references unknown origin fact ${factId}`,
          severity: "error",
          axis: item.axis,
        });
      }
    }
  }

  for (const item of input.contextual) {
    for (const factId of item.sourceFactIds) {
      if (!known.has(factId)) {
        issues.push({
          code: "CHARACTER_CONTEXTUAL_TRAIT_FACT_MISSING",
          message: `${item.id} references unknown origin fact ${factId}`,
          severity: "error",
        });
      }
    }
  }

  return issues;
}
