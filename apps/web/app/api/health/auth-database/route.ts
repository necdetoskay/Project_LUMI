import { NextResponse } from "next/server";

import { getAuthPool } from "@/lib/auth/database";

export const runtime = "nodejs";

export async function GET() {
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

  if (!databaseConfigured) {
    return NextResponse.json(
      {
        ok: false,
        databaseConfigured: false,
        databaseReachable: false,
        authSchemaReady: false,
        code: "DATABASE_URL_MISSING",
      },
      { status: 503 },
    );
  }

  try {
    const result = await getAuthPool().query<{
      parent_accounts: string | null;
      parent_sessions: string | null;
    }>(`
      SELECT
        to_regclass('public.parent_accounts')::text AS parent_accounts,
        to_regclass('public.parent_sessions')::text AS parent_sessions
    `);

    const row = result.rows[0];
    const authSchemaReady = Boolean(
      row?.parent_accounts && row?.parent_sessions,
    );

    return NextResponse.json(
      {
        ok: authSchemaReady,
        databaseConfigured: true,
        databaseReachable: true,
        authSchemaReady,
        code: authSchemaReady ? "AUTH_DATABASE_READY" : "AUTH_SCHEMA_MISSING",
      },
      { status: authSchemaReady ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        databaseConfigured: true,
        databaseReachable: false,
        authSchemaReady: false,
        code: "DATABASE_CONNECTION_FAILED",
      },
      { status: 503 },
    );
  }
}
