import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  prepareOnboardingSuggestionPrompt,
  type OnboardingPromptOverride,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";
import {
  DEEP_CHARACTER_ORIGIN_PROMPT_KEY,
  ensureDeepCharacterOriginPrompt,
} from "./deep-origin-prompt-bootstrap.service";

export const DEEP_ORIGIN_QUALITY_RUBRIC = [
  "past_life_believability",
  "future_story_yield",
  "world_consistency",
  "age_appropriateness",
  "fact_coherence",
  "knowledge_boundary_safety",
] as const;

export type DeepOriginQualityDimension =
  (typeof DEEP_ORIGIN_QUALITY_RUBRIC)[number];

export const DEEP_ORIGIN_VISIBILITIES = [
  "user_visible",
  "known_to_character",
  "known_to_family",
  "known_to_npc",
  "unknown_to_character",
  "system_only",
] as const;

export type DeepOriginVisibility = (typeof DEEP_ORIGIN_VISIBILITIES)[number];

export const DEEP_ORIGIN_FACT_KINDS = [
  "person",
  "place",
  "event",
  "skill",
  "preference",
  "possession",
  "relationship",
  "secret",
  "belief",
  "habit",
] as const;

export type DeepOriginFactKind = (typeof DEEP_ORIGIN_FACT_KINDS)[number];

export interface DeepOriginFact {
  id: string;
  kind: DeepOriginFactKind;
  summary: string;
  visibility: DeepOriginVisibility;
  sourceRef?: string;
}

export interface DeepOriginQuestion {
  id: string;
  summary: string;
  visibility: DeepOriginVisibility;
  relatedFactIds: string[];
}

export interface DeepOriginHook {
  id: string;
  summary: string;
  relatedFactIds: string[];
  potential: number;
}

export interface DeepCharacterOriginSuggestion {
  key: string;
  title: string;
  summary: string;
  narrative: string;
  facts: DeepOriginFact[];
  summaryFactIds: string[];
  narrativeFactIds: string[];
  unresolvedQuestions: DeepOriginQuestion[];
  storyHooks: DeepOriginHook[];
}

export interface DeepOriginValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  path?: string;
}

export interface DeepOriginValidationEvidence {
  valid: boolean;
  issues: DeepOriginValidationIssue[];
  narrativeWordCount: number;
  factCount: number;
  distinctFactKinds: number;
  unresolvedQuestionCount: number;
  storyHookCount: number;
  qualityRubric: readonly DeepOriginQualityDimension[];
}

export interface GenerateDeepCharacterOriginsOptions {
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

export interface DeepCharacterOriginPromptPreview {
  promptKey: string;
  promptVersion: number;
  renderedPrompt: { system: string; user: string };
  inputContext: Record<string, string | number | boolean | null | object>;
  modelOverride: string | null;
}

export interface DeepCharacterOriginGenerationResult {
  suggestions: DeepCharacterOriginSuggestion[];
  validation: DeepOriginValidationEvidence[];
  rawProviderOutput: string;
  provenance: {
    modelId: string;
    promptKey: string;
    promptVersion: number;
    promptTemplateSnapshot: { system: string; user: string };
    renderedPrompt: { system: string; user: string };
    finalProviderRequest: Record<string, unknown> | null;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    latencyMs: number;
    estimatedCostUsd: number | null;
  };
}

export async function previewDeepCharacterOriginPrompt(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateDeepCharacterOriginsOptions = {},
): Promise<DeepCharacterOriginPromptPreview> {
  await ensureDeepCharacterOriginPrompt();
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    deepOriginSpec(),
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

export async function generateDeepCharacterOrigins(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateDeepCharacterOriginsOptions = {},
): Promise<DeepCharacterOriginGenerationResult> {
  await ensureDeepCharacterOriginPrompt();

  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    deepOriginSpec(),
    options,
  );

  const validation = result.suggestions.map(validateDeepCharacterOrigin);

  return {
    suggestions: result.suggestions,
    validation,
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

function deepOriginSpec(): OnboardingSuggestionGenerationSpec<DeepCharacterOriginSuggestion> {
  return {
    promptKey: DEEP_CHARACTER_ORIGIN_PROMPT_KEY,
    taskType: "character_genesis_deep_origin",
    summaryGuard(summary) {
      if (!summary.characterIdentity || !summary.world || !summary.region) {
        throw new Error("DEEP_CHARACTER_ORIGIN_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterType: (summary.characterType ?? {}) as object,
      characterIdentity: summary.characterIdentity as object,
      world: summary.world as object,
      region: summary.region as object,
    }),
    pick: pickValidatedDeepOrigins,
    maxAttempts: 3,
  };
}

function pickValidatedDeepOrigins(
  validated: unknown,
): DeepCharacterOriginSuggestion[] {
  const suggestions =
    pickSuggestionArray<DeepCharacterOriginSuggestion>(validated);
  for (const suggestion of suggestions) {
    const evidence = validateDeepCharacterOrigin(suggestion);
    if (!evidence.valid) {
      const codes = evidence.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",");
      throw new Error(`DEEP_ORIGIN_SEMANTIC_VALIDATION_FAILED:${codes}`);
    }
  }
  return suggestions;
}

export function validateDeepCharacterOrigin(
  suggestion: DeepCharacterOriginSuggestion,
): DeepOriginValidationEvidence {
  const issues: DeepOriginValidationIssue[] = [];
  const factIds = new Set<string>();
  const factById = new Map<string, DeepOriginFact>();

  for (const fact of suggestion.facts) {
    if (factIds.has(fact.id)) {
      issues.push({
        code: "DEEP_ORIGIN_DUPLICATE_FACT_ID",
        message: `Fact id ${fact.id} is duplicated`,
        path: "facts",
        severity: "error",
      });
    }
    if (!DEEP_ORIGIN_FACT_KINDS.includes(fact.kind)) {
      issues.push({
        code: "DEEP_ORIGIN_FACT_KIND_INVALID",
        message: `Fact ${fact.id} uses unsupported kind ${String(fact.kind)}`,
        path: "facts",
        severity: "error",
      });
    }
    if (!DEEP_ORIGIN_VISIBILITIES.includes(fact.visibility)) {
      issues.push({
        code: "DEEP_ORIGIN_FACT_VISIBILITY_INVALID",
        message: `Fact ${fact.id} uses unsupported visibility ${String(fact.visibility)}`,
        path: "facts",
        severity: "error",
      });
    }
    factIds.add(fact.id);
    factById.set(fact.id, fact);
  }

  const narrativeFactIds = new Set(suggestion.narrativeFactIds);
  for (const factId of suggestion.narrativeFactIds) {
    if (!factIds.has(factId)) {
      issues.push({
        code: "DEEP_ORIGIN_NARRATIVE_FACT_MISSING",
        message: `Narrative references missing fact ${factId}`,
        path: "narrativeFactIds",
        severity: "error",
      });
    }
  }

  for (const factId of suggestion.summaryFactIds) {
    const fact = factById.get(factId);
    if (!fact) {
      issues.push({
        code: "DEEP_ORIGIN_SUMMARY_FACT_MISSING",
        message: `Summary references missing fact ${factId}`,
        path: "summaryFactIds",
        severity: "error",
      });
      continue;
    }
    if (!narrativeFactIds.has(factId)) {
      issues.push({
        code: "DEEP_ORIGIN_SUMMARY_FACT_NOT_IN_NARRATIVE",
        message: `Summary fact ${factId} must also be part of the canonical narrative fact set`,
        path: "summaryFactIds",
        severity: "error",
      });
    }
    if (
      fact.visibility !== "user_visible" &&
      fact.visibility !== "known_to_character"
    ) {
      issues.push({
        code: "DEEP_ORIGIN_SUMMARY_HIDDEN_FACT",
        message: `Summary cannot derive from hidden fact ${factId}`,
        path: "summaryFactIds",
        severity: "error",
      });
    }
  }

  for (const question of suggestion.unresolvedQuestions) {
    if (!DEEP_ORIGIN_VISIBILITIES.includes(question.visibility)) {
      issues.push({
        code: "DEEP_ORIGIN_QUESTION_VISIBILITY_INVALID",
        message: `Question ${question.id} uses unsupported visibility ${String(question.visibility)}`,
        path: "unresolvedQuestions",
        severity: "error",
      });
    }
  }

  validateRelatedFactRefs(
    suggestion.unresolvedQuestions,
    factIds,
    "unresolvedQuestions",
    issues,
  );
  validateRelatedFactRefs(suggestion.storyHooks, factIds, "storyHooks", issues);

  for (const hook of suggestion.storyHooks) {
    if (hook.potential < 0 || hook.potential > 1) {
      issues.push({
        code: "DEEP_ORIGIN_HOOK_POTENTIAL_RANGE",
        message: `Hook ${hook.id} potential must be within [0,1]`,
        path: "storyHooks",
        severity: "error",
      });
    }
  }

  if (suggestion.unresolvedQuestions.length === 0) {
    issues.push({
      code: "DEEP_ORIGIN_NO_UNRESOLVED_QUESTION",
      message:
        "Origin should deliberately leave at least one question unresolved",
      path: "unresolvedQuestions",
      severity: "error",
    });
  }
  if (suggestion.storyHooks.length === 0) {
    issues.push({
      code: "DEEP_ORIGIN_NO_STORY_HOOK",
      message: "Origin should expose at least one future-story hook",
      path: "storyHooks",
      severity: "error",
    });
  }

  const narrativeWordCount = countWords(suggestion.narrative);
  if (narrativeWordCount < 220) {
    issues.push({
      code: "DEEP_ORIGIN_NARRATIVE_SHALLOW",
      message: `Narrative has ${narrativeWordCount} words; normal origins usually need more depth`,
      path: "narrative",
      severity: "warning",
    });
  } else if (narrativeWordCount > 650) {
    issues.push({
      code: "DEEP_ORIGIN_NARRATIVE_OVERLONG",
      message: `Narrative has ${narrativeWordCount} words; consider a tighter canonical history`,
      path: "narrative",
      severity: "warning",
    });
  }

  if (suggestion.facts.length < 4) {
    issues.push({
      code: "DEEP_ORIGIN_TOO_FEW_FACTS",
      message:
        "Origin needs enough structured facts to support retrieval and downstream genesis",
      path: "facts",
      severity: "warning",
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    narrativeWordCount,
    factCount: suggestion.facts.length,
    distinctFactKinds: new Set(suggestion.facts.map((fact) => fact.kind)).size,
    unresolvedQuestionCount: suggestion.unresolvedQuestions.length,
    storyHookCount: suggestion.storyHooks.length,
    qualityRubric: DEEP_ORIGIN_QUALITY_RUBRIC,
  };
}

function validateRelatedFactRefs(
  entries: Array<{ id: string; relatedFactIds: string[] }>,
  factIds: Set<string>,
  path: string,
  issues: DeepOriginValidationIssue[],
): void {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      issues.push({
        code: "DEEP_ORIGIN_DUPLICATE_RELATED_ENTRY_ID",
        message: `${path} id ${entry.id} is duplicated`,
        path,
        severity: "error",
      });
    }
    ids.add(entry.id);
    for (const factId of entry.relatedFactIds) {
      if (!factIds.has(factId)) {
        issues.push({
          code: "DEEP_ORIGIN_RELATED_FACT_MISSING",
          message: `${entry.id} references missing fact ${factId}`,
          path,
          severity: "error",
        });
      }
    }
  }
}

function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}
