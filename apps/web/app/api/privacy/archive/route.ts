import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { archiveChildData } from "@lumi/privacy/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const POST = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const body = await readRequestBody(request);
    const parsed = body as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.childProfileId !== "string"
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId and childProfileId are required",
        },
        { status: 400 },
      );
    }

    try {
      const result = await archiveChildData(
        parent.id,
        parsed.householdId,
        parsed.childProfileId,
      );
      return NextResponse.json({ archived: result }, { status: 200 });
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
      if (message.includes("NOT_FOUND")) {
        return NextResponse.json(
          { error: "NOT_FOUND", message },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to archive child data" },
        { status: 500 },
      );
    }
  });
});
