import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const assetsRoutePath = path.resolve(__dirname, "../app/app/assets");
const pagePath = path.join(assetsRoutePath, "page.tsx");
const characterManagerPath = path.resolve(
  __dirname,
  "../app/app/assets/characters/[characterId]/character-visual-manager.tsx",
);
const characterAssetRoutePath = path.resolve(
  __dirname,
  "../app/api/assets/characters/[characterId]/route.ts",
);

describe("Visual Library canonical route contract", () => {
  it("uses one unversioned visual library implementation", () => {
    const routeFiles = fs.readdirSync(assetsRoutePath);
    const pageSource = fs.readFileSync(pagePath, "utf8");

    expect(routeFiles).toContain("visual-library.tsx");
    expect(routeFiles).not.toContain("visual-library-v2.tsx");
    expect(routeFiles).not.toContain("visual-library-v3.tsx");
    expect(routeFiles).not.toContain("assets-client-page.tsx");
    expect(pageSource).toContain('from "./visual-library"');
    expect(pageSource).not.toMatch(/visual-library-v\d+/);
  });

  it("keeps character visual generation behind preview approval", () => {
    const managerSource = fs.readFileSync(characterManagerPath, "utf8");
    const routeSource = fs.readFileSync(characterAssetRoutePath, "utf8");

    expect(managerSource).not.toContain("window.confirm");
    expect(managerSource).toContain("setPendingDelete");
    expect(managerSource).toContain("commitPreview");
    expect(managerSource).toContain("Yeniden oluştur");
    expect(routeSource).toContain('action: z.literal("generate")');
    expect(routeSource).toContain('action: z.literal("commit")');
    expect(routeSource).toContain("previewCharacterVisualCandidates");
    expect(routeSource).toContain("commitCharacterVisualPreview");
    expect(managerSource).toContain("styleInfoOpen");
    expect(managerSource).toContain("selectedBagItemIds");
    expect(managerSource).toContain("setGenerationOpen(true)");
    expect(routeSource).toContain("listInventory");
    expect(routeSource).toContain("bagItemIds");
    expect(managerSource).toContain("expression-sheet");
    expect(managerSource).toContain("Duygu ifadeleri");
    expect(routeSource).toContain("emotionKeys");
  });
});
