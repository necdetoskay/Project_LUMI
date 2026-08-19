import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  prepareOnboardingSuggestionPrompt,
  type OnboardingPromptOverride,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";
import {
  CHARACTER_DNA_PROMPT_KEY,
  ensureCharacterDnaPrompt,
} from "./character-dna-prompt-bootstrap.service";

export const CHARACTER_DNA_EVIDENCE_AXES = [
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

export type CharacterDnaEvidenceAxis =
  (typeof CHARACTER_DNA_EVIDENCE_AXES)[number];
export type CharacterDnaEvidenceDirection = "low" | "neutral" | "high";
export type CharacterDnaEvidenceStrength = "weak" | "moderate" | "strong";

export interface CharacterDnaSemanticEvidence {
  axis: CharacterDnaEvidenceAxis;
  direction: CharacterDnaEvidenceDirection;
  strength: CharacterDnaEvidenceStrength;
  sourceFactIds: string[];
  rationale: string;
}

export interface CharacterDnaContextualEvidence {
  id: string;
  kind: "fear" | "comfort" | "sensitivity";
  context: string;
  intensity: CharacterDnaEvidenceStrength;
  sourceFactIds: string[];
}

export interface CharacterDnaEvidenceSuggestion {
  key: string;
  title: string;
  evidence: CharacterDnaSemanticEvidence[];
  contextual: CharacterDnaContextualEvidence[];
}

export interface CharacterDnaEvidenceValidation {
  valid: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning";
  }>;
  evidenceCount: number;
  contextualCount: number;
  coveredAxes: CharacterDnaEvidenceAxis[];
}

export interface GenerateCharacterDnaEvidenceOptions {
  modelOverride?: string | null;
  promptVersionOverride?: number;
  promptOverride?: OnboardingPromptOverride;
  localeOverride?: string;
  creationOverride?: {
    startDirection: "character_first";
    previousSelections: Record<string, unknown>;
  };
  recordTrace?: boolean;
}

export async function previewCharacterDnaEvidencePrompt(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateCharacterDnaEvidenceOptions = {},
) {
  await ensureCharacterDnaPrompt();
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    characterDnaEvidenceSpec(),
    options,
  );
  return {
    promptKey: prepared.promptKey,
    promptVersion: prepared.promptVersion,
    renderedPrompt: {
      system: prepared.systemPrompt,
      user: prepared.userPrompt,
    },
    inputContext: prepared.inputContext,
    modelOverride: prepared.modelOverride,
  };
}

export async function generateCharacterDnaEvidence(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateCharacterDnaEvidenceOptions = {},
) {
  await ensureCharacterDnaPrompt();
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    characterDnaEvidenceSpec(),
    options,
  );
  return {
    suggestions: result.suggestions,
    validation: result.suggestions.map(validateCharacterDnaEvidenceSuggestion),
    rawProviderOutput: result.generated.content,
    provenance: {
      modelId: result.modelId,
      promptKey: result.promptKey,
      promptVersion: result.promptVersion,
      promptTemplateSnapshot: {
        system: result.systemTemplate,
        user: result.userTemplate,
      },
      renderedPrompt: {
        system: result.systemPrompt,
        user: result.userPrompt,
      },
      finalProviderRequest: result.generated.requestSnapshot
        ? structuredClone(result.generated.requestSnapshot)
        : null,
      promptTokens: result.generated.promptTokens,
      completionTokens: result.generated.completionTokens,
      totalTokens: result.generated.totalTokens,
      latencyMs: result.generated.latencyMs,
      estimatedCostUsd:
        result.generated.cost === null
          ? null
          : result.generated.cost.estimatedCostUsdMicros / 1_000_000,
    },
  };
}

function characterDnaEvidenceSpec(): OnboardingSuggestionGenerationSpec<CharacterDnaEvidenceSuggestion> {
  return {
    promptKey: CHARACTER_DNA_PROMPT_KEY,
    taskType: "character_genesis_character_dna_evidence",
    summaryGuard(summary) {
      const origin = getCharacterOrigin(summary);
      if (!summary.characterIdentity || !origin) {
        throw new Error("CHARACTER_DNA_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      characterOrigin: getCharacterOrigin(summary) as object,
    }),
    pick: pickValidatedCharacterDnaEvidence,
    maxAttempts: 3,
  };
}

function getCharacterOrigin(summary: Record<string, unknown>): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: { origin?: object } }
    | undefined;
  return genesis?.sections?.origin ?? null;
}

function pickValidatedCharacterDnaEvidence(
  validated: unknown,
): CharacterDnaEvidenceSuggestion[] {
  const suggestions = pickSuggestionArray<CharacterDnaEvidenceSuggestion>(validated);
  for (const suggestion of suggestions) {
    const evidence = validateCharacterDnaEvidenceSuggestion(suggestion);
    if (!evidence.valid) {
      const codes = evidence.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",");
      throw new Error(`CHARACTER_DNA_EVIDENCE_VALIDATION_FAILED:${codes}`);
    }
  }
  return suggestions;
}

export function validateCharacterDnaEvidenceSuggestion(
  suggestion: CharacterDnaEvidenceSuggestion,
): CharacterDnaEvidenceValidation {
  const issues: CharacterDnaEvidenceValidation["issues"] = [];
  const coveredAxes = new Set<CharacterDnaEvidenceAxis>();

  for (const item of suggestion.evidence) {
    coveredAxes.add(item.axis);
    if (item.sourceFactIds.length === 0) {
      issues.push({
        code: "CHARACTER_DNA_EVIDENCE_SOURCE_REQUIRED",
        message: `${item.axis} evidence requires at least one origin fact reference`,
        severity: "error",
      });
    }
  }

  const contextualIds = new Set<string>();
  for (const item of suggestion.contextual) {
    if (contextualIds.has(item.id)) {
      issues.push({
        code: "CHARACTER_DNA_CONTEXTUAL_ID_DUPLICATE",
        message: `Contextual trait id ${item.id} is duplicated`,
        severity: "error",
      });
    }
    contextualIds.add(item.id);
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    evidenceCount: suggestion.evidence.length,
    contextualCount: suggestion.contextual.length,
    coveredAxes: [...coveredAxes],
  };
}
