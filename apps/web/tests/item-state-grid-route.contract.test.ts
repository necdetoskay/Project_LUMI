import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const routePath = path.resolve(
  __dirname,
  "../app/api/assets/items/batch/route.ts",
);

describe("item state grid route contract", () => {
  it("splits generated state grids and persists state provenance", async () => {
    const source = await readFile(routePath, "utf8");
    expect(source).toContain("planItemStateGrid(states, 4)");
    expect(source).toContain("splitItemStateGrid");
    expect(source).toContain("maxOutputSize: 300");
    expect(source).toContain("stateId: state.id");
    expect(source).toContain('sourceSystem: "item-state-grid-v1"');
    expect(source).toContain("gridStateIds: compiled.stateIds");
    expect(source).toContain("selectManagedAssetCanon");
  });
});
