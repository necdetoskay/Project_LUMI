import {
  CHARACTER_VISUAL_VARIANTS,
  type CharacterVisualVariant,
} from "./character-visual-generation";

export type CharacterVisualSemanticRole =
  | "full_body_front"
  | "full_body_three_quarter"
  | "full_body_side"
  | "full_body_back"
  | "portrait_primary"
  | "portrait_three_quarter"
  | "portrait_side";

export const SEMANTIC_ROLE_BY_VARIANT: Record<
  CharacterVisualVariant,
  CharacterVisualSemanticRole
> = {
  "body-front": "full_body_front",
  "body-three-quarter": "full_body_three_quarter",
  "body-side": "full_body_side",
  "body-back": "full_body_back",
  "head-front": "portrait_primary",
  "head-three-quarter": "portrait_three_quarter",
  "head-side": "portrait_side",
};

export const CHARACTER_VISUAL_SEMANTIC_ROLES: readonly CharacterVisualSemanticRole[] =
  Object.values(SEMANTIC_ROLE_BY_VARIANT);

export function resolveSemanticRole(
  variant: CharacterVisualVariant,
): CharacterVisualSemanticRole {
  return SEMANTIC_ROLE_BY_VARIANT[variant];
}

export function resolveVariantForRole(
  role: CharacterVisualSemanticRole,
): CharacterVisualVariant {
  const entry = Object.entries(SEMANTIC_ROLE_BY_VARIANT).find(
    ([, candidate]) => candidate === role,
  ) as [CharacterVisualVariant, CharacterVisualSemanticRole] | undefined;
  if (!entry) throw new Error(`VISUAL_SEMANTIC_ROLE_UNKNOWN:${role}`);
  return entry[0];
}

export function assertCharacterVisualVariant(
  value: string,
): CharacterVisualVariant {
  if ((CHARACTER_VISUAL_VARIANTS as readonly string[]).includes(value)) {
    return value as CharacterVisualVariant;
  }
  throw new Error(`VISUAL_VARIANT_UNKNOWN:${value}`);
}
