/** @vitest-environment node */

import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";

import { closeAuthPool, getAuthPool } from "@/lib/auth/database";
import { authSchemaSql } from "@/lib/auth/schema";
import {
  getParentFromSessionToken,
  loginParent,
  refreshParentSession,
  registerParent,
  requestPasswordReset,
  resetParentPassword,
} from "@/lib/auth/service";

let databaseAvailable = false;

async function resetAuthTables() {
  await getAuthPool().query(`
    TRUNCATE TABLE
      parent_password_reset_tokens,
      parent_sessions,
      parent_accounts
    RESTART IDENTITY CASCADE
  `);
}

describe("auth PostgreSQL integration", () => {
  beforeAll(async () => {
    const allowDestructive =
      process.env.AUTH_TEST_ENABLE_DESTRUCTIVE === "true";

    if (!allowDestructive) {
      console.warn(
        "Skipping auth PostgreSQL integration tests: set AUTH_TEST_ENABLE_DESTRUCTIVE=true to enable (will TRUNCATE auth tables).",
      );
      return;
    }

    try {
      await getAuthPool().query(authSchemaSql);
      databaseAvailable = true;
    } catch (error) {
      console.warn(
        "Skipping auth PostgreSQL integration tests: database unavailable.",
      );
      console.warn(error);
    }
  });

  beforeEach(async () => {
    if (!databaseAvailable) {
      return;
    }

    await resetAuthTables();
  });

  afterAll(async () => {
    if (databaseAvailable) {
      await resetAuthTables();
    }

    await closeAuthPool();
  });

  it("registers a parent and persists an active session", async () => {
    if (!databaseAvailable) {
      return;
    }

    const result = await registerParent({
      confirmPassword: "very-secret-password",
      displayName: "Lumi Parent",
      email: "parent@example.com",
      password: "very-secret-password",
    });

    expect(result.parent.email).toBe("parent@example.com");
    expect(result.session.token.length).toBeGreaterThan(20);

    const databaseState = await getAuthPool().query<{
      parent_count: string;
      session_count: string;
    }>(`
      SELECT
        (SELECT COUNT(*)::text FROM parent_accounts) AS parent_count,
        (SELECT COUNT(*)::text FROM parent_sessions) AS session_count
    `);

    expect(databaseState.rows[0]).toEqual({
      parent_count: "1",
      session_count: "1",
    });

    await expect(
      getParentFromSessionToken(result.session.token),
    ).resolves.toEqual(result.parent);
  });

  it("creates a short session when remember-me is disabled", async () => {
    if (!databaseAvailable) {
      return;
    }

    await registerParent({
      confirmPassword: "very-secret-password",
      displayName: "Lumi Parent",
      email: "parent@example.com",
      password: "very-secret-password",
    });

    const loginResult = await loginParent({
      email: "parent@example.com",
      password: "very-secret-password",
      rememberMe: false,
    });

    const sessionState = await getAuthPool().query<{
      remember_me: boolean;
    }>(
      `
      SELECT remember_me
      FROM parent_sessions
      WHERE id = $1
    `,
      [loginResult.session.id],
    );

    expect(sessionState.rows[0]?.remember_me).toBe(false);
  });

  it("rotates refresh sessions and revokes the whole family on token reuse", async () => {
    if (!databaseAvailable) {
      return;
    }

    const registerResult = await registerParent({
      confirmPassword: "very-secret-password",
      displayName: "Lumi Parent",
      email: "parent@example.com",
      password: "very-secret-password",
    });

    const rotated = await refreshParentSession(registerResult.session.token);

    expect(rotated.parent.email).toBe("parent@example.com");
    expect(rotated.session.id).not.toBe(registerResult.session.id);

    await expect(
      refreshParentSession(registerResult.session.token),
    ).rejects.toThrow("REUSED_SESSION");

    await expect(
      getParentFromSessionToken(rotated.session.token),
    ).resolves.toBeNull();
  });

  it("resets the password, revokes old sessions and allows login with the new password", async () => {
    if (!databaseAvailable) {
      return;
    }

    const registerResult = await registerParent({
      confirmPassword: "very-secret-password",
      displayName: "Lumi Parent",
      email: "parent@example.com",
      password: "very-secret-password",
    });

    const resetRequest = await requestPasswordReset({
      email: "parent@example.com",
    });

    expect(resetRequest.previewToken).toBeTruthy();

    await resetParentPassword({
      confirmPassword: "brand-new-password",
      password: "brand-new-password",
      token: resetRequest.previewToken,
    });

    await expect(
      getParentFromSessionToken(registerResult.session.token),
    ).resolves.toBeNull();
    await expect(
      loginParent({
        email: "parent@example.com",
        password: "very-secret-password",
        rememberMe: true,
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    const loginResult = await loginParent({
      email: "parent@example.com",
      password: "brand-new-password",
      rememberMe: true,
    });

    expect(loginResult.parent.email).toBe("parent@example.com");
  });
});
