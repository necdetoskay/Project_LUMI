import type { InventoryGenesisItemSuggestion } from "../domain";
import {
  generateOnboardingSuggestionsWithProductionPipeline,
  pickSuggestionArray,
  prepareOnboardingSuggestionPrompt,
  type OnboardingPromptOverride,
  type OnboardingSuggestionGenerationSpec,
} from "./onboarding-suggestion-generation-core";
import {
  INVENTORY_GENESIS_PROMPT_KEY,
  ensureInventoryGenesisPrompt,
} from "./inventory-genesis-prompt-bootstrap.service";

export interface InventoryGenesisSuggestion {
  key: string;
  title: string;
  items: InventoryGenesisItemSuggestion[];
}

export interface InventoryGenesisSuggestionValidation {
  valid: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning";
  }>;
  itemCount: number;
}

export interface GenerateInventoryGenesisOptions {
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

export async function previewInventoryGenesisPrompt(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateInventoryGenesisOptions = {},
) {
  await ensureInventoryGenesisPrompt();
  const prepared = await prepareOnboardingSuggestionPrompt(
    userId,
    input,
    inventoryGenesisSpec(),
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

export async function generateInventoryGenesis(
  userId: string,
  input: { householdId: string; childProfileId: string },
  options: GenerateInventoryGenesisOptions = {},
) {
  await ensureInventoryGenesisPrompt();
  const result = await generateOnboardingSuggestionsWithProductionPipeline(
    userId,
    input,
    inventoryGenesisSpec(),
    options,
  );
  return {
    suggestions: result.suggestions,
    validation: result.suggestions.map(validateInventoryGenesisSuggestion),
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

function inventoryGenesisSpec(): OnboardingSuggestionGenerationSpec<InventoryGenesisSuggestion> {
  return {
    promptKey: INVENTORY_GENESIS_PROMPT_KEY,
    taskType: "character_genesis_inventory",
    summaryGuard(summary) {
      if (
        !summary.characterIdentity ||
        !getSection(summary, "origin") ||
        !getSection(summary, "traits") ||
        !getSection(summary, "social")
      ) {
        throw new Error("INVENTORY_GENESIS_CONTEXT_REQUIRED");
      }
    },
    contextExtras: (summary) => ({
      characterIdentity: summary.characterIdentity as object,
      characterOrigin: getSection(summary, "origin") as object,
      characterTraits: getSection(summary, "traits") as object,
      characterSocial: getSection(summary, "social") as object,
    }),
    pick: pickValidatedInventoryGenesis,
    maxAttempts: 3,
  };
}

function getSection(
  summary: Record<string, unknown>,
  key: "origin" | "traits" | "social",
): object | null {
  const genesis = summary.characterGenesis as
    | { sections?: Record<string, object | undefined> }
    | undefined;
  return genesis?.sections?.[key] ?? null;
}

function pickValidatedInventoryGenesis(
  validated: unknown,
): InventoryGenesisSuggestion[] {
  const suggestions =
    pickSuggestionArray<InventoryGenesisSuggestion>(validated);
  for (const suggestion of suggestions) {
    const validation = validateInventoryGenesisSuggestion(suggestion);
    if (!validation.valid) {
      const codes = validation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.code)
        .join(",");
      throw new Error(`INVENTORY_GENESIS_VALIDATION_FAILED:${codes}`);
    }
  }
  return suggestions;
}

export function validateInventoryGenesisSuggestion(
  suggestion: InventoryGenesisSuggestion,
): InventoryGenesisSuggestionValidation {
  const issues: InventoryGenesisSuggestionValidation["issues"] = [];
  const keys = new Set<string>();
  let elevatedRarity = 0;
  let highStoryPotential = 0;

  for (const item of suggestion.items) {
    const key = item.key.trim().toLocaleLowerCase("en-US");
    if (!key || keys.has(key)) {
      issues.push({
        code: "INVENTORY_GENESIS_DUPLICATE_ITEM_KEY",
        message: `Inventory item key '${item.key}' must be unique and non-empty`,
        severity: "error",
      });
    }
    keys.add(key);

    if (
      item.provenance.role === "relationship" &&
      !item.provenance.givenByNpcId
    ) {
      issues.push({
        code: "INVENTORY_GENESIS_RELATIONSHIP_GIVER_REQUIRED",
        message: `${item.key} is relationship-related but has no Social Genesis giver`,
        severity: "error",
      });
    }
    if (
      item.provenance.role === "legacy" &&
      item.provenance.originFactIds.length === 0
    ) {
      issues.push({
        code: "INVENTORY_GENESIS_LEGACY_FACT_REQUIRED",
        message: `${item.key} is legacy-related but has no origin fact`,
        severity: "error",
      });
    }
    if (["rare", "unique", "legendary"].includes(item.rarity))
      elevatedRarity += 1;
    if (item.provenance.storyPotential === "high") highStoryPotential += 1;
  }

  if (suggestion.items.length > 5) {
    issues.push({
      code: "INVENTORY_GENESIS_TOO_MANY_ITEMS",
      message: "Inventory Genesis suggestions may contain at most five items",
      severity: "error",
    });
  }
  if (suggestion.items.length < 3) {
    issues.push({
      code: "INVENTORY_GENESIS_LIGHT_START",
      message:
        "Fewer than three items is valid only for a naturally sparse character concept",
      severity: "warning",
    });
  }
  if (elevatedRarity > 1) {
    issues.push({
      code: "INVENTORY_GENESIS_RARITY_OVERLOAD",
      message: "Only one rare/unique starting item should normally be proposed",
      severity: "warning",
    });
  }
  if (highStoryPotential > 1) {
    issues.push({
      code: "INVENTORY_GENESIS_STORY_HOOK_OVERLOAD",
      message:
        "Only one high story-potential starting item should normally be proposed",
      severity: "warning",
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    itemCount: suggestion.items.length,
  };
}
