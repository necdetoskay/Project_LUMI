import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  prepareOnboardingSuggestionPrompt,
  type OnboardingPromptOverride,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";
import {
  SOCIAL_GENESIS_PROMPT_KEY,
  ensureSocialGenesisPrompt,
} from "./social-genesis-prompt-bootstrap.service";

export const SOCIAL_GENESIS_ROLES = [
  "caregiver",
  "family",
  "friend",
  "rival",
  "mentor",
  "neighbor",
  "community",
  "acquaintance",
] as const;

export const SOCIAL_GENESIS_RELATIONSHIP_DIMENSIONS = [
  "trust",
  "affection",
  "familiarity",
  "respect",
  "tension",
  "dependence",
] as const;

export type SocialGenesisRole = (typeof SOCIAL_GENESIS_ROLES)[number];
export type SocialGenesisRelationshipDimension =
  (typeof SOCIAL_GENESIS_RELATIONSHIP_DIMENSIONS)[number];
export type SocialGenesisDirection = "low" | "neutral" | "high";
export type SocialGenesisStrength = "weak" | "moderate" | "strong";

export interface SocialGenesisNpcSuggestion {
  identityKey: string;
  displayName: string;
  role: SocialGenesisRole;
  source: "origin" | "derived";
  originFactIds: string[];
  aliases?: string[];
  personality: {
    traits: string[];
    interactionStyle: string;
    futureInteractionPotential: "low" | "medium" | "high";
  };
}

export interface SocialGenesisRelationshipEvidence {
  fromIdentityKey: string;
  toIdentityKey: string;
  dimension: SocialGenesisRelationshipDimension;
  direction: SocialGenesisDirection;
  strength: SocialGenesisStrength;
  sourceFactIds: string[];
  rationale: string;
}

export interface SocialGenesisSuggestion {
  key: string;
  title: string;
  characterIdentityKey: string;
  npcs: SocialGenesisNpcSuggestion[];
  relationships: SocialGenesisRelationshipEvidence[];
}

export interface SocialGenesisSuggestionValidation {
  valid: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning";
  }>;
  npcCount: number;
  relationshipEvidenceCount: number;
}

export interface GenerateSocialGenesisOptions {
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

export async function previewSocialGenesisPrompt(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateSocialGenesisOptions = {},
) {
  await ensureSocialGenesisPrompt();
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    socialGenesisSpec(),
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

export async function generateSocialGenesis(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateSocialGenesisOptions = {},
) {
  await ensureSocialGenesisPrompt();
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    socialGenesisSpec(),
    options,
  );
  return {
    suggestions: result.suggestions,
    validation: result.suggestions.map(validateSocialGenesisSuggestion),
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

function socialGenesisSpec(): OnboardingSuggestionGenerationSpec<SocialGenesisSuggestion> {
  return {
    promptKey: SOCIAL_GENESIS_PROMPT_KEY,
    taskType: "character_genesis_social",
    summaryGuard(summary) {
      if (
        !summary.characterIdentity ||
        !getOrigin(summary) ||
        !getTraits(summary)
      ) {
        throw new Error("SOCIAL_GENESIS_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      characterOrigin: getOrigin(summary) as object,
      characterTraits: getTraits(summary) as object,
    }),
    pick: pickValidatedSocialGenesis,
    maxAttempts: 3,
  };
}

function getOrigin(summary: Record<string, unknown>): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: { origin?: object } }
    | undefined;
  return genesis?.sections?.origin ?? null;
}

function getTraits(summary: Record<string, unknown>): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: { traits?: object } }
    | undefined;
  return genesis?.sections?.traits ?? null;
}

function pickValidatedSocialGenesis(
  validated: unknown,
): SocialGenesisSuggestion[] {
  const suggestions = pickSuggestionArray<SocialGenesisSuggestion>(validated);
  for (const suggestion of suggestions) {
    const validation = validateSocialGenesisSuggestion(suggestion);
    if (!validation.valid) {
      const codes = validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",");
      throw new Error(`SOCIAL_GENESIS_VALIDATION_FAILED:${codes}`);
    }
  }
  return suggestions;
}

export function validateSocialGenesisSuggestion(
  suggestion: SocialGenesisSuggestion,
): SocialGenesisSuggestionValidation {
  const issues: SocialGenesisSuggestionValidation["issues"] = [];
  const identities = new Set<string>();

  for (const npc of suggestion.npcs) {
    const key = npc.identityKey.trim().toLocaleLowerCase("en-US");
    if (identities.has(key)) {
      issues.push({
        code: "SOCIAL_GENESIS_DUPLICATE_IDENTITY_KEY",
        message: `NPC identityKey ${npc.identityKey} is duplicated`,
        severity: "error",
      });
    }
    identities.add(key);
    if (npc.source === "origin" && npc.originFactIds.length === 0) {
      issues.push({
        code: "SOCIAL_GENESIS_ORIGIN_SOURCE_REQUIRED",
        message: `${npc.displayName} is origin-backed but has no originFactIds`,
        severity: "error",
      });
    }
  }

  for (const relationship of suggestion.relationships) {
    if (relationship.fromIdentityKey === relationship.toIdentityKey) {
      issues.push({
        code: "SOCIAL_GENESIS_SELF_RELATIONSHIP",
        message: "Relationship evidence cannot target the same identity",
        severity: "error",
      });
    }
  }

  if (suggestion.npcs.length > 6) {
    issues.push({
      code: "SOCIAL_GENESIS_DENSITY_HIGH",
      message:
        "Initial social graph should normally stay at six significant NPCs or fewer",
      severity: "warning",
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    npcCount: suggestion.npcs.length,
    relationshipEvidenceCount: suggestion.relationships.length,
  };
}
