import { test, expect, type APIRequestContext } from "@playwright/test";

const TEST_PASSWORD = "e2e-test-password-123";

function createTestIdentity(label: string) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    email: `e2e-parent-${normalized}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: TEST_PASSWORD,
  };
}

async function registerParent(
  request: APIRequestContext,
  identity: { email: string; password: string },
  displayName = "E2E Parent",
) {
  const response = await request.post("/api/auth/register", {
    data: {
      displayName,
      email: identity.email,
      password: identity.password,
      confirmPassword: identity.password,
    },
  });

  expect(response.status()).toBe(201);
  return response;
}

test.describe("auth smoke", () => {
  test("register via API, get session cookie, then access /me", async ({ request }) => {
    const identity = createTestIdentity("register");
    const registerRes = await registerParent(request, identity);

    const registerBody = await registerRes.json();
    expect(registerBody.parent.email).toBe(identity.email);

    const meRes = await request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.parent.email).toBe(identity.email);
  });

  test("login via API, then access /me and logout", async ({ request }) => {
    const identity = createTestIdentity("login");
    await registerParent(request, identity);

    await request.post("/api/auth/logout");

    const loginRes = await request.post("/api/auth/login", {
      data: {
        email: identity.email,
        password: identity.password,
        rememberMe: true,
      },
    });

    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.parent.email).toBe(identity.email);

    const meRes = await request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);

    const logoutRes = await request.post("/api/auth/logout");
    expect(logoutRes.status()).toBe(200);

    const meAfterLogout = await request.get("/api/auth/me");
    expect(meAfterLogout.status()).toBe(401);
  });

  test("invalid credentials return consistent 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: {
        email: "wrong@example.com",
        password: "wrong-password-here",
      },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("INVALID_CREDENTIALS");
  });

  test("protected /app redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("/api/auth/me returns 401 for unauthenticated requests", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("forgot-password and reset-password flow via API", async ({ request }) => {
    const identity = createTestIdentity("reset");
    await registerParent(request, identity);

    await request.post("/api/auth/logout");

    const forgotRes = await request.post("/api/auth/forgot-password", {
      data: { email: identity.email },
    });

    expect(forgotRes.status()).toBe(200);
    const forgotBody = await forgotRes.json();
    expect(forgotBody.previewToken).toBeTruthy();

    const resetRes = await request.post("/api/auth/reset-password", {
      data: {
        token: forgotBody.previewToken,
        password: "updated-password-456",
        confirmPassword: "updated-password-456",
      },
    });

    expect(resetRes.status()).toBe(200);

    const loginWithOldRes = await request.post("/api/auth/login", {
      data: { email: identity.email, password: identity.password },
    });
    expect(loginWithOldRes.status()).toBe(401);

    const loginWithNewRes = await request.post("/api/auth/login", {
      data: { email: identity.email, password: "updated-password-456", rememberMe: true },
    });
    expect(loginWithNewRes.status()).toBe(200);
    const loginBody = await loginWithNewRes.json();
    expect(loginBody.parent.email).toBe(identity.email);
  });
});