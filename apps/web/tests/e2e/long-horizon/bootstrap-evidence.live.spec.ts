import { expect, test } from "@playwright/test";

const CHILD_PROFILE_ID = "c61ddfa0-c149-45a5-98af-71472d0e0ac5";
const CHARACTER_ID = "04b06a36-9f72-4b95-a18a-6de3aa077423";
const EXPECTED_WORLD_ID = "a2370bc0-f704-4e8e-b82b-636a1a9efcfb";
const EXPECTED_BOOTSTRAP_RUN_ID =
  "living-world-bootstrap:adee5d1e-e5ce-41f6-be20-b6240cfd770d";
const REAL_SOURCE_FAMILIES = new Set([
  "npc_call",
  "world_event",
  "rumor",
  "inventory_item",
]);

test("age-6 production bootstrap is materialized before real adventure candidates are read", async ({
  page,
}) => {
  const email = process.env.LUMI_LONG_HORIZON_PARENT_EMAIL;
  const password = process.env.LUMI_LONG_HORIZON_PARENT_PASSWORD;
  if (!email || !password) throw new Error("Missing live parent credentials");

  const login = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(login.ok(), `production login failed: ${login.status()}`).toBe(true);

  const onboardingResponse = await page.request.get("/api/onboarding");
  expect(onboardingResponse.ok()).toBe(true);
  const onboarding = (await onboardingResponse.json()) as {
    onboarding?: { householdId?: string };
  };
  const householdId = onboarding.onboarding?.householdId;
  expect(householdId, "production householdId is required").toBeTruthy();

  const bootstrapResponse = await page.request.get(
    `/api/characters/${CHARACTER_ID}?householdId=${householdId}&bootstrap=true`,
  );
  expect(bootstrapResponse.ok()).toBe(true);
  const bootstrapBody = (await bootstrapResponse.json()) as {
    bootstrap?: {
      status?: string;
      idempotencyKey?: string;
      worldId?: string;
      materializedCount?: number;
      materializedByKind?: Record<string, number>;
    } | null;
  };
  const bootstrap = bootstrapBody.bootstrap;
  expect(bootstrap, "Living World bootstrap manifest is required").toBeTruthy();
  expect(bootstrap?.status).toBe("completed");
  expect(bootstrap?.idempotencyKey).toBe(EXPECTED_BOOTSTRAP_RUN_ID);
  expect(bootstrap?.worldId).toBe(EXPECTED_WORLD_ID);
  expect(bootstrap?.materializedCount ?? 0).toBeGreaterThan(0);
  expect(bootstrap?.materializedByKind?.npc ?? 0).toBeGreaterThan(0);
  expect(bootstrap?.materializedByKind?.relationship ?? 0).toBeGreaterThan(0);

  const charactersResponse = await page.request.get(
    `/api/characters?householdId=${householdId}&childProfileId=${CHILD_PROFILE_ID}`,
  );
  expect(charactersResponse.ok()).toBe(true);
  const charactersBody = (await charactersResponse.json()) as {
    characters?: Array<{ id?: string; characterSubtype?: string }>;
  };
  const npcs = (charactersBody.characters ?? []).filter(
    (character) => character.characterSubtype === "npc",
  );
  expect(npcs.length, "at least one active NPC must be visible").toBeGreaterThan(0);

  const domainResponse = await page.request.get(
    `/api/characters/${CHARACTER_ID}?householdId=${householdId}&domain=true`,
  );
  expect(domainResponse.ok()).toBe(true);
  const domainBody = (await domainResponse.json()) as {
    character?: {
      relationships?: Array<{
        targetCharacterId?: string;
        customTypeLabel?: string;
      }>;
    };
  };
  const npcIds = new Set(npcs.map((npc) => npc.id).filter(Boolean));
  const bootstrapRelationships = (domainBody.character?.relationships ?? []).filter(
    (relationship) =>
      Boolean(relationship.targetCharacterId) &&
      npcIds.has(relationship.targetCharacterId) &&
      relationship.customTypeLabel?.startsWith("living-world-bootstrap:v1:"),
  );
  expect(
    bootstrapRelationships.length,
    "at least one Living World relationship to a materialized NPC is required",
  ).toBeGreaterThan(0);

  console.log(`LUMI_250_B_MANIFEST_STATUS=${bootstrap?.status}`);
  console.log(`LUMI_250_B_MATERIALIZED_COUNT=${bootstrap?.materializedCount}`);
  console.log(`LUMI_250_B_NPC_REFS=${bootstrap?.materializedByKind?.npc ?? 0}`);
  console.log(
    `LUMI_250_B_RELATIONSHIP_REFS=${bootstrap?.materializedByKind?.relationship ?? 0}`,
  );
  console.log(`LUMI_250_B_NPC_ROWS=${npcs.length}`);
  console.log(`LUMI_250_B_RELATIONSHIP_ROWS=${bootstrapRelationships.length}`);

  // C is intentionally evaluated only after every B assertion above has passed.
  const candidatesResponse = await page.request.get(
    `/api/child-profiles/${CHILD_PROFILE_ID}/stories/adventure-candidates?householdId=${householdId}`,
  );
  expect(candidatesResponse.ok()).toBe(true);
  const candidatesBody = (await candidatesResponse.json()) as {
    candidates?: Array<{ sourceFamily?: string }>;
  };
  const candidates = candidatesBody.candidates ?? [];
  const realCandidates = candidates.filter((candidate) =>
    candidate.sourceFamily ? REAL_SOURCE_FAMILIES.has(candidate.sourceFamily) : false,
  );
  expect(candidates.length, "New Adventure must expose candidates").toBeGreaterThan(0);
  expect(
    realCandidates.length,
    "New Adventure must include at least one real NPC/world/opportunity source",
  ).toBeGreaterThan(0);

  const sourceFamilies = [...new Set(candidates.map((candidate) => candidate.sourceFamily).filter(Boolean))];
  console.log(`LUMI_250_C_CANDIDATE_COUNT=${candidates.length}`);
  console.log(`LUMI_250_C_REAL_SOURCE_COUNT=${realCandidates.length}`);
  console.log(`LUMI_250_C_SOURCE_FAMILIES=${sourceFamilies.join(",")}`);
});
