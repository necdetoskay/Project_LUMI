import { NextResponse } from "next/server";

import { isBackgroundLifeCronAuthorized } from "@/lib/background-life/cron-auth";
import { runProductionBackgroundLife } from "@/lib/background-life/worker";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, code: "DATABASE_URL_MISSING" },
      { status: 503 },
    );
  }

  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { ok: false, code: "BACKGROUND_LIFE_CRON_SECRET_MISSING" },
      { status: 503 },
    );
  }

  if (
    !isBackgroundLifeCronAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return NextResponse.json(
      { ok: false, code: "BACKGROUND_LIFE_UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const summary = await runProductionBackgroundLife();
    const ok = summary.failures === 0;
    return NextResponse.json(
      {
        ok,
        code: ok ? "BACKGROUND_LIFE_COMPLETED" : "BACKGROUND_LIFE_PARTIAL",
        summary,
      },
      { status: ok ? 200 : 207 },
    );
  } catch (error) {
    console.error("LUMI_BACKGROUND_LIFE_RUN_FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, code: "BACKGROUND_LIFE_FAILED" },
      { status: 500 },
    );
  }
}
