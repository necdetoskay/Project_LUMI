import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { compileVisualPrompt, getItemVisualStates } from "@lumi/media";

const routePath = fileURLToPath(
  new URL("../app/api/assets/items/batch/route.ts", import.meta.url),
);

const routeSource = readFileSync(routePath, "utf8");

describe("item generation visual style wiring", () => {
  it("compiles an item-only prompt with global text and character prohibitions", () => {
    const compiled = compileVisualPrompt({
      assetType: "item",
      styleId: "lumi-storybook",
      identity: ["OBJECT NAME: Parlayan Pusula", "OBJECT CATEGORY: compass"],
    });

    expect(compiled.prompt).toContain("SUBJECT TYPE: ITEM / OBJECT");
    expect(compiled.prompt).toContain(
      "Do not generate people, children, characters",
    );
    expect(compiled.prompt).toContain("no text");
    expect(compiled.styleId).toBe("lumi-storybook");
  });

  it("keeps semantic compass states ready for the grid/crop migration", () => {
    expect(getItemVisualStates("compass").map((state) => state.id)).toEqual([
      "closed",
      "open",
    ]);
  });

  it("routes web item generation through the shared compiler and records style provenance", () => {
    expect(routeSource).toContain("compileVisualPrompt");
    expect(routeSource).toContain('sourceSystem: "item-visual-style-v1"');
    expect(routeSource).toContain("styleId: compiled.styleId");
    expect(routeSource).toContain("styleVersion: compiled.styleVersion");
    expect(routeSource).not.toContain("LUMI_ASSET_STYLE_DIRECTION");
  });
});
