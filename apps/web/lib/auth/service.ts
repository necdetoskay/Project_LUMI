import { hash, verify } from "@node-rs/argon2";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

import { getAuthPool } from "@/lib/auth/database";
import {
  createPasswordResetToken,
  createSessionToken,
  getPasswordResetExpiry,
  getSessionExpiry,
  hashPasswordResetToken,
  hashSessionToken,
} from "@/lib/auth/tokens";

export type ParentAccount = {
  id: string;
  email: string;
  displayName: string;
};

type ParentAccountRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
};

type SessionQueryExecutor = Pick<Pool | PoolClient, "query">;

type CreatedSessionRow = {
  id: string;
  session_family_id: string;
  remember_me: boolean;
  expires_at: Date;
};

type ParentSession = {
  id: string;
  token: string;
  sessionFamilyId: string;
  rememberMe: boolean;
  expiresAt: Date;
};

type ParentSessionRecordRow = {
  session_id: string;
  parent_id: string;
  session_family_id: string;
  remember_me: boolean;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_session_id: string | null;
  parent_account_id: string;
  parent_email: string;
  parent_display_name: string;
};

type PasswordResetTokenRow = {
  display_name: string;
  email: string;
  expires_at: Date;
  parent_id: string;
  token_id: string;
  used_at: Date | null;
};

const rememberMeSchema = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

export const registerParentSchema = z
  .object({
    confirmPassword: z.string().min(10).max(128),
    displayName: z.string().trim().min(2).max(80),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(10).max(128),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

export const loginParentSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
  rememberMe: rememberMeSchema.default(false),
});

export const requestPasswordResetSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(10).max(128),
    password: z.string().min(10).max(128),
    token: z.string().min(20),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

function toParentAccount(row: ParentAccountRow): ParentAccount {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

function toParentAccountFromSession(row: ParentSessionRecordRow): ParentAccount {
  return {
    id: row.parent_account_id,
    email: row.parent_email,
    displayName: row.parent_display_name,
  };
}

async function createPasswordHash(password: string) {
  return hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    outputLen: 32,
    parallelism: 1,
    timeCost: 2,
  });
}

async function createSession(
  parentId: string,
  options: {
    executor?: SessionQueryExecutor;
    rememberMe?: boolean;
    sessionFamilyId?: string;
  } = {},
): Promise<ParentSession> {
  const executor = options.executor ?? getAuthPool();
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const rememberMe = options.rememberMe ?? false;
  const expiresAt = getSessionExpiry(rememberMe ? 30 : 1);

  const result = await executor.query<CreatedSessionRow>(
    `
      INSERT INTO parent_sessions (
        parent_id,
        refresh_token_hash,
        expires_at,
        session_family_id,
        remember_me
      )
      VALUES ($1, $2, $3, COALESCE($4, gen_random_uuid()), $5)
      RETURNING id, session_family_id, remember_me, expires_at
    `,
    [parentId, tokenHash, expiresAt, options.sessionFamilyId ?? null, rememberMe],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("SESSION_CREATE_FAILED");
  }

  return {
    id: row.id,
    token,
    sessionFamilyId: row.session_family_id,
    rememberMe: row.remember_me,
    expiresAt: row.expires_at,
  };
}

async function getSessionRecordByToken(
  token: string,
  executor: SessionQueryExecutor,
  forUpdate = false,
) {
  const lockingClause = forUpdate ? "FOR UPDATE" : "";
  const result = await executor.query<ParentSessionRecordRow>(
    `
      SELECT
        s.id AS session_id,
        s.parent_id,
        s.session_family_id,
        s.remember_me,
        s.expires_at,
        s.revoked_at,
        s.replaced_by_session_id,
        p.id AS parent_account_id,
        p.email AS parent_email,
        p.display_name AS parent_display_name
      FROM parent_sessions s
      INNER JOIN parent_accounts p ON p.id = s.parent_id
      WHERE s.refresh_token_hash = $1
      ${lockingClause}
    `,
    [hashSessionToken(token)],
  );

  return result.rows[0] ?? null;
}

async function revokeSessionFamily(
  executor: SessionQueryExecutor,
  sessionFamilyId: string,
  options: { excludeSessionId?: string } = {},
) {
  await executor.query(
    `
      UPDATE parent_sessions
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE session_family_id = $1
        AND ($2::uuid IS NULL OR id <> $2::uuid)
    `,
    [sessionFamilyId, options.excludeSessionId ?? null],
  );
}

function isSessionUsable(session: ParentSessionRecordRow) {
  return (
    session.revoked_at === null &&
    session.replaced_by_session_id === null &&
    session.expires_at.getTime() > Date.now()
  );
}

function isReuseCandidate(session: ParentSessionRecordRow) {
  return session.replaced_by_session_id !== null || session.revoked_at !== null;
}

export async function registerParent(input: unknown) {
  const parsed = registerParentSchema.parse(input);
  const passwordHash = await createPasswordHash(parsed.password);

  try {
    const result = await getAuthPool().query<ParentAccountRow>(
      `
        INSERT INTO parent_accounts (email, password_hash, display_name)
        VALUES ($1, $2, $3)
        RETURNING id, email, display_name, password_hash
      `,
      [parsed.email, passwordHash, parsed.displayName],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("REGISTER_FAILED");
    }

    const parent = toParentAccount(row);
    const session = await createSession(parent.id, { rememberMe: true });

    return { parent, session };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new Error("PARENT_EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function loginParent(input: unknown) {
  const parsed = loginParentSchema.parse(input);
  const result = await getAuthPool().query<ParentAccountRow>(
    `
      SELECT id, email, display_name, password_hash
      FROM parent_accounts
      WHERE email = $1
    `,
    [parsed.email],
  );

  const row = result.rows[0];

  if (!row || !(await verify(row.password_hash, parsed.password))) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const parent = toParentAccount(row);
  const session = await createSession(parent.id, {
    rememberMe: parsed.rememberMe,
  });

  return { parent, session };
}

export async function requestPasswordReset(input: unknown) {
  const parsed = requestPasswordResetSchema.parse(input);
  const result = await getAuthPool().query<ParentAccountRow>(
    `
      SELECT id, email, display_name, password_hash
      FROM parent_accounts
      WHERE email = $1
    `,
    [parsed.email],
  );

  const row = result.rows[0];

  if (!row) {
    return { email: parsed.email, previewToken: null as string | null };
  }

  const token = createPasswordResetToken();
  const expiresAt = getPasswordResetExpiry();

  await getAuthPool().query(
    `
      INSERT INTO parent_password_reset_tokens (parent_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [row.id, hashPasswordResetToken(token), expiresAt],
  );

  return {
    email: row.email,
    previewToken: process.env.NODE_ENV === "production" ? null : token,
  };
}

export async function resetParentPassword(input: unknown) {
  const parsed = resetPasswordSchema.parse(input);
  const pool = getAuthPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<PasswordResetTokenRow>(
      `
        SELECT
          t.id AS token_id,
          t.parent_id,
          t.expires_at,
          t.used_at,
          p.email,
          p.display_name
        FROM parent_password_reset_tokens t
        INNER JOIN parent_accounts p ON p.id = t.parent_id
        WHERE t.token_hash = $1
        FOR UPDATE
      `,
      [hashPasswordResetToken(parsed.token)],
    );

    const tokenRow = result.rows[0];

    if (
      !tokenRow ||
      tokenRow.used_at !== null ||
      tokenRow.expires_at.getTime() <= Date.now()
    ) {
      throw new Error("INVALID_RESET_TOKEN");
    }

    const passwordHash = await createPasswordHash(parsed.password);

    await client.query(
      `
        UPDATE parent_accounts
        SET password_hash = $2, updated_at = now()
        WHERE id = $1
      `,
      [tokenRow.parent_id, passwordHash],
    );

    await client.query(
      `
        UPDATE parent_password_reset_tokens
        SET used_at = now()
        WHERE id = $1
      `,
      [tokenRow.token_id],
    );

    await client.query(
      `
        UPDATE parent_sessions
        SET revoked_at = COALESCE(revoked_at, now())
        WHERE parent_id = $1
      `,
      [tokenRow.parent_id],
    );

    await client.query("COMMIT");

    return {
      parent: {
        displayName: tokenRow.display_name,
        email: tokenRow.email,
        id: tokenRow.parent_id,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message !== "REUSED_SESSION") {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function refreshParentSession(token: string | undefined) {
  if (!token) {
    throw new Error("INVALID_SESSION");
  }

  const pool = getAuthPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentSession = await getSessionRecordByToken(token, client, true);

    if (!currentSession) {
      throw new Error("INVALID_SESSION");
    }

    if (isReuseCandidate(currentSession) && !isSessionUsable(currentSession)) {
      await revokeSessionFamily(client, currentSession.session_family_id);
      await client.query("COMMIT");
      throw new Error("REUSED_SESSION");
    }

    if (!isSessionUsable(currentSession)) {
      throw new Error("INVALID_SESSION");
    }

    const session = await createSession(currentSession.parent_id, {
      executor: client,
      rememberMe: currentSession.remember_me,
      sessionFamilyId: currentSession.session_family_id,
    });

    await client.query(
      `
        UPDATE parent_sessions
        SET
          revoked_at = now(),
          replaced_by_session_id = $2,
          last_refreshed_at = now()
        WHERE id = $1
      `,
      [currentSession.session_id, session.id],
    );

    await client.query("COMMIT");

    return {
      parent: toParentAccountFromSession(currentSession),
      session,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message !== "REUSED_SESSION") {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getParentFromSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const session = await getSessionRecordByToken(token, getAuthPool());

  if (!session || !isSessionUsable(session)) {
    return null;
  }

  return toParentAccountFromSession(session);
}

export async function revokeParentSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await getAuthPool().query(
    `
      UPDATE parent_sessions
      SET revoked_at = now()
      WHERE refresh_token_hash = $1
        AND revoked_at IS NULL
    `,
    [hashSessionToken(token)],
  );
}
