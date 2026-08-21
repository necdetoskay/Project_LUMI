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
  const manifestNpcCount = bootstrap?.materializedByKind?.npc ?? 0;
  const manifestRelationshipCount = bootstrap?.materializedByKind?.relationship ?? 0;
  expect(manifestNpcCount).toBeGreaterThan(0);
  expect(manifestRelationshipCount).toBeGreaterThan(0);

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
  const bootstrapRelationships = (
    domainBody.character?.relationships ?? []
  ).filter((relationship) =>
    Boolean(
      relationship.targetCharacterId &&
        relationship.customTypeLabel?.startsWith("living-world-bootstrap:v1:"),
    ),
  );
  expect(
    bootstrapRelationships.length,
    "at least one persisted Living World bootstrap relationship is required",
  ).toBeGreaterThan(0);
  expect(bootstrapRelationships.length).toBeGreaterThanOrEqual(
    manifestRelationshipCount,
  );

  const npcTargetIds = [
    ...new Set(
      bootstrapRelationships.flatMap((relationship) =>
        relationship.targetCharacterId ? [relationship.targetCharacterId] : [],
      ),
    ),
  ];
  expect(
    npcTargetIds.length,
    "bootstrap relationships must point to persisted NPC character rows",
  ).toBeGreaterThanOrEqual(manifestNpcCount);

  for (const npcId of npcTargetIds) {
    const npcResponse = await page.request.get(
      `/api/characters/${npcId}?householdId=${householdId}`,
    );
    expect(
      npcResponse.ok(),
      `bootstrap NPC target ${npcId} must resolve as an active character row`,
    ).toBe(true);
  }

  console.log(`LUMI_250_B_MANIFEST_STATUS=${bootstrap?.status}`);
  console.log(`LUMI_250_B_MATERIALIZED_COUNT=${bootstrap?.materializedCount}`);
  console.log(`LUMI_250_B_NPC_REFS=${manifestNpcCount}`);
  console.log(`LUMI_250_B_RELATIONSHIP_REFS=${manifestRelationshipCount}`);
  console.log(`LUMI_250_B_NPC_ROWS=${npcTargetIds.length}`);
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
    candidate.sourceFamily
      ? REAL_SOURCE_FAMILIES.has(candidate.sourceFamily)
      : false,
  );
  expect(
    candidates.length,
    "New Adventure must expose candidates",
  ).toBeGreaterThan(0);
  expect(
    realCandidates.length,
    "New Adventure must include at least one real NPC/world/opportunity source",
  ).toBeGreaterThan(0);

  const sourceFamilies = [
    ...new Set(
      candidates.flatMap((candidate) =>
        candidate.sourceFamily ? [candidate.sourceFamily] : [],
      ),
    ),
  ];
  console.log(`LUMI_250_C_CANDIDATE_COUNT=${candidates.length}`);
  console.log(`LUMI_250_C_REAL_SOURCE_COUNT=${realCandidates.length}`);
  console.log(`LUMI_250_C_SOURCE_FAMILIES=${sourceFamilies.join(",")}`);
});
