import { test, expect, type APIRequestContext } from "@playwright/test";

const TEST_PASSWORD = "e2e-test-password-123";

function createTestIdentity(label: string) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    email: `e2e-profiles-${normalized}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: TEST_PASSWORD,
  };
}

async function registerAndLogin(
  request: APIRequestContext,
  identity: { email: string; password: string },
) {
  const registerRes = await request.post("/api/auth/register", {
    data: {
      displayName: "E2E Parent",
      email: identity.email,
      password: identity.password,
      confirmPassword: identity.password,
    },
  });
  expect(registerRes.status()).toBe(201);

  const loginRes = await request.post("/api/auth/login", {
    data: {
      email: identity.email,
      password: identity.password,
      rememberMe: true,
    },
  });
  expect(loginRes.status()).toBe(200);
  return loginRes;
}

let householdCounter = 0;
function uniqueSlug(label: string): string {
  householdCounter++;
  return `e2e-${label}-${Date.now()}-${householdCounter}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
}

test.describe("Profile API authorization and contracts", () => {
  test("unauthenticated requests return 401 for all profile endpoints", async ({
    request,
  }) => {
    const postRes1 = await request.post("/api/households", {
      data: { name: "x", slug: "x" },
    });
    expect(postRes1.status()).toBe(401);
    expect((await postRes1.json()).error).toBe("UNAUTHORIZED");

    const postRes2 = await request.post("/api/child-profiles", {
      data: { householdId: "x", displayName: "x", ageBand: "6-8" },
    });
    expect(postRes2.status()).toBe(401);
    expect((await postRes2.json()).error).toBe("UNAUTHORIZED");

    const postRes3 = await request.post(
      `/api/child-profiles/archive/${crypto.randomUUID()}`,
      { data: { householdId: "x" } },
    );
    expect(postRes3.status()).toBe(401);
    expect((await postRes3.json()).error).toBe("UNAUTHORIZED");

    const getRes1 = await request.get("/api/onboarding");
    expect(getRes1.status()).toBe(401);
    expect((await getRes1.json()).error).toBe("UNAUTHORIZED");

    const getRes2 = await request.get("/api/parent-policy?householdId=x");
    expect(getRes2.status()).toBe(401);
    expect((await getRes2.json()).error).toBe("UNAUTHORIZED");
  });

  test("create household returns 400 for missing fields", async ({
    request,
  }) => {
    const identity = createTestIdentity("hh-missing");
    await registerAndLogin(request, identity);

    const res = await request.post("/api/households", { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("full flow: register -> create household -> create child profile -> list -> archive", async ({
    request,
  }) => {
    const identity = createTestIdentity("full-flow");
    await registerAndLogin(request, identity);

    const hhSlug = uniqueSlug("full");
    const hhRes = await request.post("/api/households", {
      data: { name: "Full Flow Family", slug: hhSlug },
    });
    expect(hhRes.status()).toBe(201);
    const hhBody = await hhRes.json();
    expect(hhBody.household.name).toBe("Full Flow Family");
    const householdId = hhBody.household.id;

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "Efe", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);
    const cpBody = await cpRes.json();
    expect(cpBody.profile.displayName).toBe("Efe");
    const profileId = cpBody.profile.id;

    const listRes = await request.get(
      `/api/child-profiles?householdId=${householdId}`,
    );
    expect(listRes.status()).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.profiles).toHaveLength(1);
    expect(listBody.profiles[0].id).toBe(profileId);

    const archiveRes = await request.post(
      `/api/child-profiles/archive/${profileId}`,
      {
        data: { householdId },
      },
    );
    expect(archiveRes.status()).toBe(200);
    expect((await archiveRes.json()).success).toBe(true);

    const listAfterArchive = await request.get(
      `/api/child-profiles?householdId=${householdId}`,
    );
    const listAfterBody = await listAfterArchive.json();
    expect(listAfterBody.profiles).toHaveLength(0);
  });

  test("create household duplicate returns 409", async ({ request }) => {
    const identity = createTestIdentity("dup-hh");
    await registerAndLogin(request, identity);

    const slug = uniqueSlug("dup");
    const firstRes = await request.post("/api/households", {
      data: { name: "First", slug },
    });
    expect(firstRes.status()).toBe(201);

    const res = await request.post("/api/households", {
      data: { name: "Second", slug },
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("HOUSEHOLD_EXISTS");
  });

  test("update child profile", async ({ request }) => {
    const identity = createTestIdentity("update-cp");
    await registerAndLogin(request, identity);

    const slug = uniqueSlug("update");
    const hhRes = await request.post("/api/households", {
      data: { name: "Update Family", slug },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const cpRes = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "Ali", ageBand: "6-8" },
    });
    expect(cpRes.status()).toBe(201);
    const profileId = (await cpRes.json()).profile.id;

    const updateRes = await request.patch(`/api/child-profiles/${profileId}`, {
      data: { householdId, displayName: "Ali Veli", ageBand: "9-12" },
    });
    expect(updateRes.status()).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.profile.displayName).toBe("Ali Veli");
    expect(updateBody.profile.ageBand).toBe("9-12");
  });

  test("cross-family access is rejected", async ({ request }) => {
    const identityA = createTestIdentity("cross-a");
    const identityB = createTestIdentity("cross-b");

    await registerAndLogin(request, identityA);
    const slugA = uniqueSlug("cross-a");
    const hhResA = await request.post("/api/households", {
      data: { name: "Family A", slug: slugA },
    });
    expect(hhResA.status()).toBe(201);
    const hhA = (await hhResA.json()).household;

    const cpResA = await request.post("/api/child-profiles", {
      data: { householdId: hhA.id, displayName: "A Child", ageBand: "6-8" },
    });
    expect(cpResA.status()).toBe(201);
    const profileA = (await cpResA.json()).profile;

    await request.post("/api/auth/logout");
    await registerAndLogin(request, identityB);
    const slugB = uniqueSlug("cross-b");
    const hhResB = await request.post("/api/households", {
      data: { name: "Family B", slug: slugB },
    });
    expect(hhResB.status()).toBe(201);
    const hhB = (await hhResB.json()).household;

    const cpResB = await request.post("/api/child-profiles", {
      data: { householdId: hhB.id, displayName: "B Child", ageBand: "6-8" },
    });
    expect(cpResB.status()).toBe(201);
    const profileB = (await cpResB.json()).profile;

    const ownArchiveRes = await request.post(
      `/api/child-profiles/archive/${profileB.id}`,
      {
        data: { householdId: hhB.id },
      },
    );
    expect(ownArchiveRes.status()).toBe(200);

    const listRes = await request.get(
      `/api/child-profiles?householdId=${hhA.id}`,
    );
    expect(listRes.status()).toBe(403);

    const createRes = await request.post("/api/child-profiles", {
      data: { householdId: hhA.id, displayName: "Hacker", ageBand: "6-8" },
    });
    expect(createRes.status()).toBe(403);

    const archiveRes = await request.post(
      `/api/child-profiles/archive/${profileA.id}`,
      {
        data: { householdId: hhA.id },
      },
    );
    expect(archiveRes.status()).toBe(403);

    const updateRes = await request.patch(
      `/api/child-profiles/${profileA.id}`,
      {
        data: { householdId: hhA.id, displayName: "Hacked", ageBand: "9-12" },
      },
    );
    expect(updateRes.status()).toBe(403);

    const policyRes = await request.get(
      `/api/parent-policy?householdId=${hhA.id}`,
    );
    expect([403, 404]).toContain(policyRes.status());
  });

  test("parent policy get and update", async ({ request }) => {
    const identity = createTestIdentity("policy");
    await registerAndLogin(request, identity);

    const slug = uniqueSlug("policy");
    const hhRes = await request.post("/api/households", {
      data: { name: "Policy Family", slug },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const getRes = await request.get(
      `/api/parent-policy?householdId=${householdId}`,
    );
    expect(getRes.status()).toBe(200);
    const policy = (await getRes.json()).policy;
    expect(policy.maxDailyStories).toBe(3);
    expect(policy.contentBoundary).toBe("strict");

    const updateRes = await request.put("/api/parent-policy", {
      data: {
        householdId,
        maxDailyStories: 10,
        contentBoundary: "moderate",
        timeLimitMinutes: 60,
        blockedTopics: ["fear", "loss"],
        customNotes: ["keep it gentle"],
      },
    });
    expect(updateRes.status()).toBe(200);
    const updated = (await updateRes.json()).policy;
    expect(updated.maxDailyStories).toBe(10);
    expect(updated.contentBoundary).toBe("moderate");
    expect(updated.timeLimitMinutes).toBe(60);
    expect(updated.blockedTopics).toEqual(["fear", "loss"]);
    expect(updated.customNotes).toEqual(["keep it gentle"]);

    const getAfterUpdate = await request.get(
      `/api/parent-policy?householdId=${householdId}`,
    );
    const afterPolicy = (await getAfterUpdate.json()).policy;
    expect(afterPolicy.blockedTopics).toEqual(["fear", "loss"]);
    expect(afterPolicy.customNotes).toEqual(["keep it gentle"]);

    const auditRes = await request.get(
      `/api/parent-policy/audit?householdId=${householdId}`,
    );
    expect(auditRes.status()).toBe(200);
    const { entries } = await auditRes.json();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const last = entries[entries.length - 1];
    expect(last.action).toBe("policy.update");
    expect(last.afterState.blockedTopics).toEqual(["fear", "loss"]);
  });

  test("child profile validation rejects invalid payloads", async ({
    request,
  }) => {
    const identity = createTestIdentity("cp-val");
    await registerAndLogin(request, identity);

    const slug = uniqueSlug("cpval");
    const hhRes = await request.post("/api/households", {
      data: { name: "Val Family", slug },
    });
    expect(hhRes.status()).toBe(201);
    const householdId = (await hhRes.json()).household.id;

    const res1 = await request.post("/api/child-profiles", { data: {} });
    expect(res1.status()).toBe(400);

    const res2 = await request.post("/api/child-profiles", {
      data: { householdId, displayName: "", ageBand: "6-8" },
    });
    expect(res2.status()).toBe(400);
  });

  test("onboarding state reflects household and profile count", async ({
    request,
  }) => {
    const identity = createTestIdentity("onboard-state");
    await registerAndLogin(request, identity);

    const onboardingEmpty = await request.get("/api/onboarding");
    expect(onboardingEmpty.status()).toBe(200);
    let state = (await onboardingEmpty.json()).onboarding;
    expect(state.hasHousehold).toBe(false);

    const slug = uniqueSlug("onstate");
    const householdRes = await request.post("/api/households", {
      data: { name: "Onboard State", slug },
    });
    expect(householdRes.status()).toBe(201);

    const onboardingAfterHH = await request.get("/api/onboarding");
    state = (await onboardingAfterHH.json()).onboarding;
    expect(state.hasHousehold).toBe(true);
    expect(state.childProfileCount).toBe(0);

    const childRes = await request.post("/api/child-profiles", {
      data: {
        householdId: state.householdId,
        displayName: "Zeynep",
        ageBand: "3-5",
      },
    });
    expect(childRes.status()).toBe(201);

    const onboardingAfterCP = await request.get("/api/onboarding");
    state = (await onboardingAfterCP.json()).onboarding;
    expect(state.childProfileCount).toBe(1);
  });
});

test.describe("Profile UI flows", () => {
  test("unauthenticated /app/profiles redirects to login", async ({ page }) => {
    await page.goto("/app/profiles");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});
