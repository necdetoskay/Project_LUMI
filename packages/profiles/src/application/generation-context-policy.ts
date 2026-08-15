import type { GenerationContextProfile } from "./generation-context.service";

export type GenerationContextSection =
  | "child_identity"
  | "child_personalization"
  | "creation_direction"
  | "creation_selections"
  | "character_state"
  | "world_state"
  | "recent_story_state"
  | "relevant_memories";

export type GenerationContextPriority = "required" | "high" | "medium" | "low";

export interface GenerationContextSectionPolicy {
  section: GenerationContextSection;
  priority: GenerationContextPriority;
  maxTokens: number;
}

export interface GenerationContextPolicy {
  profile: GenerationContextProfile;
  maxContextTokens: number;
  sections: readonly GenerationContextSectionPolicy[];
}

const POLICIES: Record<GenerationContextProfile, GenerationContextPolicy> = {
  character_onboarding: {
    profile: "character_onboarding",
    maxContextTokens: 1800,
    sections: [
      { section: "child_identity", priority: "required", maxTokens: 180 },
      {
        section: "child_personalization",
        priority: "required",
        maxTokens: 420,
      },
      { section: "creation_direction", priority: "required", maxTokens: 180 },
      { section: "creation_selections", priority: "high", maxTokens: 720 },
    ],
  },
  world_generation: {
    profile: "world_generation",
    maxContextTokens: 3200,
    sections: [
      { section: "child_identity", priority: "required", maxTokens: 180 },
      {
        section: "child_personalization",
        priority: "required",
        maxTokens: 420,
      },
      { section: "creation_direction", priority: "high", maxTokens: 180 },
      { section: "creation_selections", priority: "high", maxTokens: 620 },
      { section: "character_state", priority: "medium", maxTokens: 600 },
      { section: "world_state", priority: "required", maxTokens: 1000 },
    ],
  },
  story_generation: {
    profile: "story_generation",
    maxContextTokens: 5200,
    sections: [
      { section: "child_identity", priority: "required", maxTokens: 180 },
      {
        section: "child_personalization",
        priority: "required",
        maxTokens: 420,
      },
      { section: "character_state", priority: "required", maxTokens: 900 },
      { section: "world_state", priority: "high", maxTokens: 1000 },
      { section: "recent_story_state", priority: "high", maxTokens: 1200 },
      { section: "relevant_memories", priority: "medium", maxTokens: 1200 },
    ],
  },
};

export function getGenerationContextPolicy(
  profile: GenerationContextProfile,
): GenerationContextPolicy {
  return POLICIES[profile];
}

export function getGenerationContextSectionPolicy(
  profile: GenerationContextProfile,
  section: GenerationContextSection,
): GenerationContextSectionPolicy | null {
  return (
    POLICIES[profile].sections.find((entry) => entry.section === section) ?? null
  );
}

export function assertGenerationContextPolicy(
  policy: GenerationContextPolicy,
): void {
  if (!Number.isInteger(policy.maxContextTokens) || policy.maxContextTokens <= 0) {
    throw new Error(
      "Generation context maxContextTokens must be a positive integer",
    );
  }

  const seen = new Set<GenerationContextSection>();
  let allocatedTokens = 0;

  for (const section of policy.sections) {
    if (seen.has(section.section)) {
      throw new Error(`Duplicate generation context section: ${section.section}`);
    }
    seen.add(section.section);

    if (!Number.isInteger(section.maxTokens) || section.maxTokens <= 0) {
      throw new Error(
        `Invalid token budget for generation context section: ${section.section}`,
      );
    }
    allocatedTokens += section.maxTokens;
  }

  if (allocatedTokens > policy.maxContextTokens) {
    throw new Error(
      `Generation context section budgets (${allocatedTokens}) exceed profile budget (${policy.maxContextTokens})`,
    );
  }
}

for (const policy of Object.values(POLICIES)) {
  assertGenerationContextPolicy(policy);
}
