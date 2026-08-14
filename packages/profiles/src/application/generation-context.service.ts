import { findChildProfileForUser } from "./child-profile.service";
import { getChildPersonalization } from "./child-profile-personalization.service";
import { getActiveCharacterCreationCycle } from "./character-creation-cycle.service";

export type GenerationContextProfile =
  | "character_onboarding"
  | "story_generation"
  | "world_generation";

export interface GenerationChildContext {
  id: string;
  ageBand: string;
  locale: string;
  interests: string[];
  customInterests: string[];
  developmentGoals: string[];
}

export interface GenerationCreationContext {
  cycleId: string | null;
  startDirection: string | null;
  previousSelections: Record<string, unknown>;
}

export interface GenerationContext {
  profile: GenerationContextProfile;
  child: GenerationChildContext;
  creation: GenerationCreationContext;
}

export interface BuildGenerationContextInput {
  householdId: string;
  childProfileId: string;
  profile: GenerationContextProfile;
}

export async function buildGenerationContext(
  userId: string,
  input: BuildGenerationContextInput,
): Promise<GenerationContext> {
  const [child, personalization, cycle] = await Promise.all([
    findChildProfileForUser(userId, input.childProfileId, input.householdId),
    getChildPersonalization(userId, input.childProfileId, input.householdId),
    getActiveCharacterCreationCycle(
      userId,
      input.householdId,
      input.childProfileId,
    ),
  ]);

  if (!child) throw new Error("Child profile not found");

  return {
    profile: input.profile,
    child: {
      id: child.id,
      ageBand: child.ageBand,
      locale: child.locale,
      interests: personalization.interests,
      customInterests: personalization.customInterests,
      developmentGoals: personalization.developmentGoals,
    },
    creation: {
      cycleId: cycle?.id ?? null,
      startDirection: cycle?.startDirection ?? null,
      previousSelections: (cycle?.latestSummary ?? {}) as Record<
        string,
        unknown
      >,
    },
  };
}
