import type { GenerationContextSection } from "./generation-context-policy";

export type GenerationContextTokenEstimator = (value: unknown) => number;

export interface GenerationContextCompactionInput {
  value: unknown;
  maxTokens: number;
  estimateTokens: GenerationContextTokenEstimator;
}

export interface GenerationContextCompactionResult {
  value: unknown;
  strategy: string;
  originalTokens: number;
  compactedTokens: number;
  removedItems: number;
}

export interface GenerationContextCompactor {
  readonly section: GenerationContextSection;
  compact(
    input: GenerationContextCompactionInput,
  ): GenerationContextCompactionResult | null;
}

function stableValueKey(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableValueKey).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableValueKey(entry)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value) ?? String(value);
}

function deduplicateArray(values: readonly unknown[]): unknown[] {
  const seen = new Set<string>();
  const deduplicated: unknown[] = [];

  for (const value of values) {
    const key = stableValueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    deduplicated.push(value);
  }

  return deduplicated;
}

function compactArray(
  values: readonly unknown[],
  maxTokens: number,
  estimateTokens: GenerationContextTokenEstimator,
): { value: unknown[]; removedItems: number } {
  const deduplicated = deduplicateArray(values);
  const compacted = [...deduplicated];

  while (compacted.length > 0 && estimateTokens(compacted) > maxTokens) {
    compacted.pop();
  }

  return {
    value: compacted,
    removedItems: values.length - compacted.length,
  };
}

function compactObjectLists(
  value: Record<string, unknown>,
  maxTokens: number,
  estimateTokens: GenerationContextTokenEstimator,
): { value: Record<string, unknown>; removedItems: number } | null {
  const arrayKeys = Object.keys(value)
    .filter((key) => Array.isArray(value[key]))
    .sort((left, right) => left.localeCompare(right));

  if (arrayKeys.length === 0) return null;

  const compacted: Record<string, unknown> = { ...value };
  let removedItems = 0;

  for (const key of arrayKeys) {
    const original = value[key] as readonly unknown[];
    const deduplicated = deduplicateArray(original);
    compacted[key] = deduplicated;
    removedItems += original.length - deduplicated.length;
  }

  while (estimateTokens(compacted) > maxTokens) {
    const candidates = arrayKeys
      .map((key) => ({ key, values: compacted[key] as unknown[] }))
      .filter((entry) => entry.values.length > 0)
      .sort(
        (left, right) =>
          right.values.length - left.values.length ||
          left.key.localeCompare(right.key),
      );

    const candidate = candidates[0];
    if (!candidate) return null;

    candidate.values.pop();
    removedItems += 1;
  }

  return { value: compacted, removedItems };
}

function deterministicListCompactor(
  section: GenerationContextSection,
): GenerationContextCompactor {
  return {
    section,
    compact(input) {
      const originalTokens = input.estimateTokens(input.value);
      let compacted: { value: unknown; removedItems: number } | null = null;

      if (Array.isArray(input.value)) {
        compacted = compactArray(
          input.value,
          input.maxTokens,
          input.estimateTokens,
        );
      } else if (input.value && typeof input.value === "object") {
        compacted = compactObjectLists(
          input.value as Record<string, unknown>,
          input.maxTokens,
          input.estimateTokens,
        );
      }

      if (!compacted) return null;

      const compactedTokens = input.estimateTokens(compacted.value);
      if (compactedTokens > input.maxTokens) return null;

      return {
        value: compacted.value,
        strategy: "dedupe-and-tail-prune-v1",
        originalTokens,
        compactedTokens,
        removedItems: compacted.removedItems,
      };
    },
  };
}

const DEFAULT_GENERATION_CONTEXT_COMPACTORS: readonly GenerationContextCompactor[] = [
  deterministicListCompactor("world_state"),
  deterministicListCompactor("recent_story_state"),
  deterministicListCompactor("relevant_memories"),
];

export function createGenerationContextCompactorRegistry(
  compactors: readonly GenerationContextCompactor[] =
    DEFAULT_GENERATION_CONTEXT_COMPACTORS,
): ReadonlyMap<GenerationContextSection, GenerationContextCompactor> {
  const registry = new Map<GenerationContextSection, GenerationContextCompactor>();

  for (const compactor of compactors) {
    if (registry.has(compactor.section)) {
      throw new Error(`GENERATION_CONTEXT_COMPACTOR_DUPLICATE:${compactor.section}`);
    }
    registry.set(compactor.section, compactor);
  }

  return registry;
}

export function getDefaultGenerationContextCompactors(): readonly GenerationContextCompactor[] {
  return DEFAULT_GENERATION_CONTEXT_COMPACTORS;
}
