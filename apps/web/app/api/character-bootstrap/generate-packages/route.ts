import { NextResponse } from "next/server";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { generateAndPersistOriginPackages } from "@lumi/profiles/application";

export async function POST(request: Request) {
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
      const packages = await generateAndPersistOriginPackages(
        parent.id,
        parsed.householdId,
        parsed.childProfileId,
      );
      return NextResponse.json({ packages }, { status: 201 });
    } catch (error) {
      const err = error as Error & { code?: string };
      const message = err.message ?? "Unknown error";
      if (err.name === "AuthorizationError" || message.includes("not a member")) {
        return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
      }
      if (message.includes("PROFILE_ARCHIVED")) {
        return NextResponse.json(
          { error: "ARCHIVED_PROFILE", message },
          { status: 409 },
        );
      }
      if (
        message.includes("HANDOFF_ALREADY_CONSUMED") ||
        message.includes("CHARACTER_ALREADY_EXISTS")
      ) {
        return NextResponse.json(
          { error: "CONFLICT", message },
          { status: 409 },
        );
      }
      if (err.name === "ValidationError" || message.includes("ValidationError")) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "Failed to generate packages" },
        { status: 500 },
      );
    }
  });
}
