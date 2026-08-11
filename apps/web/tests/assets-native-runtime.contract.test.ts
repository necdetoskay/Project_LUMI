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

  it("generates item and bag assets directly instead of cropping sheets", async () => {
    const [bagRoute, itemRoute] = await Promise.all([
      read("app/api/assets/bags/route.ts"),
      read("app/api/assets/items/batch/route.ts"),
    ]);

    expect(bagRoute).toContain('sourceSystem: "bag-direct-v1"');
    expect(itemRoute).toContain('sourceSystem: "item-direct-v1"');
    expect(bagRoute).not.toContain(".extract(");
    expect(itemRoute).not.toContain(".extract(");
  });
});
