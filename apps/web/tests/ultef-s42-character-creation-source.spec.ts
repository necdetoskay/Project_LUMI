import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const uiSourcePath = path.resolve(
  process.cwd(),
  "app/app/character-onboarding/character-onboarding-client-page.tsx",
);
const visualContractPath = path.resolve(
  process.cwd(),
  "../../docs/07-delivery/lumi/sprint-42/VISUAL_CANON_CONTRACT.md",
);

const forbiddenTechnicalCopy = [
  "Dashboard",
  "AI önerileri",
  "Karakter Başlangıç Akışı",
  "OpenRouter",
  "modelId",
  "generationSource",
  "bootstrap",
];

test.describe("S42 character creation source contract", () => {
  test("character creation source is story-first and hides implementation language", async () => {
    const source = await readFile(uiSourcePath, "utf8");

    expect(source).toContain("Karakterinle tanış");
    expect(source).toContain("Geçmişinden bir sayfa");
    expect(source).toContain("Son dokunuşlar");
    expect(source).toContain("Dört görünümden birini seçme adımı hazırlanıyor");
    expect(source).toContain("üretilmiş karakter resmi değildir");

    for (const phrase of forbiddenTechnicalCopy) {
      expect(source).not.toContain(phrase);
    }
  });

  test("existing production endpoints remain referenced", async () => {
    const source = await readFile(uiSourcePath, "utf8");

    for (const endpoint of [
      "/api/character-bootstrap/status",
      "/api/character-bootstrap/generate-archetypes",
      "/api/character-bootstrap/handoff",
      "/api/character-bootstrap/generate-packages",
      "/api/character-bootstrap/consume",
    ]) {
      expect(source).toContain(endpoint);
    }
  });

  test("visual canon contract requires truthful four-candidate selection semantics", async () => {
    const contract = await readFile(visualContractPath, "utf8");

    expect(contract).toContain("four distinct candidate");
    expect(contract).toContain("explicit selection");
    expect(contract).toContain("must not render decorative placeholders");
    expect(contract).toContain("CHARACTER-VISUAL-TENANT-001");
    expect(contract).toContain("CHARACTER-VISUAL-IDEMPOTENCY-001");
  });
});
