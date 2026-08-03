import { NextResponse } from "next/server";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  createChildProfile,
  listChildProfiles,
} from "@lumi/profiles/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
        { status: 400 },
      );
    }

    try {
      const profiles = await listChildProfiles(parent.id, householdId);
      return NextResponse.json({ profiles });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to list profiles" },
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
      typeof parsed.displayName !== "string" ||
      typeof parsed.ageBand !== "string"
    ) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId, displayName, and ageBand are required",
        },
        { status: 400 },
      );
    }

    try {
      const profile = await createChildProfile(parent.id, {
        householdId: parsed.householdId,
        displayName: parsed.displayName,
        ageBand: parsed.ageBand,
      });

      return NextResponse.json({ profile }, { status: 201 });
    } catch (error) {
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      if (message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      if (err.name === "ValidationError" || message.includes("validation") || message.includes("ValidationError")) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to create profile" },
        { status: 500 },
      );
    }
  });
});
