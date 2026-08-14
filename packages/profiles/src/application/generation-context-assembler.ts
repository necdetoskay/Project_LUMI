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
  value: unknown;
}

export interface AssembledGenerationContext {
  profile: GenerationContext["profile"];
  maxContextTokens: number;
  sections: readonly AssembledGenerationContextSection[];
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

export function assembleGenerationContext(
  context: GenerationContext,
): AssembledGenerationContext {
  const policy = getGenerationContextPolicy(context.profile);
  const sections = policy.sections.flatMap((sectionPolicy) => {
    const value = resolveSectionValue(context, sectionPolicy.section);
    if (
      !hasMeaningfulValue(value) &&
      sectionPolicy.priority !== "required"
    ) {
      return [];
    }

    return [
      {
        section: sectionPolicy.section,
        priority: sectionPolicy.priority,
        maxTokens: sectionPolicy.maxTokens,
        value,
      } satisfies AssembledGenerationContextSection,
    ];
  });

  return {
    profile: context.profile,
    maxContextTokens: policy.maxContextTokens,
    sections,
  };
}

export function toPromptGenerationContext(
  assembled: AssembledGenerationContext,
): Record<string, unknown> {
  return Object.fromEntries(
    assembled.sections.map((section) => [section.section, section.value]),
  );
}
