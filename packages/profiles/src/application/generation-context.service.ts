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
  ageYears: number | null;
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

export interface GenerationCreationOverride {
  cycleId?: string | null;
  startDirection?: string | null;
  previousSelections?: Record<string, unknown>;
}

export async function buildGenerationContext(
  userId: string,
  input: BuildGenerationContextInput,
  creationOverride?: GenerationCreationOverride,
): Promise<GenerationContext> {
  const [child, personalization, cycle] = await Promise.all([
    findChildProfileForUser(input.childProfileId, userId, input.householdId),
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
      ageYears: child.ageYears,
      locale: child.locale,
      interests: personalization.interests,
      customInterests: personalization.customInterests,
      developmentGoals: personalization.developmentGoals,
    },
    creation: {
      cycleId:
        creationOverride && "cycleId" in creationOverride
          ? (creationOverride.cycleId ?? null)
          : (cycle?.id ?? null),
      startDirection:
        creationOverride && "startDirection" in creationOverride
          ? (creationOverride.startDirection ?? null)
          : (cycle?.startDirection ?? null),
      previousSelections:
        creationOverride?.previousSelections ??
        ((cycle?.latestSummary ?? {}) as Record<string, unknown>),
    },
  };
}
