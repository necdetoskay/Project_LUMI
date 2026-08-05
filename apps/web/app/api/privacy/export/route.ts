import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  exportChildData,
  listExportsForChild,
} from "@lumi/privacy/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    const childProfileId = searchParams.get("childProfileId");

    if (!householdId || !childProfileId) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message:
            "householdId and childProfileId query parameters are required",
        },
        { status: 400 },
      );
    }

    try {
      const exports = await listExportsForChild(
        parent.id,
        householdId,
        childProfileId,
      );
      return NextResponse.json({ exports });
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
        { error: "INTERNAL_ERROR", message: "Failed to list exports" },
        { status: 500 },
      );
    }
  });
});

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
      const exportRecord = await exportChildData(
        parent.id,
        parsed.householdId,
        parsed.childProfileId,
      );
      return NextResponse.json({ export: exportRecord }, { status: 201 });
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
        { error: "INTERNAL_ERROR", message: "Failed to export child data" },
        { status: 500 },
      );
    }
  });
});
