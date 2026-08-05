import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { getPolicyAuditTrail } from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId query parameter is required",
        },
        { status: 400 },
      );
    }

    try {
      const entries = await getPolicyAuditTrail(householdId, parent.id);
      return NextResponse.json({ entries });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (
        message.includes("not a member") ||
        message.includes("UNAUTHORIZED")
      ) {
        return NextResponse.json(
          { error: "FORBIDDEN", message },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to fetch audit trail" },
        { status: 500 },
      );
    }
  });
});
