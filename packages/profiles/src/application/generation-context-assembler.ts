import { createHash } from "node:crypto";

import {
  createGenerationContextCompactorRegistry,
  type GenerationContextCompactor,
} from "./generation-context-compaction";
import type { GenerationContext } from "./generation-context.service";
import {
  getGenerationContextPolicy,
  type GenerationContextPriority,
  type GenerationContextSection,
} from "./generation-context-policy";
import {
  createGenerationContextSourceRegistry,
  type GenerationContextSource,
  type GenerationContextSourceAuthority,
  type GenerationContextSourceReason,
  type GenerationContextSourceResult,
} from "./generation-context-source";

export interface GenerationContextCompactionEvidence {
  strategy: string;
  originalTokens: number;
  compactedTokens: number;
  removedItems: number;
}

export interface GenerationContextSectionProvenance {
  source: string;
  sourceId?: string;
  sourceVersion: string;
  revision?: string;
  authority: GenerationContextSourceAuthority;
  reason: GenerationContextSourceReason;
  updatedAt?: string;
  compaction?: GenerationContextCompactionEvidence;
}

export interface AssembledGenerationContextSection {
  section: GenerationContextSection;
  priority: GenerationContextPriority;
  maxTokens: number;
  estimatedTokens: number;
  value: unknown;
  provenance: GenerationContextSectionProvenance;
}

export interface AssembledGenerationContext {
  profile: GenerationContext["profile"];
  maxContextTokens: number;
  estimatedTokens: number;
  fingerprint: string;
  sections: readonly AssembledGenerationContextSection[];
  droppedSections: readonly GenerationContextSection[];
}

export interface AssembleGenerationContextOptions {
  maxContextTokens?: number;
  sources?: readonly GenerationContextSource[];
  compactors?: readonly GenerationContextCompactor[];
}

const PRIORITY_WEIGHT: Record<GenerationContextPriority, number> = {
  required: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function estimateGenerationContextTokens(value: unknown): number {
  if (value == null) return 1;
  const serialized = JSON.stringify(value);
  if (!serialized) return 1;
  return Math.max(1, Math.ceil(serialized.length / 4));
}

function canonicalizeForFingerprint(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForFingerprint);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalizeForFingerprint(entry)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function fingerprintGenerationContext(input: {
  profile: GenerationContext["profile"];
  maxContextTokens: number;
  sections: readonly AssembledGenerationContextSection[];
}): string {
  const canonical = canonicalizeForFingerprint({
    profile: input.profile,
    maxContextTokens: input.maxContextTokens,
    sections: input.sections.map((section) => ({
      section: section.section,
      value: section.value,
      provenance: section.provenance,
    })),
  });

  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      hasMeaningfulValue,
    );
  }
  return false;
}

function promptContextFromSections(
  sections: readonly AssembledGenerationContextSection[],
): Record<string, unknown> {
  return Object.fromEntries(
    sections.map((section) => [section.section, section.value]),
  );
}

function provenanceFromSource(
  source: GenerationContextSource,
  result: GenerationContextSourceResult,
  compaction?: GenerationContextCompactionEvidence,
): GenerationContextSectionProvenance {
  return {
    source: source.source,
    sourceVersion: source.sourceVersion,
    authority: source.authority,
    reason: source.reason,
    ...(result.sourceId ? { sourceId: result.sourceId } : {}),
    ...(result.revision ? { revision: result.revision } : {}),
    ...(result.updatedAt ? { updatedAt: result.updatedAt } : {}),
    ...(compaction ? { compaction } : {}),
  };
}

function applyTotalTokenBudget(
  sections: readonly AssembledGenerationContextSection[],
  maxContextTokens: number,
): {
  sections: AssembledGenerationContextSection[];
  droppedSections: GenerationContextSection[];
} {
  const required = sections.filter(
    (section) => section.priority === "required",
  );
  const requiredPromptTokens = estimateGenerationContextTokens(
    promptContextFromSections(required),
  );

  if (requiredPromptTokens > maxContextTokens) {
    throw new Error(
      `GENERATION_CONTEXT_REQUIRED_BUDGET_EXCEEDED:${requiredPromptTokens}:${maxContextTokens}`,
    );
  }

  const ranked = sections
    .map((section, index) => ({ section, index }))
    .sort(
      (left, right) =>
        PRIORITY_WEIGHT[left.section.priority] -
          PRIORITY_WEIGHT[right.section.priority] || left.index - right.index,
    );

  const included: AssembledGenerationContextSection[] = [];
  const dropped = new Set<GenerationContextSection>();

  for (const { section } of ranked) {
    const candidate = [...included, section].sort(
      (left, right) =>
        sections.findIndex((entry) => entry.section === left.section) -
        sections.findIndex((entry) => entry.section === right.section),
    );
    const candidateTokens = estimateGenerationContextTokens(
      promptContextFromSections(candidate),
    );

    if (candidateTokens <= maxContextTokens) {
      included.push(section);
    } else if (section.priority === "required") {
      throw new Error(
        `GENERATION_CONTEXT_REQUIRED_BUDGET_EXCEEDED:${candidateTokens}:${maxContextTokens}`,
      );
    } else {
      dropped.add(section.section);
    }
  }

  const originalOrder = new Map(
    sections.map((section, index) => [section.section, index]),
  );

  return {
    sections: included.sort(
      (left, right) =>
        (originalOrder.get(left.section) ?? 0) -
        (originalOrder.get(right.section) ?? 0),
    ),
    droppedSections: sections
      .filter((section) => dropped.has(section.section))
      .map((section) => section.section),
  };
}

export function assembleGenerationContext(
  context: GenerationContext,
  options: AssembleGenerationContextOptions = {},
): AssembledGenerationContext {
  const policy = getGenerationContextPolicy(context.profile);
  const maxContextTokens = options.maxContextTokens ?? policy.maxContextTokens;
  const sourceRegistry = createGenerationContextSourceRegistry(options.sources);
  const compactorRegistry = createGenerationContextCompactorRegistry(
    options.compactors,
  );
  const candidateSections: AssembledGenerationContextSection[] = [];
  const droppedSections = new Set<GenerationContextSection>();

  for (const sectionPolicy of policy.sections) {
    const contextSource = sourceRegistry.get(sectionPolicy.section);
    if (!contextSource) {
      if (sectionPolicy.priority === "required") {
        throw new Error(
          `GENERATION_CONTEXT_SOURCE_UNREGISTERED:${sectionPolicy.section}`,
        );
      }
      droppedSections.add(sectionPolicy.section);
      continue;
    }

    let result: GenerationContextSourceResult;
    try {
      result = contextSource.resolve(context);
    } catch (error) {
      if (sectionPolicy.priority === "required") {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `GENERATION_CONTEXT_SOURCE_FAILED:${sectionPolicy.section}:${contextSource.source}:${message}`,
        );
      }
      droppedSections.add(sectionPolicy.section);
      continue;
    }

    let value = result.value;
    if (!hasMeaningfulValue(value)) {
      if (sectionPolicy.priority === "required") {
        throw new Error(
          `GENERATION_CONTEXT_REQUIRED_SOURCE_MISSING:${sectionPolicy.section}`,
        );
      }
      continue;
    }

    let estimatedTokens = estimateGenerationContextTokens(value);
    let compactionEvidence: GenerationContextCompactionEvidence | undefined;

    if (estimatedTokens > sectionPolicy.maxTokens) {
      const compactor = compactorRegistry.get(sectionPolicy.section);
      if (compactor) {
        try {
          const compacted = compactor.compact({
            value,
            maxTokens: sectionPolicy.maxTokens,
            estimateTokens: estimateGenerationContextTokens,
          });
          if (compacted && hasMeaningfulValue(compacted.value)) {
            const remeasuredTokens = estimateGenerationContextTokens(
              compacted.value,
            );
            if (remeasuredTokens <= sectionPolicy.maxTokens) {
              compactionEvidence = {
                strategy: compacted.strategy,
                originalTokens: estimatedTokens,
                compactedTokens: remeasuredTokens,
                removedItems: compacted.removedItems,
              };
              value = compacted.value;
              estimatedTokens = remeasuredTokens;
            }
          }
        } catch {
          // Safe fallback below preserves existing required-fail/optional-drop semantics.
        }
      }
    }

    if (estimatedTokens > sectionPolicy.maxTokens) {
      if (sectionPolicy.priority === "required") {
        throw new Error(
          `GENERATION_CONTEXT_REQUIRED_SECTION_BUDGET_EXCEEDED:${sectionPolicy.section}:${estimatedTokens}:${sectionPolicy.maxTokens}`,
        );
      }
      droppedSections.add(sectionPolicy.section);
      continue;
    }

    candidateSections.push({
      section: sectionPolicy.section,
      priority: sectionPolicy.priority,
      maxTokens: sectionPolicy.maxTokens,
      estimatedTokens,
      value,
      provenance: provenanceFromSource(
        contextSource,
        result,
        compactionEvidence,
      ),
    });
  }

  const budgeted = applyTotalTokenBudget(candidateSections, maxContextTokens);
  for (const section of budgeted.droppedSections) {
    droppedSections.add(section);
  }

  const promptContext = promptContextFromSections(budgeted.sections);
  const estimatedTokens = estimateGenerationContextTokens(promptContext);

  if (estimatedTokens > maxContextTokens) {
    throw new Error(
      `GENERATION_CONTEXT_FINAL_BUDGET_EXCEEDED:${estimatedTokens}:${maxContextTokens}`,
    );
  }

  return {
    profile: context.profile,
    maxContextTokens,
    estimatedTokens,
    fingerprint: fingerprintGenerationContext({
      profile: context.profile,
      maxContextTokens,
      sections: budgeted.sections,
    }),
    sections: budgeted.sections,
    droppedSections: policy.sections
      .map((section) => section.section)
      .filter((section) => droppedSections.has(section)),
  };
}

export function toPromptGenerationContext(
  assembled: AssembledGenerationContext,
): Record<string, unknown> {
  const promptContext = promptContextFromSections(assembled.sections);
  const estimatedTokens = estimateGenerationContextTokens(promptContext);

  if (estimatedTokens > assembled.maxContextTokens) {
    throw new Error(
      `GENERATION_CONTEXT_FINAL_BUDGET_EXCEEDED:${estimatedTokens}:${assembled.maxContextTokens}`,
    );
  }

  return promptContext;
}
