import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve(
  process.cwd(),
  "app/app/character-onboarding/character-onboarding-client-page.tsx",
);
const visualContractPath = path.resolve(
  process.cwd(),
  "../../docs/07-delivery/lumi/sprint-42/VISUAL_CANON_CONTRACT.md",
);

test.describe("S42 character creation contract", () => {
  test("source is story-first and preserves production endpoints", async () => {
    const source = await readFile(sourcePath, "utf8");

    expect(source).toContain("Karakterinle tanış");
    expect(source).toContain("Geçmişinden bir sayfa");
    expect(source).toContain("Son dokunuşlar");
    expect(source).toContain("üretilmiş karakter resmi değildir");

    for (const endpoint of [
      "/api/character-bootstrap/status",
      "/api/character-bootstrap/generate-archetypes",
      "/api/character-bootstrap/handoff",
      "/api/character-bootstrap/generate-packages",
      "/api/character-bootstrap/consume",
    ]) {
      expect(source).toContain(endpoint);
    }

    for (const forbidden of [
      "Dashboard",
      "AI önerileri",
      "Karakter Başlangıç Akışı",
      "OpenRouter",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  test("visual canon contract is explicit and truthful", async () => {
    const contract = await readFile(visualContractPath, "utf8");
    expect(contract).toContain("four distinct candidates");
    expect(contract).toContain("explicit selection");
    expect(contract).toContain("must not render decorative placeholders");
    expect(contract).toContain("CHARACTER-VISUAL-TENANT-001");
    expect(contract).toContain("CHARACTER-VISUAL-IDEMPOTENCY-001");
  });

  test("unauthenticated onboarding remains protected", async ({ page }) => {
    await page.goto("/app/character-onboarding?childProfileId=test-profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("bootstrap endpoints remain authorization protected", async ({ request }) => {
    const statusResponse = await request.get(
      "/api/character-bootstrap/status?householdId=test&childProfileId=test",
    );
    expect([400, 401, 403]).toContain(statusResponse.status());

    for (const endpoint of [
      "/api/character-bootstrap/generate-archetypes",
      "/api/character-bootstrap/handoff",
      "/api/character-bootstrap/generate-packages",
      "/api/character-bootstrap/consume",
    ]) {
      const response = await request.post(endpoint, { data: {} });
      expect([400, 401, 403]).toContain(response.status());
    }
  });
});
