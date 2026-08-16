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
        id: context.child.id,
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
        cycleId: context.creation.cycleId,
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
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) => {
      if (entry == null) return false;
      if (Array.isArray(entry)) return entry.length > 0;
      if (typeof entry === "string") return entry.length > 0;
      if (typeof entry === "object") return Object.keys(entry).length > 0;
      return true;
    });
  }
  return true;
}

function applyTokenBudget(
  sections: readonly AssembledGenerationContextSection[],
  maxContextTokens: number,
): {
  sections: AssembledGenerationContextSection[];
  droppedSections: GenerationContextSection[];
} {
  const requiredTokens = sections
    .filter((section) => section.priority === "required")
    .reduce((total, section) => total + section.estimatedTokens, 0);

  if (requiredTokens > maxContextTokens) {
    throw new Error(
      `GENERATION_CONTEXT_REQUIRED_BUDGET_EXCEEDED:${requiredTokens}:${maxContextTokens}`,
    );
  }

  const ranked = sections
    .map((section, index) => ({ section, index }))
    .sort(
      (left, right) =>
        PRIORITY_WEIGHT[left.section.priority] -
          PRIORITY_WEIGHT[right.section.priority] || left.index - right.index,
    );

  let usedTokens = 0;
  const included = new Set<GenerationContextSection>();
  const dropped = new Set<GenerationContextSection>();

  for (const { section } of ranked) {
    if (usedTokens + section.estimatedTokens <= maxContextTokens) {
      included.add(section.section);
      usedTokens += section.estimatedTokens;
    } else if (section.priority !== "required") {
      dropped.add(section.section);
    }
  }

  return {
    sections: sections.filter((section) => included.has(section.section)),
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
  const candidateSections = policy.sections.flatMap((sectionPolicy) => {
    const value = resolveSectionValue(context, sectionPolicy.section);
    if (!hasMeaningfulValue(value) && sectionPolicy.priority !== "required") {
      return [];
    }

    return [
      {
        section: sectionPolicy.section,
        priority: sectionPolicy.priority,
        maxTokens: sectionPolicy.maxTokens,
        estimatedTokens: Math.min(
          sectionPolicy.maxTokens,
          estimateGenerationContextTokens(value),
        ),
        value,
      } satisfies AssembledGenerationContextSection,
    ];
  });
  const budgeted = applyTokenBudget(candidateSections, maxContextTokens);

  return {
    profile: context.profile,
    maxContextTokens,
    estimatedTokens: budgeted.sections.reduce(
      (total, section) => total + section.estimatedTokens,
      0,
    ),
    sections: budgeted.sections,
    droppedSections: budgeted.droppedSections,
  };
}

export function toPromptGenerationContext(
  assembled: AssembledGenerationContext,
): Record<string, unknown> {
  return Object.fromEntries(
    assembled.sections.map((section) => [section.section, section.value]),
  );
}
