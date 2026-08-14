import { describe, expect, it } from "vitest";

import { CHARACTER_VISUAL_VARIANTS } from "../../src/application/character-visual-generation";
import {
  CHARACTER_VISUAL_SEMANTIC_ROLES,
  SEMANTIC_ROLE_BY_VARIANT,
  assertCharacterVisualVariant,
  resolveSemanticRole,
  resolveVariantForRole,
} from "../../src/application/character-visual-derivative-resolver";

describe("character visual derivative resolver", () => {
  it("maps every variant to a semantic role", () => {
    for (const variant of CHARACTER_VISUAL_VARIANTS) {
      const role = resolveSemanticRole(variant);
      expect(role).toBe(SEMANTIC_ROLE_BY_VARIANT[variant]);
      expect(CHARACTER_VISUAL_SEMANTIC_ROLES).toContain(role);
    }
  });

  it("maps portrait_primary to head-front and full_body_front to body-front", () => {
    expect(resolveVariantForRole("portrait_primary")).toBe("head-front");
    expect(resolveVariantForRole("full_body_front")).toBe("body-front");
  });

  it("round-trips variant -> role -> variant", () => {
    for (const variant of CHARACTER_VISUAL_VARIANTS) {
      const role = resolveSemanticRole(variant);
      expect(resolveVariantForRole(role)).toBe(variant);
    }
  });

  it("exposes the expected semantic role vocabulary", () => {
    expect(CHARACTER_VISUAL_SEMANTIC_ROLES).toEqual(
      expect.arrayContaining([
        "full_body_front",
        "full_body_side",
        "full_body_back",
        "portrait_primary",
        "portrait_side",
      ]),
    );
  });

  it("throws on unknown semantic role lookup", () => {
    expect(() => resolveVariantForRole("unknown_role" as never)).toThrow(
      "VISUAL_SEMANTIC_ROLE_UNKNOWN",
    );
  });

  it("accepts known variants and rejects unknown ones", () => {
    expect(assertCharacterVisualVariant("head-front")).toBe("head-front");
    expect(() => assertCharacterVisualVariant("nope")).toThrow(
      "VISUAL_VARIANT_UNKNOWN",
    );
  });
});
