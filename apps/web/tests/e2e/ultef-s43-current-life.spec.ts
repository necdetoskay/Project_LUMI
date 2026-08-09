import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve(
  process.cwd(),
  "components/character/profile-character-detail-section.tsx",
);

test.describe("S43 current-life child navigation contract", () => {
  test("source projects canonical current life without technical or game leakage", async () => {
    const source = await readFile(sourcePath, "utf8");

    expect(source).toContain("Şimdi");
    expect(source).toContain("world?.currentLocation?.displayName");
    expect(source).toContain("Şu anki konum henüz kaydedilmemiş");
    expect(source).toContain("Yeni bir konum uydurulmadı");
    expect(source).toContain("Hikâyeler");
    expect(source).toContain("Dünyam");
    expect(source).toContain("Yanında");

    for (const endpoint of [
      "/api/onboarding",
      "/api/characters/",
      "/api/inventory/list",
      "/world?householdId=",
    ]) {
      expect(source).toContain(endpoint);
    }

    for (const forbidden of [
      "Dashboard",
      "originMode",
      "characterType",
      "rarity",
      "XP",
      "Quest",
      "quest",
      "Level",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  test("character current-life route remains auth protected", async ({
    page,
  }) => {
    await page.goto("/app/profiles/test-profile/characters/test-character");
    await expect(page).toHaveURL(/\/login/);
  });

  test("current-life surface is read-only", async () => {
    const source = await readFile(sourcePath, "utf8");

    expect(source).not.toContain('method: "POST"');
    expect(source).not.toContain('method: "PUT"');
    expect(source).not.toContain('method: "PATCH"');
    expect(source).not.toContain('method: "DELETE"');
    expect(source).toContain("Bir geçmiş hikâyeyi açmak yalnızca okumadır");
  });

  test("canonical data endpoints reject unauthenticated access", async ({
    request,
  }) => {
    const characterResponse = await request.get(
      "/api/characters/test-character?householdId=test-household",
    );
    expect([400, 401, 403, 404]).toContain(characterResponse.status());

    const inventoryResponse = await request.get(
      "/api/inventory/list?householdId=test-household&ownerType=character&ownerId=test-character",
    );
    expect([400, 401, 403, 404]).toContain(inventoryResponse.status());

    const worldResponse = await request.get(
      "/api/child-profiles/test-profile/world?householdId=test-household&characterId=test-character",
    );
    expect([400, 401, 403, 404]).toContain(worldResponse.status());
  });
});
