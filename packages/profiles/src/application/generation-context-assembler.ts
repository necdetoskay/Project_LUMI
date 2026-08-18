import type { GenerationContext } from "./generation-context.service";
import {
  getGenerationContextPolicy,
  type GenerationContextPriority,
  type GenerationContextSection,
} from "./generation-context-policy";

export interface AssembledGenerationContextSection {
  section: GenerationContextSection;
  priority: GenerationContextPriority;
  maxTokens: number;
  estimatedTokens: number;
  value: unknown;
}

export interface AssembledGenerationContext {
  profile: GenerationContext["profile"];
  maxContextTokens: number;
  estimatedTokens: number;
  sections: readonly AssembledGenerationContextSection[];
  droppedSections: readonly GenerationContextSection[];
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

function resolveSectionValue(
  context: GenerationContext,
  section: GenerationContextSection,
): unknown {
  switch (section) {
    case "child_identity":
      return {
        ageBand: context.child.ageBand,
        ageYears: context.child.ageYears,
        locale: context.child.locale,
      };
    case "child_personalization":
      return {
        interests: context.child.interests,
        customInterests: context.child.customInterests,
        developmentGoals: context.child.developmentGoals,
      };
    case "creation_direction":
      return {
        startDirection: context.creation.startDirection,
      };
    case "creation_selections":
      return context.creation.previousSelections;
    case "character_state":
    case "world_state":
    case "recent_story_state":
    case "relevant_memories":
      return null;
  }
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
  options: { maxContextTokens?: number } = {},
): AssembledGenerationContext {
  const policy = getGenerationContextPolicy(context.profile);
  const maxContextTokens = options.maxContextTokens ?? policy.maxContextTokens;
  const candidateSections: AssembledGenerationContextSection[] = [];
  const sectionBudgetDropped: GenerationContextSection[] = [];

  for (const sectionPolicy of policy.sections) {
    const value = resolveSectionValue(context, sectionPolicy.section);

    if (!hasMeaningfulValue(value)) {
      if (sectionPolicy.priority === "required") {
        throw new Error(
          `GENERATION_CONTEXT_REQUIRED_SOURCE_MISSING:${sectionPolicy.section}`,
        );
      }
      continue;
    }

    const estimatedTokens = estimateGenerationContextTokens(value);
    if (estimatedTokens > sectionPolicy.maxTokens) {
      if (sectionPolicy.priority === "required") {
        throw new Error(
          `GENERATION_CONTEXT_REQUIRED_SECTION_BUDGET_EXCEEDED:${sectionPolicy.section}:${estimatedTokens}:${sectionPolicy.maxTokens}`,
        );
      }
      sectionBudgetDropped.push(sectionPolicy.section);
      continue;
    }

    candidateSections.push({
      section: sectionPolicy.section,
      priority: sectionPolicy.priority,
      maxTokens: sectionPolicy.maxTokens,
      estimatedTokens,
      value,
    });
  }

  const budgeted = applyTotalTokenBudget(candidateSections, maxContextTokens);
  const droppedSections = [
    ...sectionBudgetDropped,
    ...budgeted.droppedSections.filter(
      (section) => !sectionBudgetDropped.includes(section),
    ),
  ];
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
    sections: budgeted.sections,
    droppedSections,
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
