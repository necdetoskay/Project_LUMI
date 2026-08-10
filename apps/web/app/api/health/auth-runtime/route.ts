import { hash, verify } from "@node-rs/argon2";
import { NextResponse } from "next/server";

import { getAuthPool } from "@/lib/auth/database";

const REQUIRED_SESSION_COLUMNS = [
  "id",
  "parent_id",
  "refresh_token_hash",
  "expires_at",
  "session_family_id",
  "remember_me",
  "revoked_at",
  "replaced_by_session_id",
] as const;

export async function GET() {
  let argon2Ready = false;
  let sessionSchemaReady = false;
  let uuidFunctionReady = false;

  try {
    const probe = "lumi-runtime-diagnostic";
    const digest = await hash(probe, {
      algorithm: 2,
      memoryCost: 4096,
      outputLen: 16,
      parallelism: 1,
      timeCost: 1,
    });
    argon2Ready = await verify(digest, probe);
  } catch {
    argon2Ready = false;
  }

  try {
    const pool = getAuthPool();
    const columns = await pool.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'parent_sessions'
      `,
    );
    const available = new Set(columns.rows.map((row) => row.column_name));
    sessionSchemaReady = REQUIRED_SESSION_COLUMNS.every((column) =>
      available.has(column),
    );

    const uuidProbe = await pool.query<{ ok: boolean }>(
      "SELECT gen_random_uuid() IS NOT NULL AS ok",
    );
    uuidFunctionReady = uuidProbe.rows[0]?.ok === true;
  } catch {
    sessionSchemaReady = false;
    uuidFunctionReady = false;
  }

  const ok = argon2Ready && sessionSchemaReady && uuidFunctionReady;
  const code = !argon2Ready
    ? "ARGON2_RUNTIME_FAILED"
    : !sessionSchemaReady
      ? "SESSION_SCHEMA_INCOMPLETE"
      : !uuidFunctionReady
        ? "UUID_FUNCTION_UNAVAILABLE"
        : "AUTH_RUNTIME_READY";

  return NextResponse.json(
    {
      ok,
      argon2Ready,
      sessionSchemaReady,
      uuidFunctionReady,
      code,
    },
    { status: ok ? 200 : 503 },
  );
}
