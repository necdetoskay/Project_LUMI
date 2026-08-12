import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const routePath = path.resolve(
  __dirname,
  "../app/api/assets/items/batch/route.ts",
);

const routeSource = readFileSync(routePath, "utf8");

describe("item generation visual style wiring", () => {
  it("routes web item generation through the shared compiler and records state/style provenance", () => {
    expect(routeSource).toContain("compileVisualPrompt");
    expect(routeSource).toContain('assetType: "item"');
    expect(routeSource).toContain('sourceSystem: "item-state-grid-v1"');
    expect(routeSource).toContain("styleId: compiled.styleId");
    expect(routeSource).toContain("styleVersion: compiled.styleVersion");
    expect(routeSource).toContain("stateId: state.id");
    expect(routeSource).toContain("outputMaxPx: 300");
    expect(routeSource).not.toContain("LUMI_ASSET_STYLE_DIRECTION");
  });
});
