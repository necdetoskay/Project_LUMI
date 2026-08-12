import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "..");

async function read(relativePath: string) {
  return readFile(path.join(webRoot, relativePath), "utf8");
}

describe("asset generation serverless runtime", () => {
  it("keeps production image generation free of native Sharp/libvips", async () => {
    const [characterRoute, bagRoute, itemRoute, packageJson, nextConfig] =
      await Promise.all([
        read("app/api/assets/characters/[characterId]/route.ts"),
        read("app/api/assets/bags/route.ts"),
        read("app/api/assets/items/batch/route.ts"),
        read("package.json"),
        read("next.config.ts"),
      ]);

    for (const source of [characterRoute, bagRoute, itemRoute]) {
      expect(source).not.toMatch(/(?:from|import\()\s*["']sharp["']/);
    }
    expect(characterRoute).toContain(
      "PureJsCharacterReferenceSheetDerivativeAdapter",
    );
    expect(packageJson).not.toMatch(/["']sharp["']\s*:/);
    expect(nextConfig).not.toContain("sharp-libvips");
    expect(nextConfig).not.toContain("sharp-linux");
  });

  it("keeps bag generation direct while item generation uses the state-grid pipeline", async () => {
    const [bagRoute, itemRoute] = await Promise.all([
      read("app/api/assets/bags/route.ts"),
      read("app/api/assets/items/batch/route.ts"),
    ]);

    expect(bagRoute).toContain('sourceSystem: "bag-direct-v1"');
    expect(itemRoute).toContain('sourceSystem: "item-state-grid-v1"');
    expect(itemRoute).toContain("planItemStateGrid(states, 4)");
    expect(itemRoute).toContain("splitItemStateGrid");
    expect(bagRoute).not.toContain(".extract(");
  });

  it("routes item prompts through the shared LUMI visual style compiler", async () => {
    const [bagRoute, itemRoute] = await Promise.all([
      read("app/api/assets/bags/route.ts"),
      read("app/api/assets/items/batch/route.ts"),
    ]);

    expect(bagRoute).toContain(
      "Match the already generated LUMI character canon",
    );
    expect(itemRoute).toContain("compileVisualPrompt");
    expect(itemRoute).toContain('assetType: "item"');
    expect(itemRoute).toContain("styleId: compiled.styleId");
    expect(itemRoute).toContain("styleVersion: compiled.styleVersion");
    expect(itemRoute).not.toContain("LUMI_ASSET_STYLE_DIRECTION");
  });
});
