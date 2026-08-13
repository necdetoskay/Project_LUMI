import { describe, expect, it } from "vitest";

import {
  CHARACTER_VISUAL_PRESENTATION_ROLES,
  getCharacterVisualVariantForRole,
} from "./character-visual-presentation";

describe("character visual presentation roles", () => {
  it("maps the compact portrait role to the front half-body derivative", () => {
    expect(getCharacterVisualVariantForRole("portrait_primary")).toBe(
      "head-front",
    );
  });

  it("maps the detail identity role to the front full-body derivative", () => {
    expect(getCharacterVisualVariantForRole("full_body_front")).toBe(
      "body-front",
    );
  });

  it("keeps the presentation role contract explicit and stable", () => {
    expect(CHARACTER_VISUAL_PRESENTATION_ROLES).toEqual({
      portrait_primary: "head-front",
      full_body_front: "body-front",
    });
  });
});
